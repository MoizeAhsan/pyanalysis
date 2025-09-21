import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Box, Typography } from '@mui/material';

const ForceGraphComponent = ({ 
  graphData = { nodes: [], links: [] },
  width = 800,
  height = 600,
  onNodeClick = () => {},
  onLinkClick = () => {}
}) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!graphData.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous content

    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Create links
    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(graphData.links)
      .join("line")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => onLinkClick(d));

    // Create nodes
    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(graphData.nodes)
      .join("circle")
      .attr("r", 8)
      .attr("fill", d => {
        switch (d.type) {
          case 'module': return '#3f51b5';
          case 'class': return '#4caf50';
          case 'function': return '#ff9800';
          default: return '#666';
        }
      })
      .style("cursor", "pointer")
      .on("click", (event, d) => onNodeClick(d))
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Add labels
    const label = svg.append("g")
      .selectAll("text")
      .data(graphData.nodes)
      .join("text")
      .text(d => d.name)
      .attr("font-size", "12px")
      .attr("dx", 12)
      .attr("dy", 4)
      .style("pointer-events", "none");

    // Add title tooltips
    node.append("title")
      .text(d => `${d.name} (${d.type})`);

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      label
        .attr("x", d => d.x)
        .attr("y", d => d.y);
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
      simulation.stop();
    };
  }, [graphData, width, height, onNodeClick, onLinkClick]);

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
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ border: '1px solid #ddd', borderRadius: '4px' }}
    />
  );
};

export default ForceGraphComponent;