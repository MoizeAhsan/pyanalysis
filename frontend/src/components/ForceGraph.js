import React, { useCallback } from 'react';
import { ForceGraph2D } from 'react-force-graph';

const ForceGraphComponent = ({ 
  graphData = { nodes: [], links: [] },
  width = 800,
  height = 600,
  onNodeClick = () => {},
  onLinkClick = () => {}
}) => {
  const handleNodeClick = useCallback((node) => {
    onNodeClick(node);
  }, [onNodeClick]);

  const handleLinkClick = useCallback((link) => {
    onLinkClick(link);
  }, [onLinkClick]);

  const nodeColor = useCallback((node) => {
    switch (node.type) {
      case 'module': return '#3f51b5';
      case 'class': return '#4caf50';
      case 'function': return '#ff9800';
      default: return '#666';
    }
  }, []);

  const nodeLabel = useCallback((node) => {
    return `${node.name} (${node.type})`;
  }, []);

  return (
    <ForceGraph2D
      graphData={graphData}
      width={width}
      height={height}
      nodeColor={nodeColor}
      nodeLabel={nodeLabel}
      nodeRelSize={6}
      linkDirectionalArrowLength={3.5}
      linkDirectionalArrowRelPos={1}
      linkCurvature={0.25}
      onNodeClick={handleNodeClick}
      onLinkClick={handleLinkClick}
      enableNodeDrag={true}
      enableZoomInteraction={true}
      enablePanInteraction={true}
      cooldownTicks={100}
      d3AlphaDecay={0.0228}
      d3VelocityDecay={0.4}
    />
  );
};

export default ForceGraphComponent;