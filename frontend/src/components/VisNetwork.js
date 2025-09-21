import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network';

const VisNetworkComponent = ({ 
  nodes = [],
  edges = [],
  options = {},
  onNodeClick = () => {},
  onEdgeClick = () => {},
  style = { width: '100%', height: '400px' }
}) => {
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const defaultOptions = {
      nodes: {
        shape: 'dot',
        size: 16,
        font: {
          size: 12,
          color: '#000000'
        },
        borderWidth: 2,
        shadow: true
      },
      edges: {
        width: 2,
        shadow: true,
        arrows: {
          to: { enabled: true, scaleFactor: 1, type: 'arrow' }
        }
      },
      physics: {
        enabled: true,
        stabilization: { iterations: 100 }
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true
      },
      layout: {
        improvedLayout: true
      }
    };

    const data = {
      nodes: nodes.map(node => ({
        id: node.id,
        label: node.name || node.label,
        color: getNodeColor(node.type),
        shape: getNodeShape(node.type),
        ...node
      })),
      edges: edges.map(edge => ({
        from: edge.source || edge.from,
        to: edge.target || edge.to,
        label: edge.label,
        ...edge
      }))
    };

    networkRef.current = new Network(
      containerRef.current,
      data,
      { ...defaultOptions, ...options }
    );

    // Add event listeners
    networkRef.current.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = nodes.find(n => n.id === nodeId);
        onNodeClick(node);
      } else if (params.edges.length > 0) {
        const edgeId = params.edges[0];
        const edge = edges.find(e => e.id === edgeId);
        onEdgeClick(edge);
      }
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
    };
  }, [nodes, edges, options, onNodeClick, onEdgeClick]);

  const getNodeColor = (type) => {
    switch (type) {
      case 'module': return '#3f51b5';
      case 'class': return '#4caf50';
      case 'function': return '#ff9800';
      default: return '#666';
    }
  };

  const getNodeShape = (type) => {
    switch (type) {
      case 'module': return 'box';
      case 'class': return 'ellipse';
      case 'function': return 'triangle';
      default: return 'dot';
    }
  };

  return (
    <div 
      ref={containerRef} 
      style={style}
      className="vis-network-container"
    />
  );
};

export default VisNetworkComponent;