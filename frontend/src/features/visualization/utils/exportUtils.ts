// Utility functions for exporting visualizations

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'json';
  quality?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  filename?: string;
  graphData?: any; // Graph data for vector SVG export
  layoutType?: string; // Layout type: tree, force, circular, grid, etc.
}

export interface ShareableState {
  graphType: string;
  layoutType: string;
  viewSettings: Record<string, any>;
  selectedNode?: any;
  timestamp: number;
  version: string;
}

// Node type colors for SVG export
const NODE_COLORS: Record<string, string> = {
  module: '#1976d2',
  class: '#388e3c',
  function: '#f57c00',
  variable: '#7b1fa2',
  default: '#666666'
};

// Node shapes for SVG export
const NODE_SHAPES: Record<string, string> = {
  module: 'rect',
  class: 'ellipse',
  function: 'polygon', // diamond
  variable: 'rect',
  default: 'ellipse'
};

// Layout type labels for display
const LAYOUT_LABELS: Record<string, string> = {
  dagre: 'Hierarchical Tree',
  breadthfirst: 'Breadth-First Tree',
  circle: 'Circular',
  concentric: 'Concentric',
  grid: 'Grid',
  cose: 'Force-Directed (CoSE)',
  force: 'Force-Directed',
  random: 'Random',
  preset: 'Custom'
};

/**
 * Generate a proper vector SVG from graph data
 */
const generateVectorSVG = (
  graphData: any,
  options: Partial<ExportOptions>
): string => {
  // Extract nodes and edges from various formats
  let nodes: any[] = [];
  let edges: any[] = [];
  
  if (graphData?.cytoscape) {
    nodes = graphData.cytoscape.filter((el: any) => !el.data.source);
    edges = graphData.cytoscape.filter((el: any) => el.data.source);
  } else if (graphData?.forceGraph) {
    nodes = graphData.forceGraph.nodes || [];
    edges = graphData.forceGraph.links || [];
  } else if (Array.isArray(graphData)) {
    nodes = graphData.filter((el: any) => !el.data?.source);
    edges = graphData.filter((el: any) => el.data?.source);
  }
  
  if (nodes.length === 0) {
    throw new Error('No graph data available for SVG export');
  }

  // Calculate optimal dimensions based on node count
  const nodeCount = nodes.length;
  const layoutType = options.layoutType || 'dagre';
  
  // Dynamic sizing based on node count and layout type - larger dimensions for readable labels
  // Each node needs approximately 250x200 pixels of space for proper label display
  const nodesPerRow = Math.ceil(Math.sqrt(nodeCount));
  const baseDimension = Math.max(1600, nodesPerRow * 250);
  const width = options.width || (layoutType === 'circle' || layoutType === 'concentric' 
    ? Math.max(baseDimension, 2400) 
    : Math.max(baseDimension * 1.4, 2400));
  const height = options.height || (layoutType === 'circle' || layoutType === 'concentric'
    ? Math.max(baseDimension, 2400)
    : Math.max(baseDimension, 1800));
  
  const bgColor = options.backgroundColor || '#ffffff';
  
  // Calculate layout positions based on selected layout type
  const nodePositions = calculateLayoutPositions(nodes, edges, width, height, layoutType);
  
  // Build SVG elements
  const svgElements: string[] = [];
  
  // Add title and metadata
  const layoutLabel = LAYOUT_LABELS[layoutType] || layoutType;
  svgElements.push(`
    <text x="20" y="30" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#333333">
      Layout: ${escapeXml(layoutLabel)} | Nodes: ${nodeCount} | Edges: ${edges.length}
    </text>`);
  
  // Add legend
  svgElements.push(generateLegend(width));
  
  // Add edges first (so they render behind nodes)
  edges.forEach((edge: any) => {
    const sourceId = edge.data?.source || edge.source;
    const targetId = edge.data?.target || edge.target;
    const sourcePos = nodePositions.get(sourceId);
    const targetPos = nodePositions.get(targetId);
    
    if (sourcePos && targetPos) {
      const edgeType = edge.data?.relationship_type || edge.type || 'default';
      const edgeColor = getEdgeColor(edgeType);
      const dashArray = edgeType === 'contains' ? '5,5' : 'none';
      
      // Draw curved edge for circular layouts, straight for others
      if (layoutType === 'circle' || layoutType === 'concentric') {
        svgElements.push(generateCurvedEdge(sourcePos, targetPos, edgeColor, dashArray));
      } else {
        svgElements.push(`
    <line x1="${sourcePos.x}" y1="${sourcePos.y}" x2="${targetPos.x}" y2="${targetPos.y}" 
          stroke="${edgeColor}" stroke-width="1.5" stroke-dasharray="${dashArray}" opacity="0.5"/>
    <polygon points="${getArrowPoints(sourcePos, targetPos)}" fill="${edgeColor}" opacity="0.7"/>`);
      }
    }
  });
  
  // Calculate dynamic node size based on total nodes - ensure minimum readable size
  const nodeSizeScale = Math.max(0.7, Math.min(1.2, 80 / nodeCount));
  
  // Add nodes
  nodes.forEach((node: any) => {
    const nodeData = node.data || node;
    const id = nodeData.id;
    const label = nodeData.label || nodeData.name || id;
    const type = nodeData.type || 'default';
    const pos = nodePositions.get(id);
    
    if (pos) {
      const color = NODE_COLORS[type] || NODE_COLORS.default;
      const shape = NODE_SHAPES[type] || NODE_SHAPES.default;
      
      // Larger base sizes for better readability
      const baseWidth = type === 'module' ? 160 : 120;
      const baseHeight = type === 'module' ? 55 : 80;
      const nodeWidth = baseWidth * nodeSizeScale;
      const nodeHeight = baseHeight * nodeSizeScale;
      
      // Draw node shape
      svgElements.push(getNodeShape(shape, pos.x, pos.y, nodeWidth, nodeHeight, color, type));
      
      // Smart label handling - use multi-line for long labels
      const fontSize = Math.max(10, Math.min(14, 12 * nodeSizeScale));
      const charsPerLine = Math.floor(nodeWidth / (fontSize * 0.6));
      const labelLines = wrapLabel(label, charsPerLine);
      
      // Render multi-line label
      const lineHeight = fontSize * 1.2;
      const startY = pos.y - ((labelLines.length - 1) * lineHeight) / 2;
      
      labelLines.forEach((line, lineIndex) => {
        svgElements.push(`
    <text x="${pos.x}" y="${startY + lineIndex * lineHeight}" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff">
      ${escapeXml(line)}
    </text>`);
      });
    }
  });
  
  // Create the complete SVG
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .node-shadow { filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.3)); }
    </style>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#666"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <g class="graph-content">
    ${svgElements.join('\n')}
  </g>
</svg>`;
};

/**
 * Generate legend for the SVG
 */
const generateLegend = (width: number): string => {
  const legendX = width - 200;
  const legendY = 20;
  
  return `
    <g class="legend" transform="translate(${legendX}, ${legendY})">
      <rect x="0" y="0" width="180" height="130" fill="#f5f5f5" stroke="#ddd" rx="5"/>
      <text x="10" y="20" font-family="Arial" font-size="12" font-weight="bold" fill="#333">Legend</text>
      
      <rect x="10" y="30" width="20" height="14" rx="3" fill="${NODE_COLORS.module}"/>
      <text x="35" y="42" font-family="Arial" font-size="10" fill="#333">Module</text>
      
      <ellipse cx="20" cy="57" rx="10" ry="7" fill="${NODE_COLORS.class}"/>
      <text x="35" y="60" font-family="Arial" font-size="10" fill="#333">Class</text>
      
      <polygon points="20,68 30,75 20,82 10,75" fill="${NODE_COLORS.function}"/>
      <text x="35" y="78" font-family="Arial" font-size="10" fill="#333">Function</text>
      
      <line x1="10" y1="95" x2="30" y2="95" stroke="${getEdgeColor('imports')}" stroke-width="2"/>
      <text x="35" y="98" font-family="Arial" font-size="10" fill="#333">Imports</text>
      
      <line x1="10" y1="110" x2="30" y2="110" stroke="${getEdgeColor('contains')}" stroke-width="2" stroke-dasharray="5,5"/>
      <text x="35" y="113" font-family="Arial" font-size="10" fill="#333">Contains</text>
    </g>`;
};

/**
 * Generate a curved edge for circular layouts
 */
const generateCurvedEdge = (
  source: { x: number; y: number },
  target: { x: number; y: number },
  color: string,
  dashArray: string
): string => {
  // Calculate control point for quadratic curve
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  // Offset control point perpendicular to the line
  const offset = Math.min(len * 0.2, 50);
  const cx = midX - (dy / len) * offset;
  const cy = midY + (dx / len) * offset;
  
  return `
    <path d="M ${source.x} ${source.y} Q ${cx} ${cy} ${target.x} ${target.y}" 
          fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="${dashArray}" opacity="0.5"/>`;
};

/**
 * Calculate node positions based on layout type
 */
const calculateLayoutPositions = (
  nodes: any[],
  edges: any[],
  width: number,
  height: number,
  layoutType: string
): Map<string, { x: number; y: number }> => {
  switch (layoutType) {
    case 'circle':
      return calculateCircularLayout(nodes, width, height);
    case 'concentric':
      return calculateConcentricLayout(nodes, edges, width, height);
    case 'grid':
      return calculateGridLayout(nodes, width, height);
    case 'cose':
    case 'force':
      return calculateForceLayout(nodes, edges, width, height);
    case 'breadthfirst':
      return calculateBreadthFirstLayout(nodes, edges, width, height);
    case 'dagre':
    default:
      return calculateHierarchicalLayout(nodes, edges, width, height);
  }
};

/**
 * Circular layout - nodes arranged in a circle
 */
const calculateCircularLayout = (
  nodes: any[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>();
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 100;
  const nodeCount = nodes.length;
  
  nodes.forEach((node, index) => {
    const id = node.data?.id || node.id;
    const angle = (2 * Math.PI * index) / nodeCount - Math.PI / 2;
    positions.set(id, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    });
  });
  
  return positions;
};

/**
 * Concentric layout - nodes arranged in concentric circles by type
 */
const calculateConcentricLayout = (
  nodes: any[],
  edges: any[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>();
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Group nodes by type
  const nodesByType = new Map<string, any[]>();
  const typeOrder = ['module', 'class', 'function', 'variable', 'default'];
  
  nodes.forEach(node => {
    const type = node.data?.type || node.type || 'default';
    if (!nodesByType.has(type)) nodesByType.set(type, []);
    nodesByType.get(type)!.push(node);
  });
  
  // Calculate radii for each ring
  const maxRadius = Math.min(width, height) / 2 - 80;
  const rings = typeOrder.filter(t => nodesByType.has(t) && nodesByType.get(t)!.length > 0);
  const ringSpacing = maxRadius / (rings.length + 1);
  
  rings.forEach((type, ringIndex) => {
    const nodesInRing = nodesByType.get(type) || [];
    const radius = ringSpacing * (ringIndex + 1);
    
    nodesInRing.forEach((node, nodeIndex) => {
      const id = node.data?.id || node.id;
      const angle = (2 * Math.PI * nodeIndex) / nodesInRing.length - Math.PI / 2;
      positions.set(id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
    });
  });
  
  return positions;
};

/**
 * Grid layout - nodes arranged in a grid
 */
const calculateGridLayout = (
  nodes: any[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>();
  const nodeCount = nodes.length;
  const cols = Math.ceil(Math.sqrt(nodeCount * (width / height)));
  const rows = Math.ceil(nodeCount / cols);
  
  const padding = 80;
  const cellWidth = (width - padding * 2) / cols;
  const cellHeight = (height - padding * 2) / rows;
  
  nodes.forEach((node, index) => {
    const id = node.data?.id || node.id;
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    positions.set(id, {
      x: padding + col * cellWidth + cellWidth / 2,
      y: padding + row * cellHeight + cellHeight / 2 + 50 // offset for title
    });
  });
  
  return positions;
};

/**
 * Force-directed layout simulation
 */
const calculateForceLayout = (
  nodes: any[],
  edges: any[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>();
  const nodeCount = nodes.length;
  
  // Initialize random positions
  const nodePositions: Array<{ id: string; x: number; y: number; vx: number; vy: number }> = 
    nodes.map((node, i) => ({
      id: node.data?.id || node.id,
      x: width / 2 + (Math.random() - 0.5) * width * 0.5,
      y: height / 2 + (Math.random() - 0.5) * height * 0.5,
      vx: 0,
      vy: 0
    }));
  
  // Create adjacency map
  const adjacency = new Map<string, Set<string>>();
  edges.forEach(edge => {
    const source = edge.data?.source || edge.source;
    const target = edge.data?.target || edge.target;
    if (!adjacency.has(source)) adjacency.set(source, new Set());
    if (!adjacency.has(target)) adjacency.set(target, new Set());
    adjacency.get(source)!.add(target);
    adjacency.get(target)!.add(source);
  });
  
  // Simulation parameters
  const iterations = 100;
  const repulsionStrength = 5000;
  const attractionStrength = 0.01;
  const damping = 0.9;
  const padding = 100;
  
  // Run simulation
  for (let iter = 0; iter < iterations; iter++) {
    // Apply repulsion between all nodes
    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        const dx = nodePositions[j].x - nodePositions[i].x;
        const dy = nodePositions[j].y - nodePositions[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsionStrength / (dist * dist);
        
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        nodePositions[i].vx -= fx;
        nodePositions[i].vy -= fy;
        nodePositions[j].vx += fx;
        nodePositions[j].vy += fy;
      }
    }
    
    // Apply attraction along edges
    edges.forEach(edge => {
      const sourceId = edge.data?.source || edge.source;
      const targetId = edge.data?.target || edge.target;
      const sourceNode = nodePositions.find(n => n.id === sourceId);
      const targetNode = nodePositions.find(n => n.id === targetId);
      
      if (sourceNode && targetNode) {
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = dist * attractionStrength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        sourceNode.vx += fx;
        sourceNode.vy += fy;
        targetNode.vx -= fx;
        targetNode.vy -= fy;
      }
    });
    
    // Update positions and apply damping
    nodePositions.forEach(node => {
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= damping;
      node.vy *= damping;
      
      // Keep within bounds
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding + 50, Math.min(height - padding, node.y));
    });
  }
  
  // Store final positions
  nodePositions.forEach(node => {
    positions.set(node.id, { x: node.x, y: node.y });
  });
  
  return positions;
};

/**
 * Breadth-first tree layout
 */
const calculateBreadthFirstLayout = (
  nodes: any[],
  edges: any[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> => {
  return calculateHierarchicalLayout(nodes, edges, width, height, true);
};

/**
 * Hierarchical/Tree layout (Dagre-style)
 */
const calculateHierarchicalLayout = (
  nodes: any[],
  edges: any[],
  width: number,
  height: number,
  horizontal: boolean = false
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>();
  
  // Build adjacency info
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  
  edges.forEach((edge: any) => {
    const sourceId = edge.data?.source || edge.source;
    const targetId = edge.data?.target || edge.target;
    
    if (!children.has(sourceId)) children.set(sourceId, []);
    children.get(sourceId)!.push(targetId);
    
    if (!parents.has(targetId)) parents.set(targetId, []);
    parents.get(targetId)!.push(sourceId);
  });
  
  // Assign levels via BFS
  const levels = new Map<string, number>();
  const nodeIds = nodes.map((n: any) => n.data?.id || n.id);
  const rootNodes = nodeIds.filter((id: string) => !parents.has(id) || parents.get(id)!.length === 0);
  
  // If no roots found, use all nodes as roots (disconnected graph)
  const startNodes = rootNodes.length > 0 ? rootNodes : nodeIds.slice(0, Math.max(1, Math.ceil(nodeIds.length / 10)));
  
  const queue: Array<{ id: string; level: number }> = startNodes.map(id => ({ id, level: 0 }));
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    levels.set(id, level);
    
    const nodeChildren = children.get(id) || [];
    nodeChildren.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }
  
  // Handle unvisited nodes
  nodeIds.forEach((id: string) => {
    if (!levels.has(id)) {
      levels.set(id, 0);
    }
  });
  
  // Group by level
  const levelGroups = new Map<number, string[]>();
  levels.forEach((level, id) => {
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(id);
  });
  
  // Calculate positions with proper spacing
  const maxLevel = Math.max(...Array.from(levels.values()), 0);
  const padding = 80;
  const titleOffset = 60;
  const legendOffset = 220;
  
  const availableWidth = width - padding * 2 - legendOffset;
  const availableHeight = height - padding * 2 - titleOffset;
  
  // Calculate spacing based on max nodes per level
  const maxNodesInLevel = Math.max(...Array.from(levelGroups.values()).map(arr => arr.length));
  const levelSpacing = horizontal 
    ? availableWidth / (maxLevel + 1)
    : availableHeight / (maxLevel + 1);
  
  levelGroups.forEach((nodeIdsAtLevel, level) => {
    const nodeCount = nodeIdsAtLevel.length;
    
    if (horizontal) {
      const x = padding + level * levelSpacing + levelSpacing / 2;
      const nodeSpacing = availableHeight / (nodeCount + 1);
      
      nodeIdsAtLevel.forEach((id, index) => {
        const y = padding + titleOffset + (index + 1) * nodeSpacing;
        positions.set(id, { x, y });
      });
    } else {
      const y = padding + titleOffset + level * levelSpacing + levelSpacing / 2;
      const nodeSpacing = availableWidth / (nodeCount + 1);
      
      nodeIdsAtLevel.forEach((id, index) => {
        const x = padding + (index + 1) * nodeSpacing;
        positions.set(id, { x, y });
      });
    }
  });
  
  return positions;
};

/**
 * Get SVG shape element for a node
 */
const getNodeShape = (
  shape: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  type: string
): string => {
  const borderColor = adjustColor(color, -30);
  
  switch (shape) {
    case 'rect':
      return `
    <rect x="${x - width/2}" y="${y - height/2}" width="${width}" height="${height}" 
          rx="8" ry="8" fill="${color}" stroke="${borderColor}" stroke-width="2" class="node-shadow"/>`;
    
    case 'ellipse':
      return `
    <ellipse cx="${x}" cy="${y}" rx="${width/2}" ry="${height/2}" 
             fill="${color}" stroke="${borderColor}" stroke-width="2" class="node-shadow"/>`;
    
    case 'polygon': // Diamond
      const hw = width / 2;
      const hh = height / 2;
      return `
    <polygon points="${x},${y-hh} ${x+hw},${y} ${x},${y+hh} ${x-hw},${y}" 
             fill="${color}" stroke="${borderColor}" stroke-width="2" class="node-shadow"/>`;
    
    default:
      return `
    <ellipse cx="${x}" cy="${y}" rx="${width/2}" ry="${height/2}" 
             fill="${color}" stroke="${borderColor}" stroke-width="2" class="node-shadow"/>`;
  }
};

/**
 * Wrap a label into multiple lines
 */
const wrapLabel = (label: string, maxCharsPerLine: number): string[] => {
  if (!label) return [''];
  
  // Clean up common prefixes/suffixes for better display
  let cleanLabel = label
    .replace(/^_+/, '')  // Remove leading underscores
    .replace(/_+$/, ''); // Remove trailing underscores
  
  // If it fits on one line, return as-is
  if (cleanLabel.length <= maxCharsPerLine) {
    return [cleanLabel];
  }
  
  // Try to split on underscores or camelCase boundaries
  const parts: string[] = [];
  
  // Split by underscore first
  if (cleanLabel.includes('_')) {
    const underscoreParts = cleanLabel.split('_');
    let currentLine = '';
    
    underscoreParts.forEach((part, i) => {
      const separator = i > 0 ? '_' : '';
      if ((currentLine + separator + part).length <= maxCharsPerLine) {
        currentLine += separator + part;
      } else {
        if (currentLine) parts.push(currentLine);
        currentLine = part;
      }
    });
    if (currentLine) parts.push(currentLine);
  } else {
    // Split by camelCase or just break at max length
    let remaining = cleanLabel;
    while (remaining.length > maxCharsPerLine) {
      // Try to find a good break point (lowercase followed by uppercase)
      let breakPoint = maxCharsPerLine;
      for (let i = maxCharsPerLine - 1; i > maxCharsPerLine / 2; i--) {
        if (remaining[i] && remaining[i].match(/[a-z]/) && 
            remaining[i + 1] && remaining[i + 1].match(/[A-Z]/)) {
          breakPoint = i + 1;
          break;
        }
      }
      parts.push(remaining.substring(0, breakPoint));
      remaining = remaining.substring(breakPoint);
    }
    if (remaining) parts.push(remaining);
  }
  
  // Limit to max 3 lines
  if (parts.length > 3) {
    return [parts[0], parts[1], parts.slice(2).join('').substring(0, maxCharsPerLine - 2) + '..'];
  }
  
  return parts.length > 0 ? parts : [cleanLabel.substring(0, maxCharsPerLine)];
};

/**
 * Get edge color based on relationship type
 */
const getEdgeColor = (type: string): string => {
  switch (type) {
    case 'imports': return '#2196f3';
    case 'calls': return '#ff9800';
    case 'contains': return '#4caf50';
    case 'inherits': return '#9c27b0';
    default: return '#999999';
  }
};

/**
 * Calculate arrow points for edge
 */
const getArrowPoints = (
  source: { x: number; y: number },
  target: { x: number; y: number }
): string => {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  if (len === 0) return '';
  
  // Normalize and get perpendicular
  const nx = dx / len;
  const ny = dy / len;
  const px = -ny;
  const py = nx;
  
  // Arrow position (slightly before target)
  const arrowSize = 8;
  const offset = 40; // Distance from target center
  const ax = target.x - nx * offset;
  const ay = target.y - ny * offset;
  
  // Arrow points
  const p1x = ax - nx * arrowSize + px * arrowSize / 2;
  const p1y = ay - ny * arrowSize + py * arrowSize / 2;
  const p2x = ax;
  const p2y = ay;
  const p3x = ax - nx * arrowSize - px * arrowSize / 2;
  const p3y = ay - ny * arrowSize - py * arrowSize / 2;
  
  return `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`;
};

/**
 * Adjust color brightness
 */
const adjustColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Escape XML special characters
 */
const escapeXml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Export visualization as PNG image
 */
export const exportAsPNG = async (
  element: HTMLElement | SVGElement,
  options: Partial<ExportOptions> = {}
): Promise<void> => {
  try {
    // Dynamic import for better code splitting
    const html2canvas = await import('html2canvas');
    
    const canvas = await html2canvas.default(element as HTMLElement, {
      backgroundColor: options.backgroundColor || '#ffffff',
      width: options.width,
      height: options.height,
      scale: options.quality || 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    } as any);

    // Create download link
    const link = document.createElement('a');
    link.download = options.filename || `visualization-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to export as PNG:', error);
    throw new Error('PNG export failed. Please try again.');
  }
};

/**
 * Export visualization as SVG
 * Creates proper vector SVG from graph data when available
 */
export const exportAsSVG = async (
  element: HTMLElement | SVGElement,
  options: Partial<ExportOptions> = {}
): Promise<void> => {
  try {
    let svgString: string;

    // If graph data is provided, generate a proper vector SVG
    if (options.graphData) {
      svgString = generateVectorSVG(options.graphData, options);
    } else {
      // Fallback: Look for an existing SVG element (for D3 or native SVG visualizations)
      let svgElement: SVGElement | null = null;

      if (element.tagName?.toLowerCase() === 'svg') {
        svgElement = element as SVGElement;
      } else {
        // Find the main visualization SVG, excluding small icon SVGs
        const allSvgs = element.querySelectorAll('svg');
        
        for (const svg of Array.from(allSvgs)) {
          const viewBox = svg.getAttribute('viewBox');
          const svgWidth = svg.clientWidth || parseInt(svg.getAttribute('width') || '0');
          const svgHeight = svg.clientHeight || parseInt(svg.getAttribute('height') || '0');
          
          // Skip small SVGs (likely icons - typically 24x24 or smaller)
          const isIconSvg = (viewBox === '0 0 24 24') || 
                           (svgWidth <= 48 && svgHeight <= 48) ||
                           svg.classList.contains('MuiSvgIcon-root');
          
          if (!isIconSvg) {
            svgElement = svg;
            break;
          }
        }
      }

      if (svgElement) {
        // Clone the SVG to avoid modifying the original
        const clonedSvg = svgElement.cloneNode(true) as SVGElement;
        
        // Set dimensions if provided
        if (options.width) {
          clonedSvg.setAttribute('width', options.width.toString());
        }
        if (options.height) {
          clonedSvg.setAttribute('height', options.height.toString());
        }

        // Set background color if provided
        if (options.backgroundColor) {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('width', '100%');
          rect.setAttribute('height', '100%');
          rect.setAttribute('fill', options.backgroundColor);
          clonedSvg.insertBefore(rect, clonedSvg.firstChild);
        }

        // Serialize SVG to string
        const serializer = new XMLSerializer();
        svgString = serializer.serializeToString(clonedSvg);
      } else {
        // No SVG found and no graph data - cannot create vector SVG
        throw new Error('No graph data available for vector SVG export. Please ensure graph data is passed to the export function.');
      }
    }
    
    // Create blob and download
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = options.filename || `visualization-${Date.now()}.svg`;
    link.href = url;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export as SVG:', error);
    throw new Error(error instanceof Error ? error.message : 'SVG export failed. Please try again.');
  }
};

/**
 * Export visualization as PDF
 */
export const exportAsPDF = async (
  element: HTMLElement | SVGElement,
  options: Partial<ExportOptions> = {}
): Promise<void> => {
  try {
    // Dynamic imports for better code splitting
    const [jsPDF, html2canvas] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);

    const canvas = await html2canvas.default(element as HTMLElement, {
      backgroundColor: options.backgroundColor || '#ffffff',
      width: options.width,
      height: options.height,
      scale: options.quality || 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    } as any);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF.jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(options.filename || `visualization-${Date.now()}.pdf`);
  } catch (error) {
    console.error('Failed to export as PDF:', error);
    throw new Error('PDF export failed. Please try again.');
  }
};

/**
 * Export visualization data as JSON
 */
export const exportAsJSON = (
  data: any,
  options: Partial<ExportOptions> = {}
): void => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = options.filename || `visualization-data-${Date.now()}.json`;
    link.href = url;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export as JSON:', error);
    throw new Error('JSON export failed. Please try again.');
  }
};

/**
 * Create shareable state object
 */
export const createShareableState = (
  graphType: string,
  layoutType: string,
  viewSettings: Record<string, any>,
  selectedNode?: any
): ShareableState => {
  return {
    graphType,
    layoutType,
    viewSettings,
    selectedNode,
    timestamp: Date.now(),
    version: '1.0.0'
  };
};

/**
 * Generate shareable URL with state
 */
export const generateShareableURL = (state: ShareableState): string => {
  try {
    const encodedState = btoa(JSON.stringify(state));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?shared=${encodedState}`;
  } catch (error) {
    console.error('Failed to generate shareable URL:', error);
    throw new Error('Failed to generate shareable URL');
  }
};

/**
 * Parse shareable URL to extract state
 */
export const parseShareableURL = (url?: string): ShareableState | null => {
  try {
    const urlToParse = url || window.location.href;
    const urlObj = new URL(urlToParse);
    const sharedParam = urlObj.searchParams.get('shared');
    
    if (!sharedParam) {
      return null;
    }

    const decodedState = atob(sharedParam);
    const state = JSON.parse(decodedState) as ShareableState;
    
    // Validate state structure
    if (!state.graphType || !state.layoutType || !state.version) {
      throw new Error('Invalid state structure');
    }

    return state;
  } catch (error) {
    console.error('Failed to parse shareable URL:', error);
    return null;
  }
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw new Error('Failed to copy to clipboard');
  }
};

/**
 * Get optimal export dimensions based on content
 */
export const getOptimalExportDimensions = (
  element: HTMLElement,
  format: 'png' | 'svg' | 'pdf' | 'json'
): { width: number; height: number } => {
  const rect = element.getBoundingClientRect();
  const aspectRatio = rect.width / rect.height;
  
  // Base dimensions for different formats
  const baseDimensions = {
    png: { width: 1920, height: 1080 },
    svg: { width: 1200, height: 800 },
    pdf: { width: 1600, height: 1200 },
    json: { width: 1200, height: 800 }
  };

  const base = baseDimensions[format];
  
  // Maintain aspect ratio
  if (aspectRatio > base.width / base.height) {
    // Wider than base ratio
    return {
      width: base.width,
      height: Math.round(base.width / aspectRatio)
    };
  } else {
    // Taller than base ratio
    return {
      width: Math.round(base.height * aspectRatio),
      height: base.height
    };
  }
};

/**
 * Validate export options
 */
export const validateExportOptions = (options: Partial<ExportOptions>): ExportOptions => {
  const validated: ExportOptions = { 
    format: 'png',
    ...options 
  };
  
  // Ensure quality is within valid range
  if (validated.quality !== undefined) {
    validated.quality = Math.max(0.1, Math.min(3, validated.quality));
  }
  
  // Ensure dimensions are positive
  if (validated.width !== undefined) {
    validated.width = Math.max(100, validated.width);
  }
  if (validated.height !== undefined) {
    validated.height = Math.max(100, validated.height);
  }
  
  // Validate filename
  if (validated.filename) {
    validated.filename = validated.filename.replace(/[^a-z0-9.-]/gi, '_');
  }
  
  return validated;
};