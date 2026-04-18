import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation, Link } from 'react-router-dom'
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    useReactFlow,
    MarkerType,
    Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
    ArrowLeft, Sparkles, X, Box, Activity, Cpu, GitBranch,
    ChevronRight, Layers, AlertTriangle
} from 'lucide-react'
import { analyzeRepository } from './services/api'
import ArchNode from './components/ArchNode'
import { applyDagreLayout } from './utils/dagreLayout'

// ── Node type registry ──────────────────────────────────────────────────────
const nodeTypes = { arch: ArchNode };

// ── Edge defaults (Obsidian spec) ───────────────────────────────────────────
const EDGE_DEFAULT = {
    stroke: '#818CF8',
    strokeWidth: 1.8,
    opacity: 0.35,
};

const EDGE_ACTIVE = {
    stroke: '#6366F1',
    strokeWidth: 2.8,
    opacity: 0.95,
};

const EDGE_DIM = {
    stroke: '#818CF8',
    strokeWidth: 1.2,
    opacity: 0.05,
};

const EDGE_MARKER_DEFAULT = {
    type: MarkerType.ArrowClosed,
    width: 12,
    height: 12,
    color: '#818CF8',
};

const EDGE_MARKER_ACTIVE = {
    type: MarkerType.ArrowClosed,
    width: 14,
    height: 14,
    color: '#6366F1',
};

// Keep legacy alias so callers don't break
const EDGE_STYLE  = EDGE_DEFAULT;
const EDGE_MARKER = EDGE_MARKER_DEFAULT;

// ── Helper: classify role from file path ─────────────────────────────────────
function classifyRole(id = '') {
    const p = id.toLowerCase();
    if (p.includes('component') || p.includes('page') || p.includes('view')) return 'UI';
    if (p.includes('route') || p.includes('controller') || p.includes('api') || p.includes('handler')) return 'API';
    if (p.includes('service') || p.includes('util') || p.includes('lib') || p.includes('core')) return 'CORE';
    if (p.includes('config') || p.includes('env') || p.includes('.json')) return 'CONFIG';
    return 'MODULE';
}

// ── Helper: impact badge label ───────────────────────────────────────────────
function impactLabel(impact = 0) {
    if (impact >= 15) return { text: 'CRITICAL', color: '#f87171' };
    if (impact >= 7)  return { text: 'MODERATE', color: '#fb923c' };
    return                   { text: 'UTILITY',  color: '#60a5fa' };
}

// ════════════════════════════════════════════════════════════════════════════
export default function AnalysisPage() {
    console.log('DEBUG: AnalysisPage mounted');
    const location = useLocation();
    const repoUrl  = location.state?.repoUrl || '';

    const { fitView } = useReactFlow();  // safe — component is inside ReactFlowProvider

    // ── State ────────────────────────────────────────────────────────────────
    const [rawEdges,     setRawEdges]     = useState([]);
    const [nodes,        setNodes,  onNodesChange] = useNodesState([]);
    const [edges,        setEdges,  onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [status,       setStatus]       = useState('INGESTING');
    const [showOverlay,  setShowOverlay]  = useState(true);
    const [errorMsg,     setErrorMsg]     = useState('');

    // ── Build ReactFlow nodes/edges from backend result ──────────────────────
    const syncGraphData = useCallback((result) => {
        console.log('DEBUG: syncGraphData received:', result);

        const rawNodes = result?.graph?.nodes;
        const rawEdgesData = result?.graph?.edges;
        const entryId  = result?.metadata?.entryNodeId;

        if (!rawNodes || rawNodes.length === 0) {
            console.error('DEBUG: no nodes in result');
            setStatus('ERROR');
            setErrorMsg('Backend returned no nodes. Check the repository URL.');
            return;
        }

        // ── 1. Build RF nodes (un-positioned) ────────────────────────────────
        const rfNodes = rawNodes
            .filter(n => n && n.id)
            .map(n => ({
                id:   String(n.id),
                type: 'arch',
                data: {
                    ...n,
                    label:   n.label || n.id.split('/').pop(),
                    isEntry: n.id === entryId || n.id === '**root**',
                    role:    classifyRole(n.id),
                },
                position: { x: 0, y: 0 }, // Dagre will fill this in
            }));

        // ── 2. Build RF edges (filtered to valid node IDs) ────────────────────
        const idSet = new Set(rfNodes.map(n => n.id));
        const rfEdges = (rawEdgesData || [])
            .filter(e => e.source && e.target
                && idSet.has(String(e.source))
                && idSet.has(String(e.target))
                && String(e.source) !== String(e.target))
            .map((e, i) => ({
                id:        `e-${i}-${e.source}-${e.target}`,
                source:    String(e.source),
                target:    String(e.target),
                type:      'smoothstep',
                animated:  false,
                style:     { ...EDGE_DEFAULT },
                markerEnd: { ...EDGE_MARKER_DEFAULT },
            }));

        // ── 3. Deduplicate edges ──────────────────────────────────────────────
        const seen = new Set();
        const dedupedEdges = rfEdges.filter(e => {
            const key = `${e.source}→${e.target}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // ── 4. Apply Dagre layout ─────────────────────────────────────────────
        let positioned;
        try {
            positioned = applyDagreLayout(rfNodes, dedupedEdges);
            console.log('DEBUG: Dagre layout complete —', positioned.length, 'nodes,', dedupedEdges.length, 'edges');
        } catch (err) {
            console.error('DEBUG: Dagre layout failed:', err);
            // Fallback: just use unpositioned nodes so SOMETHING renders
            positioned = rfNodes;
        }

        setRawEdges(dedupedEdges);
        setNodes(positioned);
        setEdges(dedupedEdges);

        // ── Reveal sequence ───────────────────────────────────────────────────
        // fitView is triggered by the useEffect below (runs when nodes.length > 0)
        const safetyTimer = setTimeout(() => {
            setStatus('READY');
            setShowOverlay(false);
        }, 4000);

        setTimeout(() => {
            clearTimeout(safetyTimer);
            setStatus('READY');
            setTimeout(() => setShowOverlay(false), 600);
        }, 800);

    }, [setNodes, setEdges]);   // fitView NOT needed here — handled by separate useEffect

    // ── Trigger analysis on mount ─────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                setStatus('INGESTING');
                console.log('DEBUG: Analyzing:', repoUrl);
                const result = await analyzeRepository(repoUrl);
                setStatus('MAPPING');
                syncGraphData(result);
            } catch (err) {
                console.error('DEBUG: Analysis failed:', err);
                setStatus('ERROR');
                setErrorMsg(err?.message || 'Unknown error from backend.');
                setShowOverlay(false);
            }
        })();
    }, [repoUrl, syncGraphData]);

    // ── Auto-fitView: fires 100ms after nodes arrive AND overlay is gone ─────────
    useEffect(() => {
        console.log('DEBUG: fitView:', fitView, 'nodes:', nodes.length, 'overlay:', showOverlay);
        if (!fitView) return;              // guard: provider not ready
        if (nodes.length === 0) return;    // no nodes yet
        if (showOverlay) return;           // wait until overlay is gone

        const timer = setTimeout(() => {
            fitView({ padding: 0.18, duration: 700 });
        }, 100);
        return () => clearTimeout(timer);
    }, [nodes, showOverlay, fitView]);

    useEffect(() => {
        if (!selectedNode) {
            // Reset all nodes + edges to default
            setNodes(prev => prev.map(n => ({ ...n, style: { opacity: 1 } })));
            setEdges(prev => prev.map(e => ({
                ...e,
                style:     { ...EDGE_DEFAULT },
                markerEnd: { ...EDGE_MARKER_DEFAULT },
            })));
            return;
        }

        // Direct neighbors of selected
        const neighborIds = new Set(
            rawEdges
                .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                .flatMap(e => [e.source, e.target])
        );
        neighborIds.add(selectedNode.id);

        // Nodes: selected = 1.0, neighbors = 1.0, others = 0.1
        setNodes(prev => prev.map(n => ({
            ...n,
            style: {
                opacity: n.id === selectedNode.id ? 1
                       : neighborIds.has(n.id)     ? 1
                       : 0.1,
            },
        })));

        // Edges: connected = active style, others = dim
        setEdges(prev => prev.map(e => {
            const isConnected = e.source === selectedNode.id || e.target === selectedNode.id;
            return {
                ...e,
                style:     isConnected ? { ...EDGE_ACTIVE }  : { ...EDGE_DIM },
                markerEnd: isConnected ? { ...EDGE_MARKER_ACTIVE } : { ...EDGE_MARKER_DEFAULT, color: 'rgba(130,140,248,0.08)' },
            };
        }));
    }, [selectedNode, rawEdges, setNodes, setEdges]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const onNodeClick  = useCallback((_, n) => setSelectedNode(n.data), []);
    const onPaneClick  = useCallback(() => setSelectedNode(null), []);

    // ── Sidebar data ──────────────────────────────────────────────────────────
    const sidebarImpact = useMemo(() => selectedNode ? impactLabel(selectedNode.impact) : null, [selectedNode]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#070711', color: 'white', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden', position: 'relative' }}>

            {/* ── Cinematic Overlay ── */}
            {showOverlay && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 100,
                    backgroundColor: '#070711',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'opacity 0.6s',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 28px',
                            border: '2px solid rgba(139,92,246,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            animation: 'spin 2.5s linear infinite',
                        }}>
                            <Cpu style={{ width: '26px', height: '26px', color: '#8b5cf6' }} />
                        </div>
                        <h3 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 6px', textTransform: 'uppercase' }}>
                            {status === 'INGESTING' ? 'Ingesting Repository' : 'Building Graph'}
                        </h3>
                        <p style={{ fontSize: '10px', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase' }}>
                            Dagre Layout Engine
                        </p>
                    </div>
                </div>
            )}

            {/* ── Error Screen ── */}
            {status === 'ERROR' && !showOverlay && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 90,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px',
                }}>
                    <AlertTriangle style={{ width: '48px', height: '48px', color: '#f87171' }} />
                    <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Analysis Failed</h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '400px', textAlign: 'center', fontSize: '14px' }}>{errorMsg}</p>
                    <Link to="/" style={{ padding: '10px 24px', background: '#6366f1', color: 'white', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                        ← Go Back
                    </Link>
                </div>
            )}

            {/* ── Graph Pane (full width → 70% when sidebar open) ── */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
                width: selectedNode ? '70%' : '100%',
                maxWidth: selectedNode ? '70%' : '100%',
            }}>
                {/* Header */}
                <header style={{
                    padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)', zIndex: 20,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <Link to="/" style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 800,
                            textTransform: 'uppercase', letterSpacing: '0.12em', textDecoration: 'none',
                            transition: 'color 0.2s',
                        }}>
                            <ArrowLeft style={{ width: '14px', height: '14px' }} /> Exit
                        </Link>
                        <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.08)' }} />
                        <h2 style={{ fontSize: '13px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <Sparkles style={{ width: '14px', height: '14px', color: '#8b5cf6' }} />
                            Architecture <span style={{ color: '#8b5cf6' }}>Explorer</span>
                        </h2>
                    </div>

                    {/* Stats */}
                    {status === 'READY' && (
                        <div style={{ display: 'flex', gap: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Layers style={{ width: '12px', height: '12px' }} /> {nodes.length} nodes
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <GitBranch style={{ width: '12px', height: '12px' }} /> {edges.length} edges
                            </span>
                        </div>
                    )}
                </header>

                {/* ReactFlow */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        minZoom={0.15}
                        maxZoom={2}
                        style={{
                            background: 'radial-gradient(circle at center, #0B0F1A 0%, #05070D 100%)'
                        }}
                    >
                        <Background
                            color="rgba(99,102,241,0.06)"
                            gap={32}
                            size={1.2}
                        />
                        <Controls
                            style={{
                                background: 'rgba(0,0,0,0.8)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px',
                            }}
                        />
                        <MiniMap
                            nodeColor={(n) => {
                                if (n.data?.isEntry)   return '#8b5cf6';
                                if ((n.data?.impact || 0) >= 8) return '#3b82f6';
                                return '#374151';
                            }}
                            style={{
                                background: 'rgba(0,0,0,0.7)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px',
                            }}
                            maskColor="rgba(0,0,0,0.4)"
                        />
                        {/* Node count badge */}
                        {status === 'READY' && nodes.length === 0 && (
                            <Panel position="top-center">
                                <div style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: '10px', padding: '10px 20px', color: '#fca5a5', fontSize: '13px', fontWeight: 700 }}>
                                    No graph data received from backend
                                </div>
                            </Panel>
                        )}
                    </ReactFlow>
                </div>
            </div>

            {/* ── Sidebar ── */}
            {selectedNode && (
                <div style={{
                    width: '30%', height: '100%',
                    background: '#06060f',
                    borderLeft: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', flexDirection: 'column',
                    animation: 'slideIn 0.45s cubic-bezier(0.16,1,0.3,1) forwards',
                    boxShadow: '-20px 0 50px rgba(0,0,0,0.5)',
                    zIndex: 30, overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                display: 'inline-block', padding: '3px 10px', borderRadius: '6px',
                                background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
                                fontSize: '9px', fontWeight: 900, letterSpacing: '0.1em',
                                color: '#c4b5fd', textTransform: 'uppercase', marginBottom: '10px',
                            }}>
                                {selectedNode.role || 'MODULE'}
                            </div>
                            <h1 style={{ fontSize: '18px', fontWeight: 900, margin: 0, wordBreak: 'break-all', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                                {selectedNode.label === 'SYSTEM' ? 'Virtual Root' : (selectedNode.label || selectedNode.id)}
                            </h1>
                        </div>
                        <button
                            onClick={() => setSelectedNode(null)}
                            style={{ padding: '8px', background: 'transparent', border: '1px solid transparent', borderRadius: '10px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', flexShrink: 0, marginLeft: '12px', transition: 'all 0.2s' }}
                        >
                            <X style={{ width: '18px', height: '18px' }} />
                        </button>
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

                        {/* Impact card */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '18px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Impact Level</span>
                                {sidebarImpact && (
                                    <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', color: sidebarImpact.color, textTransform: 'uppercase' }}>
                                        {sidebarImpact.text}
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {selectedNode.id}
                            </div>
                        </div>

                        {/* Stats row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                            {[
                                { label: 'Outbound', value: (selectedNode.dependencies || []).length, icon: <ChevronRight style={{ width: '13px', height: '13px' }} /> },
                                { label: 'Inbound',  value: (selectedNode.dependents   || []).length, icon: <Activity style={{ width: '13px', height: '13px' }} /> },
                            ].map(({ label, value, icon }) => (
                                <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                                        {icon} {label}
                                    </div>
                                    <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.04em' }}>{value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Dependencies list */}
                        {(selectedNode.dependencies || []).length > 0 && (
                            <div>
                                <h4 style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <Box style={{ width: '12px', height: '12px' }} /> Imports
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {(selectedNode.dependencies || []).slice(0, 8).map(dep => (
                                        <div key={dep} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                                            {dep.split('/').pop()}
                                        </div>
                                    ))}
                                    {(selectedNode.dependencies || []).length > 8 && (
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', padding: '4px 10px' }}>
                                            +{selectedNode.dependencies.length - 8} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
