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

    // Default stylesheet
    const defaultStylesheet = [
      {
        selector: 'node',
        style: {
          'background-color': '#666',
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': '#fff',
          'font-size': '12px',
          'width': '60px',
          'height': '60px'
        }
      },
      {
        selector: 'node[type="module"]',
        style: {
          'background-color': '#3f51b5',
          'shape': 'rectangle'
        }
      },
      {
        selector: 'node[type="class"]',
        style: {
          'background-color': '#4caf50',
          'shape': 'ellipse'
        }
      },
      {
        selector: 'node[type="function"]',
        style: {
          'background-color': '#ff9800',
          'shape': 'triangle'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#ccc',
          'target-arrow-color': '#ccc',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier'
        }
      },
      {
        selector: ':selected',
        style: {
          'border-width': 3,
          'border-color': '#f44336'
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