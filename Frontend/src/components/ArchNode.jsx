import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';

/**
 * ArchNode — Obsidian-style high-contrast node
 *
 * Border colors (exact spec):
 *   ENTRY      → #8B5CF6  glow: rgba(139,92,246,0.6)
 *   HIGH_IMPACT → #3B82F6  glow: rgba(59,130,246,0.5)
 *   NORMAL     → #374151  glow: rgba(99,102,241,0.25) [subtle]
 */
const ArchNode = ({ data, selected }) => {
    const [hovered, setHovered] = useState(false);

    const isEntry   = data.isEntry  || false;
    const impact    = data.impact   || 0;
    const isHigh    = impact >= 8 && !isEntry;
    const isLow     = impact <= 2 && !isEntry && !isHigh;

    // ── Palette ───────────────────────────────────────────────────
    let borderColor, glowColor, accentColor, badgeBg, badgeText;

    if (isEntry) {
        borderColor = '#8B5CF6';
        glowColor   = selected || hovered
            ? 'rgba(139,92,246,0.75)'
            : 'rgba(139,92,246,0.60)';
        accentColor = '#c4b5fd';
        badgeBg     = 'rgba(139,92,246,0.18)';
        badgeText   = '#c4b5fd';
    } else if (isHigh) {
        borderColor = '#3B82F6';
        glowColor   = selected || hovered
            ? 'rgba(59,130,246,0.65)'
            : 'rgba(59,130,246,0.50)';
        accentColor = '#93c5fd';
        badgeBg     = 'rgba(59,130,246,0.14)';
        badgeText   = '#93c5fd';
    } else {
        borderColor = selected ? '#6366f1' : (hovered ? '#4f46e5' : '#374151');
        glowColor   = selected ? 'rgba(99,102,241,0.45)' : 'rgba(99,102,241,0.25)';
        accentColor = '#9ca3af';
        badgeBg     = 'rgba(55,65,81,0.5)';
        badgeText   = '#6b7280';
    }

    // ── Scale ─────────────────────────────────────────────────────
    const scale = isEntry ? (selected ? 1.3 : 1.2)
                          : (selected ? 1.1 : (hovered ? 1.05 : 1.0));

    // ── Label ─────────────────────────────────────────────────────
    const raw   = data.label || (data.id || '').split('/').pop() || '';
    const label = raw.length > 20 ? raw.slice(0, 18) + '…' : raw;
    const badge = isEntry ? 'ENTRY' : (data.role || raw.split('.').pop()?.toUpperCase() || 'FILE');

    // ── Opacity (low importance nodes slightly dim) ───────────────
    const opacity = isLow ? 0.70 : 1;

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={raw}                    /* native tooltip for full name */
            style={{
                width: '200px',
                background: '#111827',
                borderRadius: '12px',
                border: `${isEntry ? '2px' : '1.5px'} solid ${borderColor}`,
                padding: '10px 14px',
                color: '#E5E7EB',
                fontWeight: 500,
                boxSizing: 'border-box',
                boxShadow: `0 0 ${isEntry ? 18 : isHigh ? 14 : 10}px ${glowColor}, 0 4px 16px rgba(0,0,0,0.55)`,
                transform: `scale(${scale})`,
                transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                cursor: 'pointer',
                opacity,
            }}
        >
            <Handle type="target" position={Position.Top}    style={{ opacity: 0, pointerEvents: 'none' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Icon */}
                <div style={{
                    width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                    background: isEntry ? 'rgba(139,92,246,0.15)'
                              : isHigh  ? 'rgba(59,130,246,0.12)'
                              : 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="1" width="9" height="12" rx="1.5" stroke={accentColor} strokeWidth="1.4" />
                        <path d="M5 5h5M5 8h3" stroke={accentColor} strokeWidth="1.2" strokeLinecap="round" />
                        <path d="M11 8l3 3-3 3" stroke={accentColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: '12px', fontWeight: 700, color: '#E5E7EB',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        letterSpacing: '0.01em', lineHeight: 1.3,
                    }}>
                        {label}
                    </div>
                    <div style={{
                        display: 'inline-block', marginTop: '3px',
                        fontSize: '9px', fontWeight: 800, letterSpacing: '0.09em',
                        color: badgeText, background: badgeBg,
                        padding: '1px 6px', borderRadius: '4px',
                    }}>
                        {badge}
                    </div>
                </div>

                {/* Impact score badge */}
                {impact > 5 && (
                    <div style={{
                        fontSize: '10px', fontWeight: 800, color: accentColor,
                        background: 'rgba(0,0,0,0.35)', borderRadius: '6px',
                        padding: '2px 6px', flexShrink: 0, letterSpacing: '-0.02em',
                    }}>
                        ×{impact}
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
        </div>
    );
};

export default memo(ArchNode);
