import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { ZoomIn, ZoomOut, CenterFocusStrong, Pause, PlayArrow } from '@mui/icons-material';

// Lazy load D3
const loadD3 = async () => {
  const d3 = await import('d3');
  return d3;
};

export interface ForceGraphNode {
  id: string;
  name?: string;
  label?: string;
  type?: string;
  file_path?: string;
  docstring?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  [key: string]: any;
}

export interface ForceGraphLink {
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
  relationship_type?: string;
  type?: string;
  weight?: number;
  [key: string]: any;
}

export interface ForceGraphData {
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
}

interface ForceGraphProps {
  graphData: ForceGraphData;
  width?: number;
  height?: number;
  onNodeClick?: (node: ForceGraphNode) => void;
  onLinkClick?: (link: ForceGraphLink) => void;
  showLabels?: boolean;
  enableZoom?: boolean;
  enableDrag?: boolean;
  linkDistance?: number;
  chargeStrength?: number;
  collisionRadius?: number;
}

const ForceGraph: React.FC<ForceGraphProps> = ({
  graphData = { nodes: [], links: [] },
  width = 800,
  height = 600,
  onNodeClick = () => {},
  onLinkClick = () => {},
  showLabels = true,
  enableZoom = true,
  enableDrag = true,
  linkDistance = 100,
  chargeStrength = -300,
  collisionRadius = 20
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<any>(null);
  const onNodeClickRef = useRef(onNodeClick);
  const onLinkClickRef = useRef(onLinkClick);
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNode, setSelectedNode] = useState<ForceGraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ForceGraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep refs updated
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
    onLinkClickRef.current = onLinkClick;
  }, [onNodeClick, onLinkClick]);

  // Enhanced color scheme for different node types
  const getNodeColor = useCallback((d: ForceGraphNode) => {
    if (selectedNode && selectedNode.id === d.id) return '#f44336';
    if (hoveredNode && hoveredNode.id === d.id) return '#ff9800';
    
    switch (d.type) {
      case 'module': return '#1976d2';
      case 'class': return '#388e3c';
      case 'function': return '#f57c00';
      case 'variable': return '#7b1fa2';
      default: return '#616161';
    }
  }, [selectedNode, hoveredNode]);

  // Enhanced node size based on importance/connections
  const getNodeSize = useCallback((d: ForceGraphNode) => {
    const baseSize = 8;
    const connectionCount = (graphData.links || []).filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return sourceId === d.id || targetId === d.id;
    }).length;
    return Math.max(baseSize, Math.min(20, baseSize + connectionCount * 2));
  }, [graphData.links]);

  // Enhanced link styling based on relationship type
  const getLinkStyle = useCallback((d: ForceGraphLink) => {
    switch (d.relationship_type || d.type) {
      case 'imports': return { color: '#2196f3', width: 2, dashArray: 'none' };
      case 'calls': return { color: '#ff9800', width: 2, dashArray: 'none' };
      case 'contains': return { color: '#4caf50', width: 3, dashArray: '5,5' };
      case 'inherits': return { color: '#9c27b0', width: 3, dashArray: 'none' };
      default: return { color: '#999', width: 1, dashArray: 'none' };
    }
  }, []);

  // Zoom functions
  const handleZoomIn = useCallback(async () => {
    if (!svgRef.current) return;
    const d3 = await loadD3();
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom().scaleExtent([0.1, 4]);
    (svg.transition() as any).call(zoom.scaleBy, 1.5);
  }, []);

  const handleZoomOut = useCallback(async () => {
    if (!svgRef.current) return;
    const d3 = await loadD3();
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom().scaleExtent([0.1, 4]);
    (svg.transition() as any).call(zoom.scaleBy, 1 / 1.5);
  }, []);

  const handleResetView = useCallback(async () => {
    if (!svgRef.current) return;
    const d3 = await loadD3();
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom().scaleExtent([0.1, 4]);
    (svg.transition() as any).call(zoom.transform, d3.zoomIdentity);
    setZoomLevel(1);
  }, []);

  const toggleSimulation = useCallback(() => {
    if (simulationRef.current) {
      if (isSimulationRunning) {
        simulationRef.current.stop();
      } else {
        simulationRef.current.restart();
      }
      setIsSimulationRunning(!isSimulationRunning);
    }
  }, [isSimulationRunning]);

  useEffect(() => {
    let mounted = true;

    const initializeForceGraph = async () => {
      if (!graphData.nodes.length || !svgRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        const d3 = await loadD3();

        if (!mounted) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // Create main group for zoom/pan
        const g = svg.append("g");

        // Set up zoom behavior
        if (enableZoom) {
          const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event: any) => {
              g.attr("transform", event.transform);
              setZoomLevel(event.transform.k);
            });
          
          svg.call(zoom as any);
        }

        // Create arrow markers for directed edges
        svg.append("defs").selectAll("marker")
          .data(["imports", "calls", "contains", "inherits", "default"])
          .join("marker")
          .attr("id", (d: string) => `arrow-${d}`)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 15)
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M0,-5L10,0L0,5")
          .attr("fill", (d: string) => {
            const style = getLinkStyle({ relationship_type: d } as ForceGraphLink);
            return style.color;
          });

        // Create simulation with enhanced forces
        const simulation = d3.forceSimulation(graphData.nodes as any)
          .force("link", d3.forceLink(graphData.links as any)
            .id((d: any) => d.id)
            .distance(linkDistance)
            .strength(0.1))
          .force("charge", d3.forceManyBody().strength(chargeStrength))
          .force("center", d3.forceCenter(width / 2, height / 2))
          .force("collision", d3.forceCollide().radius(collisionRadius))
          .force("x", d3.forceX(width / 2).strength(0.05))
          .force("y", d3.forceY(height / 2).strength(0.05));

        simulationRef.current = simulation;

        // Create links with enhanced styling
        const link = g.append("g")
          .attr("class", "links")
          .selectAll("line")
          .data(graphData.links)
          .join("line")
          .attr("stroke", (d: ForceGraphLink) => getLinkStyle(d).color)
          .attr("stroke-width", (d: ForceGraphLink) => getLinkStyle(d).width)
          .attr("stroke-dasharray", (d: ForceGraphLink) => getLinkStyle(d).dashArray)
          .attr("stroke-opacity", 0.6)
          .attr("marker-end", (d: ForceGraphLink) => `url(#arrow-${d.relationship_type || d.type || 'default'})`)
          .style("cursor", "pointer")
          .on("click", (_event: any, d: ForceGraphLink) => onLinkClickRef.current(d))
          .on("mouseover", function(_event: any, d: ForceGraphLink) {
            d3.select(this)
              .attr("stroke-opacity", 1)
              .attr("stroke-width", getLinkStyle(d).width + 1);
          })
          .on("mouseout", function(_event: any, d: ForceGraphLink) {
            d3.select(this)
              .attr("stroke-opacity", 0.6)
              .attr("stroke-width", getLinkStyle(d).width);
          });

        // Add link labels for relationship types
        const linkLabel = g.append("g")
          .attr("class", "link-labels")
          .selectAll("text")
          .data(graphData.links.filter((d: ForceGraphLink) => d.relationship_type || d.type))
          .join("text")
          .attr("font-size", "10px")
          .attr("fill", "#666")
          .attr("text-anchor", "middle")
          .style("pointer-events", "none")
          .text((d: ForceGraphLink) => d.relationship_type || d.type || '');

        // Create nodes with enhanced styling
        const node = g.append("g")
          .attr("class", "nodes")
          .selectAll("circle")
          .data(graphData.nodes)
          .join("circle")
          .attr("r", getNodeSize)
          .attr("fill", getNodeColor)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .style("cursor", "pointer")
          .on("click", (_event: any, d: ForceGraphNode) => {
            setSelectedNode(d);
            onNodeClickRef.current(d);
          })
          .on("mouseover", (_event: any, d: ForceGraphNode) => {
            setHoveredNode(d);
            // Highlight connected nodes and links
            const connectedLinks = graphData.links.filter((link: ForceGraphLink) => {
              const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
              const targetId = typeof link.target === 'string' ? link.target : link.target.id;
              return sourceId === d.id || targetId === d.id;
            });
            
            link.attr("stroke-opacity", (l: ForceGraphLink) => 
              connectedLinks.includes(l) ? 1 : 0.2
            );
            
            node.attr("opacity", (n: ForceGraphNode) => 
              n === d || connectedLinks.some((l: ForceGraphLink) => {
                const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
                const targetId = typeof l.target === 'string' ? l.target : l.target.id;
                return sourceId === n.id || targetId === n.id;
              }) ? 1 : 0.3
            );
          })
          .on("mouseout", () => {
            setHoveredNode(null);
            // Reset highlighting
            link.attr("stroke-opacity", 0.6);
            node.attr("opacity", 1);
          });

        // Add drag behavior if enabled
        if (enableDrag) {
          const dragstarted = (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          };

          const dragged = (event: any, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          };

          const dragended = (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          };

          node.call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended) as any);
        }

        // Add node labels if enabled
        let label: any;
        if (showLabels) {
          label = g.append("g")
            .attr("class", "labels")
            .selectAll("text")
            .data(graphData.nodes)
            .join("text")
            .text((d: ForceGraphNode) => d.name || d.label || d.id)
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", "#333")
            .attr("text-anchor", "middle")
            .attr("dy", -15)
            .style("pointer-events", "none")
            .style("text-shadow", "1px 1px 2px rgba(255,255,255,0.8)");
        }

        // Add enhanced tooltips
        node.append("title")
          .text((d: ForceGraphNode) => {
            const connections = graphData.links.filter((link: ForceGraphLink) => {
              const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
              const targetId = typeof link.target === 'string' ? link.target : link.target.id;
              return sourceId === d.id || targetId === d.id;
            }).length;
            return `${d.name || d.id} (${d.type})\nConnections: ${connections}${d.docstring ? '\n' + d.docstring.substring(0, 100) + '...' : ''}`;
          });

        // Animation tick function
        simulation.on("tick", () => {
          link
            .attr("x1", (d: any) => d.source.x)
            .attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x)
            .attr("y2", (d: any) => d.target.y);

          linkLabel
            .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
            .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

          node
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y);

          if (label) {
            label
              .attr("x", (d: any) => d.x)
              .attr("y", (d: any) => d.y);
          }
        });

        // Update node colors when selection changes
        simulation.on("end", () => {
          node.attr("fill", (d: any) => getNodeColor(d));
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize Force Graph:', err);
        setError('Failed to load visualization library');
        setIsLoading(false);
      }
    };

    initializeForceGraph();

    return () => {
      mounted = false;
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
    // Only re-initialize when data or dimensions change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData.nodes.length, graphData.links.length, width, height, showLabels, enableZoom, enableDrag, 
      linkDistance, chargeStrength, collisionRadius]);

  // Update node colors when selection changes
  useEffect(() => {
    const updateNodeColors = async () => {
      if (svgRef.current && !isLoading) {
        const d3 = await loadD3();
        const svg = d3.select(svgRef.current);
        svg.selectAll(".nodes circle")
          .attr("fill", (d: any) => getNodeColor(d));
      }
    };

    updateNodeColors();
  }, [selectedNode, hoveredNode, getNodeColor, isLoading]);

  if (error) {
    return (
      <Box sx={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  if (!graphData.nodes.length) {
    return (
      <Box sx={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No data available for force graph visualization
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width, height }}>
      {/* Loading Overlay */}
      {isLoading && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: (theme) => theme.palette.mode === 'dark' 
            ? 'rgba(18, 18, 18, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)',
          zIndex: 1001
        }}>
          <Typography variant="body2" color="text.secondary">
            Loading force graph visualization...
          </Typography>
        </Box>
      )}

      {/* Control Panel */}
      {!isLoading && (
        <Box sx={{ 
          position: 'absolute', 
          top: 10, 
          right: 10, 
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          backgroundColor: (theme) => theme.palette.mode === 'dark' 
            ? 'rgba(30, 30, 30, 0.9)' 
            : 'rgba(255, 255, 255, 0.9)',
          borderRadius: 1,
          p: 1
        }}>
          <Tooltip title="Zoom In">
            <IconButton size="small" onClick={handleZoomIn}>
              <ZoomIn />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton size="small" onClick={handleZoomOut}>
              <ZoomOut />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset View">
            <IconButton size="small" onClick={handleResetView}>
              <CenterFocusStrong />
            </IconButton>
          </Tooltip>
          <Tooltip title={isSimulationRunning ? "Pause Simulation" : "Resume Simulation"}>
            <IconButton size="small" onClick={toggleSimulation}>
              {isSimulationRunning ? <Pause /> : <PlayArrow />}
            </IconButton>
          </Tooltip>
          <Typography variant="caption" sx={{ textAlign: 'center', mt: 1 }}>
            Zoom: {Math.round(zoomLevel * 100)}%
          </Typography>
        </Box>
      )}

      {/* Selected Node Info */}
      {selectedNode && !isLoading && (
        <Box sx={{ 
          position: 'absolute', 
          top: 10, 
          left: 10, 
          zIndex: 1000,
          backgroundColor: (theme) => theme.palette.mode === 'dark' 
            ? 'rgba(30, 30, 30, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
          borderRadius: 1,
          p: 2,
          maxWidth: 300,
          boxShadow: 2
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: getNodeColor(selectedNode) }}>
            {selectedNode.name || selectedNode.id}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Type: {selectedNode.type}
          </Typography>
          {selectedNode.file_path && (
            <Typography variant="caption" display="block" color="text.secondary">
              File: {selectedNode.file_path}
            </Typography>
          )}
          {selectedNode.docstring && (
            <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8rem' }}>
              {selectedNode.docstring.substring(0, 150)}...
            </Typography>
          )}
        </Box>
      )}

      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ 
          borderRadius: '4px',
        }}
      />
    </Box>
  );
};

export default ForceGraph;