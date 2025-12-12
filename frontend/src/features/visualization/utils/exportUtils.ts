// Utility functions for exporting visualizations

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'json';
  quality?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  filename?: string;
  graphData?: any; // Graph data for vector SVG export
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

/**
 * Generate a proper vector SVG from graph data
 */
const generateVectorSVG = (
  graphData: any,
  options: Partial<ExportOptions>
): string => {
  const width = options.width || 1920;
  const height = options.height || 1080;
  const bgColor = options.backgroundColor || '#ffffff';
  
  // Extract nodes and edges from cytoscape format
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
  
  // Calculate layout positions using a simple hierarchical layout
  const nodePositions = calculateNodePositions(nodes, edges, width, height);
  
  // Build SVG elements
  const svgElements: string[] = [];
  
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
      
      // Draw edge line
      svgElements.push(`
    <line x1="${sourcePos.x}" y1="${sourcePos.y}" x2="${targetPos.x}" y2="${targetPos.y}" 
          stroke="${edgeColor}" stroke-width="2" stroke-dasharray="${dashArray}" opacity="0.6"/>
    <!-- Arrow marker -->
    <polygon points="${getArrowPoints(sourcePos, targetPos)}" fill="${edgeColor}" opacity="0.8"/>`);
    }
  });
  
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
      const nodeWidth = type === 'module' ? 120 : 90;
      const nodeHeight = type === 'module' ? 50 : 70;
      
      // Draw node shape
      svgElements.push(getNodeShape(shape, pos.x, pos.y, nodeWidth, nodeHeight, color, type));
      
      // Draw label with text wrapping
      const truncatedLabel = label.length > 15 ? label.substring(0, 12) + '...' : label;
      svgElements.push(`
    <text x="${pos.x}" y="${pos.y}" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#ffffff">
      <tspan x="${pos.x}" dy="0">${escapeXml(truncatedLabel)}</tspan>
    </text>`);
    }
  });
  
  // Create the complete SVG
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .node-shadow { filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.3)); }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <g class="graph-content">
    ${svgElements.join('\n')}
  </g>
</svg>`;
};

/**
 * Calculate node positions using a hierarchical layout
 */
const calculateNodePositions = (
  nodes: any[],
  edges: any[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>();
  
  // Build adjacency info to determine hierarchy levels
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
  
  // Find root nodes (no parents) and assign levels
  const levels = new Map<string, number>();
  const nodeIds = nodes.map((n: any) => n.data?.id || n.id);
  
  // BFS to assign levels
  const rootNodes = nodeIds.filter((id: string) => !parents.has(id) || parents.get(id)!.length === 0);
  const queue: Array<{ id: string; level: number }> = rootNodes.map(id => ({ id, level: 0 }));
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
  
  // Handle nodes not reached by BFS
  nodeIds.forEach((id: string) => {
    if (!levels.has(id)) {
      levels.set(id, 0);
    }
  });
  
  // Group nodes by level
  const levelGroups = new Map<number, string[]>();
  levels.forEach((level, id) => {
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(id);
  });
  
  // Calculate positions
  const maxLevel = Math.max(...Array.from(levels.values()), 0);
  const padding = 100;
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const levelHeight = maxLevel > 0 ? availableHeight / (maxLevel + 1) : availableHeight / 2;
  
  levelGroups.forEach((nodeIdsAtLevel, level) => {
    const y = padding + level * levelHeight + levelHeight / 2;
    const nodeSpacing = availableWidth / (nodeIdsAtLevel.length + 1);
    
    nodeIdsAtLevel.forEach((id, index) => {
      const x = padding + (index + 1) * nodeSpacing;
      positions.set(id, { x, y });
    });
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