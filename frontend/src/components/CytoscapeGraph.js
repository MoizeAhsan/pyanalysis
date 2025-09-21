import { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';

// Register layout extensions
cytoscape.use(dagre);
cytoscape.use(coseBilkent);

// Helper function to get children of a node
const getNodeChildren = (nodeId, elements) => {
  return elements
    .filter(el => el.data && el.data.source === nodeId)
    .map(edge => edge.data.target);
};

// Helper function to get all descendants of a node
const getAllDescendants = (nodeId, elements) => {
  const descendants = new Set();
  const queue = [nodeId];
  
  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = getNodeChildren(currentId, elements);
    
    children.forEach(childId => {
      if (!descendants.has(childId)) {
        descendants.add(childId);
        queue.push(childId);
      }
    });
  }
  
  return Array.from(descendants);
};

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
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [originalElements, setOriginalElements] = useState([]);

  // Function to toggle node collapse/expand
  const toggleNodeCollapse = useCallback((nodeId) => {
    setCollapsedNodes(prevCollapsed => {
      const newCollapsedNodes = new Set(prevCollapsed);
      
      if (prevCollapsed.has(nodeId)) {
        // Expand: remove from collapsed set
        newCollapsedNodes.delete(nodeId);
      } else {
        // Collapse: add to collapsed set
        newCollapsedNodes.add(nodeId);
      }
      
      return newCollapsedNodes;
    });
  }, []);

  // Function to filter elements based on collapsed state
  const getVisibleElements = useCallback((elements, collapsed) => {
    if (collapsed.size === 0) return elements;
    
    const hiddenNodes = new Set();
    
    // Find all nodes that should be hidden due to collapsed parents
    collapsed.forEach(collapsedNodeId => {
      const descendants = getAllDescendants(collapsedNodeId, elements);
      descendants.forEach(descendant => hiddenNodes.add(descendant));
    });
    
    // Filter out hidden nodes and their edges
    return elements.filter(el => {
      if (el.data) {
        // Hide nodes that are descendants of collapsed nodes
        if (hiddenNodes.has(el.data.id)) return false;
        
        // Hide edges connected to hidden nodes
        if (el.data.source && (hiddenNodes.has(el.data.source) || hiddenNodes.has(el.data.target))) {
          return false;
        }
      }
      return true;
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Store original elements
    setOriginalElements(elements);

    // Enhanced stylesheet with better visual differentiation and collapse indicators
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
          'font-weight': 'bold',
          'text-outline-width': 1,
          'text-outline-color': '#000',
          'text-wrap': 'wrap',
          'text-max-width': '90px',
          'width': '80px',
          'height': '80px',
          'border-width': 2,
          'border-color': '#fff',
          'transition-property': 'background-color, border-color, width, height',
          'transition-duration': '0.3s',
          'cursor': 'pointer'
        }
      },
      {
        selector: 'node[type="module"]',
        style: {
          'background-color': '#1976d2', // Blue for modules
          'shape': 'round-rectangle',
          'width': '100px',
          'height': '60px',
          'border-color': '#0d47a1',
          'font-size': '13px'
        }
      },
      {
        selector: 'node[type="class"]',
        style: {
          'background-color': '#388e3c', // Green for classes
          'shape': 'ellipse',
          'width': '85px',
          'height': '85px',
          'border-color': '#1b5e20',
          'font-size': '12px'
        }
      },
      {
        selector: 'node[type="function"]',
        style: {
          'background-color': '#f57c00', // Orange for functions
          'shape': 'diamond',
          'width': '75px',
          'height': '75px',
          'border-color': '#e65100',
          'font-size': '11px'
        }
      },
      // Collapsed node indicator
      {
        selector: 'node.collapsed',
        style: {
          'border-width': 4,
          'border-style': 'double',
          'border-color': '#ff5722',
          'background-color': function(ele) {
            const type = ele.data('type');
            if (type === 'module') return '#0d47a1';
            if (type === 'class') return '#1b5e20';
            if (type === 'function') return '#e65100';
            return '#424242';
          }
        }
      },
      // Expandable node indicator (has children)
      {
        selector: 'node.expandable',
        style: {
          'border-style': 'dashed'
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
          'border-width': 5,
          'border-color': '#f44336',
          'z-index': 999,
          'box-shadow': '0 0 20px rgba(244, 67, 54, 0.6)'
        }
      },
      {
        selector: 'node:hover',
        style: {
          'border-width': 4,
          'border-color': '#ffeb3b',
          'z-index': 998,
          'box-shadow': '0 0 15px rgba(255, 235, 59, 0.5)',
          'transform': 'scale(1.1)'
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
      },
      // Highlight connected nodes on hover
      {
        selector: 'node.highlighted',
        style: {
          'border-width': 3,
          'border-color': '#4caf50',
          'opacity': 1
        }
      },
      {
        selector: 'node.dimmed',
        style: {
          'opacity': 0.3
        }
      },
      {
        selector: 'edge.highlighted',
        style: {
          'width': 3,
          'line-color': '#4caf50',
          'target-arrow-color': '#4caf50',
          'opacity': 1
        }
      },
      {
        selector: 'edge.dimmed',
        style: {
          'opacity': 0.2
        }
      },
      // Hover highlight styles
      {
        selector: 'node.hover-highlight',
        style: {
          'border-width': 3,
          'border-color': '#2196f3',
          'opacity': 1
        }
      },
      {
        selector: 'edge.hover-highlight',
        style: {
          'width': 3,
          'line-color': '#2196f3',
          'target-arrow-color': '#2196f3',
          'opacity': 0.8
        }
      }
    ];

    // Get visible elements based on collapsed state
    const visibleElements = getVisibleElements(elements, collapsedNodes);
    
    // Add classes to nodes based on their state
    const elementsWithClasses = visibleElements.map(el => {
      if (el.data && !el.data.source && !el.data.target) { // It's a node
        const nodeId = el.data.id;
        const hasChildren = getNodeChildren(nodeId, elements).length > 0;
        const isCollapsed = collapsedNodes.has(nodeId);
        
        const classes = [];
        if (hasChildren) classes.push('expandable');
        if (isCollapsed) classes.push('collapsed');
        
        return {
          ...el,
          classes: classes.join(' ')
        };
      }
      return el;
    });

    // Initialize Cytoscape
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elementsWithClasses,
      style: [...defaultStylesheet, ...stylesheet],
      layout: {
        ...layout,
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 50
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: false,
      autounselectify: false
    });

    // Enhanced event listeners
    cyRef.current.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeData = node.data();
      
      // Check if this is a double-click for collapse/expand
      const now = Date.now();
      const lastClick = node.scratch('lastClick') || 0;
      
      if (now - lastClick < 300) { // Double click detected
        const hasChildren = getNodeChildren(nodeData.id, elements).length > 0;
        if (hasChildren) {
          toggleNodeCollapse(nodeData.id);
        }
      } else {
        // Single click - select node and show details
        onNodeClick(nodeData);
        
        // Highlight connected nodes
        const connectedEdges = node.connectedEdges();
        const connectedNodes = connectedEdges.connectedNodes();
        
        // Reset all highlighting
        cyRef.current.elements().removeClass('highlighted dimmed');
        
        // Highlight connected elements
        node.addClass('highlighted');
        connectedNodes.addClass('highlighted');
        connectedEdges.addClass('highlighted');
        
        // Dim non-connected elements
        cyRef.current.nodes().not(node).not(connectedNodes).addClass('dimmed');
        cyRef.current.edges().not(connectedEdges).addClass('dimmed');
      }
      
      node.scratch('lastClick', now);
    });

    cyRef.current.on('tap', 'edge', (event) => {
      const edge = event.target;
      onEdgeClick(edge.data());
      
      // Highlight edge and connected nodes
      cyRef.current.elements().removeClass('highlighted dimmed');
      edge.addClass('highlighted');
      edge.connectedNodes().addClass('highlighted');
      
      // Dim other elements
      cyRef.current.elements().not(edge).not(edge.connectedNodes()).addClass('dimmed');
    });

    // Clear highlighting when clicking on background
    cyRef.current.on('tap', (event) => {
      if (event.target === cyRef.current) {
        cyRef.current.elements().removeClass('highlighted dimmed');
      }
    });

    // Add hover effects for better interactivity
    cyRef.current.on('mouseover', 'node', (event) => {
      const node = event.target;
      if (!node.hasClass('highlighted')) {
        const connectedEdges = node.connectedEdges();
        const connectedNodes = connectedEdges.connectedNodes();
        
        node.addClass('hover-highlight');
        connectedNodes.addClass('hover-highlight');
        connectedEdges.addClass('hover-highlight');
      }
    });

    cyRef.current.on('mouseout', 'node', (event) => {
      const node = event.target;
      const connectedEdges = node.connectedEdges();
      const connectedNodes = connectedEdges.connectedNodes();
      
      node.removeClass('hover-highlight');
      connectedNodes.removeClass('hover-highlight');
      connectedEdges.removeClass('hover-highlight');
    });

    // Cleanup function
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [elements, layout, stylesheet, onNodeClick, onEdgeClick, collapsedNodes, toggleNodeCollapse, getVisibleElements]);

  // Update elements when they change or when collapsed state changes
  useEffect(() => {
    if (cyRef.current && originalElements.length > 0) {
      const visibleElements = getVisibleElements(originalElements, collapsedNodes);
      
      // Add classes to nodes based on their state
      const elementsWithClasses = visibleElements.map(el => {
        if (el.data && !el.data.source && !el.data.target) { // It's a node
          const nodeId = el.data.id;
          const hasChildren = getNodeChildren(nodeId, originalElements).length > 0;
          const isCollapsed = collapsedNodes.has(nodeId);
          
          const classes = [];
          if (hasChildren) classes.push('expandable');
          if (isCollapsed) classes.push('collapsed');
          
          return {
            ...el,
            classes: classes.join(' ')
          };
        }
        return el;
      });
      
      cyRef.current.elements().remove();
      cyRef.current.add(elementsWithClasses);
      cyRef.current.layout({
        ...layout,
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 50
      }).run();
    }
  }, [originalElements, layout, collapsedNodes, getVisibleElements]);

  return (
    <div 
      ref={containerRef} 
      style={style}
      className="cytoscape-container"
    />
  );
};

export default CytoscapeGraph;