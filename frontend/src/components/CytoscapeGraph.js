import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';

// Register layout extensions
cytoscape.use(dagre);
cytoscape.use(coseBilkent);

const CytoscapeGraph = ({ 
  elements = [], 
  style = { width: '100%', height: '400px' },
  layout = { name: 'dagre' },
  stylesheet = [],
  onNodeClick = () => {},
  onEdgeClick = () => {}
}) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Enhanced stylesheet with better visual differentiation
    const defaultStylesheet = [
      {
        selector: 'node',
        style: {
          'background-color': '#666',
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': '#fff',
          'font-size': '11px',
          'font-weight': 'bold',
          'text-outline-width': 1,
          'text-outline-color': '#000',
          'text-wrap': 'wrap',
          'text-max-width': '80px',
          'width': '70px',
          'height': '70px',
          'border-width': 2,
          'border-color': '#fff',
          'transition-property': 'background-color, border-color, width, height',
          'transition-duration': '0.3s'
        }
      },
      {
        selector: 'node[type="module"]',
        style: {
          'background-color': '#1976d2', // Blue for modules
          'shape': 'round-rectangle',
          'width': '80px',
          'height': '50px',
          'border-color': '#0d47a1'
        }
      },
      {
        selector: 'node[type="class"]',
        style: {
          'background-color': '#388e3c', // Green for classes
          'shape': 'ellipse',
          'width': '75px',
          'height': '75px',
          'border-color': '#1b5e20'
        }
      },
      {
        selector: 'node[type="function"]',
        style: {
          'background-color': '#f57c00', // Orange for functions
          'shape': 'diamond',
          'width': '65px',
          'height': '65px',
          'border-color': '#e65100'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#90a4ae',
          'target-arrow-color': '#90a4ae',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'opacity': 0.7,
          'transition-property': 'line-color, target-arrow-color, width',
          'transition-duration': '0.3s'
        }
      },
      {
        selector: 'edge[relationship_type="contains"]',
        style: {
          'line-color': '#4caf50',
          'target-arrow-color': '#4caf50',
          'line-style': 'dashed'
        }
      },
      {
        selector: 'edge[relationship_type="imports"]',
        style: {
          'line-color': '#2196f3',
          'target-arrow-color': '#2196f3'
        }
      },
      {
        selector: 'edge[relationship_type="calls"]',
        style: {
          'line-color': '#ff9800',
          'target-arrow-color': '#ff9800'
        }
      },
      {
        selector: ':selected',
        style: {
          'border-width': 4,
          'border-color': '#f44336',
          'z-index': 999
        }
      },
      {
        selector: 'node:hover',
        style: {
          'border-width': 3,
          'border-color': '#ffeb3b',
          'z-index': 998
        }
      },
      {
        selector: 'edge:hover',
        style: {
          'width': 4,
          'line-color': '#f44336',
          'target-arrow-color': '#f44336',
          'opacity': 1,
          'z-index': 997
        }
      }
    ];

    // Initialize Cytoscape
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [...defaultStylesheet, ...stylesheet],
      layout: layout,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: false,
      autounselectify: false
    });

    // Add event listeners
    cyRef.current.on('tap', 'node', (event) => {
      const node = event.target;
      onNodeClick(node.data());
    });

    cyRef.current.on('tap', 'edge', (event) => {
      const edge = event.target;
      onEdgeClick(edge.data());
    });

    // Cleanup function
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [elements, layout, stylesheet, onNodeClick, onEdgeClick]);

  // Update elements when they change
  useEffect(() => {
    if (cyRef.current && elements) {
      cyRef.current.elements().remove();
      cyRef.current.add(elements);
      cyRef.current.layout(layout).run();
    }
  }, [elements, layout]);

  return (
    <div 
      ref={containerRef} 
      style={style}
      className="cytoscape-container"
    />
  );
};

export default CytoscapeGraph;