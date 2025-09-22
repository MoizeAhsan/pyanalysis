import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { ZoomIn, ZoomOut, CenterFocusStrong, Pause, PlayArrow } from '@mui/icons-material';

const ForceGraphComponent = ({ 
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
  const svgRef = useRef();
  const simulationRef = useRef();
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  // Enhanced color scheme for different node types
  const getNodeColor = useCallback((d) => {
    if (selectedNode && selectedNode.id === d.id) return '#f44336'; // Red for selected
    if (hoveredNode && hoveredNode.id === d.id) return '#ff9800'; // Orange for hovered
    
    switch (d.type) {
      case 'module': return '#1976d2'; // Blue
      case 'class': return '#388e3c'; // Green
      case 'function': return '#f57c00'; // Orange
      case 'variable': return '#7b1fa2'; // Purple
      default: return '#616161'; // Grey
    }
  }, [selectedNode, hoveredNode]);

  // Enhanced node size based on importance/connections
  const getNodeSize = useCallback((d) => {
    const baseSize = 8;
    const connectionCount = (graphData.links || []).filter(link => 
      link.source === d.id || link.target === d.id || 
      link.source.id === d.id || link.target.id === d.id
    ).length;
    return Math.max(baseSize, Math.min(20, baseSize + connectionCount * 2));
  }, [graphData.links]);

  // Enhanced link styling based on relationship type
  const getLinkStyle = useCallback((d) => {
    switch (d.relationship_type || d.type) {
      case 'imports': return { color: '#2196f3', width: 2, dashArray: 'none' };
      case 'calls': return { color: '#ff9800', width: 2, dashArray: 'none' };
      case 'contains': return { color: '#4caf50', width: 3, dashArray: '5,5' };
      case 'inherits': return { color: '#9c27b0', width: 3, dashArray: 'none' };
      default: return { color: '#999', width: 1, dashArray: 'none' };
    }
  }, []);

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom().scaleExtent([0.1, 4]);
    svg.transition().call(zoom.scaleBy, 1.5);
  }, []);

  const handleZoomOut = useCallback(() => {
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom().scaleExtent([0.1, 4]);
    svg.transition().call(zoom.scaleBy, 1 / 1.5);
  }, []);

  const handleResetView = useCallback(() => {
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom().scaleExtent([0.1, 4]);
    svg.transition().call(zoom.transform, d3.zoomIdentity);
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
    if (!graphData.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous content

    // Create main group for zoom/pan
    const g = svg.append("g");

    // Set up zoom behavior
    if (enableZoom) {
      const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
          setZoomLevel(event.transform.k);
        });
      
      svg.call(zoom);
    }

    // Create arrow markers for directed edges
    svg.append("defs").selectAll("marker")
      .data(["imports", "calls", "contains", "inherits", "default"])
      .join("marker")
      .attr("id", d => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", d => {
        const style = getLinkStyle({ relationship_type: d });
        return style.color;
      });

    // Create simulation with enhanced forces
    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links)
        .id(d => d.id)
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
      .attr("stroke", d => getLinkStyle(d).color)
      .attr("stroke-width", d => getLinkStyle(d).width)
      .attr("stroke-dasharray", d => getLinkStyle(d).dashArray)
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", d => `url(#arrow-${d.relationship_type || d.type || 'default'})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => onLinkClick(d))
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke-opacity", 1)
          .attr("stroke-width", getLinkStyle(d).width + 1);
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .attr("stroke-opacity", 0.6)
          .attr("stroke-width", getLinkStyle(d).width);
      });

    // Add link labels for relationship types
    const linkLabel = g.append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(graphData.links.filter(d => d.relationship_type || d.type))
      .join("text")
      .attr("font-size", "10px")
      .attr("fill", "#666")
      .attr("text-anchor", "middle")
      .style("pointer-events", "none")
      .text(d => d.relationship_type || d.type);

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
      .on("click", (event, d) => {
        setSelectedNode(d);
        onNodeClick(d);
      })
      .on("mouseover", (event, d) => {
        setHoveredNode(d);
        // Highlight connected nodes and links
        const connectedLinks = graphData.links.filter(link => 
          link.source === d || link.target === d ||
          link.source.id === d.id || link.target.id === d.id
        );
        
        link.attr("stroke-opacity", l => 
          connectedLinks.includes(l) ? 1 : 0.2
        );
        
        node.attr("opacity", n => 
          n === d || connectedLinks.some(l => 
            l.source === n || l.target === n ||
            l.source.id === n.id || l.target.id === n.id
          ) ? 1 : 0.3
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
      node.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    }

    // Add node labels if enabled
    let label;
    if (showLabels) {
      label = g.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(graphData.nodes)
        .join("text")
        .text(d => d.name || d.label || d.id)
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
      .text(d => {
        const connections = graphData.links.filter(link => 
          link.source === d || link.target === d ||
          link.source.id === d.id || link.target.id === d.id
        ).length;
        return `${d.name || d.id} (${d.type})\nConnections: ${connections}${d.docstring ? '\n' + d.docstring.substring(0, 100) + '...' : ''}`;
      });

    // Animation tick function
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      linkLabel
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      if (label) {
        label
          .attr("x", d => d.x)
          .attr("y", d => d.y);
      }
    });

    // Update node colors when selection changes
    simulation.on("end", () => {
      node.attr("fill", getNodeColor);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      if (simulation) {
        simulation.stop();
      }
    };
  }, [graphData, width, height, onNodeClick, onLinkClick, showLabels, enableZoom, enableDrag, 
      linkDistance, chargeStrength, collisionRadius, getNodeColor, getNodeSize, getLinkStyle]);

  // Update node colors when selection changes
  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.selectAll(".nodes circle")
        .attr("fill", getNodeColor);
    }
  }, [selectedNode, hoveredNode, getNodeColor]);

  if (!graphData.nodes.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No data available for force graph visualization
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Control Panel */}
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
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

      {/* Selected Node Info */}
      {selectedNode && (
        <Box sx={{ 
          position: 'absolute', 
          top: 10, 
          left: 10, 
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
          border: '1px solid #ddd', 
          borderRadius: '4px',
          backgroundColor: '#fafafa'
        }}
      />
    </Box>
  );
};

export default ForceGraphComponent;