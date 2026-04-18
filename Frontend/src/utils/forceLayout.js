import * as d3 from "d3-force";

/**
 * Applies a d3-force layout to a set of nodes and edges.
 * @param {Array} nodes React Flow nodes
 * @param {Array} edges React Flow edges
 * @param {number} width Container width
 * @param {number} height Container height
 * @returns {Array} Positioned nodes
 */
export function applyForceLayout(nodes, edges, width = 800, height = 600) {
  if (!nodes || nodes.length === 0) return [];

  // Create clones for d3-force to mutate
  const simulationNodes = nodes.map(n => ({ 
    ...n, 
    x: n.position?.x || width / 2, 
    y: n.position?.y || height / 2 
  }));

  const simulationEdges = edges.map(e => ({ 
    source: e.source, 
    target: e.target 
  }));

  const simulation = d3.forceSimulation(simulationNodes)
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(60))
    .force("link", d3.forceLink(simulationEdges).id(d => d.id).distance(150))
    .stop();

  // Run simulation for 200 ticks to settle
  for (let i = 0; i < 200; i++) simulation.tick();

  // Map results back to React Flow format
  return simulationNodes.map(n => ({
    ...n,
    position: { x: n.x, y: n.y }
  }));
}
