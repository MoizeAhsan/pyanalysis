import { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { ZoomIn, ZoomOut, CenterFocusStrong, Fullscreen, FullscreenExit } from '@mui/icons-material';

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
  onNodeClick = () => { },
  onEdgeClick = () => { },
  enableCollapse = true,
  showControls = true
}) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Function to toggle node collapse/expand
  const toggleNodeCollapse = useCallback((nodeId) => {
    if (!enableCollapse) return;

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
  }, [enableCollapse]);

  // Control functions
  const handleZoomIn = useCallback(() => {
    if (cyRef.current) {
      const newZoom = cyRef.current.zoom() * 1.25;
      cyRef.current.zoom(newZoom);
      cyRef.current.center();
      setZoomLevel(newZoom);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (cyRef.current) {
      const newZoom = cyRef.current.zoom() * 0.8;
      cyRef.current.zoom(newZoom);
      cyRef.current.center();
      setZoomLevel(newZoom);
    }
  }, []);

  const handleFit = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.fit();
      // Use setTimeout to get the zoom level after fit completes
      setTimeout(() => {
        setZoomLevel(cyRef.current.zoom());
      }, 100);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
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

  // Initialize cytoscape only once
  useEffect(() => {
    if (!containerRef.current || cyRef.current) return;

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
          'background-color': function (ele) {
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
        fit: true, // Fit on initial load
        padding: 50
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: false,
      autounselectify: false
    });

    // Enhanced event listeners with better double-click detection
    let clickTimeout;
    cyRef.current.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeData = node.data();

      // Clear any existing timeout
      clearTimeout(clickTimeout);

      // Check if this is a double-click for collapse/expand
      const now = Date.now();
      const lastClick = node.scratch('lastClick') || 0;
      const timeDiff = now - lastClick;

      if (timeDiff < 400 && enableCollapse) { // Double click detected
        const hasChildren = getNodeChildren(nodeData.id, elements).length > 0;
        if (hasChildren) {
          toggleNodeCollapse(nodeData.id);
          // Don't process as single click
          node.scratch('lastClick', 0); // Reset to prevent triple-click issues
          return;
        }
      }

      // Set timeout for single click to avoid interference with double-click
      clickTimeout = setTimeout(() => {
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
      }, 200); // Wait 200ms to see if it's a double-click

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

    // Set initial zoom level after layout completes
    cyRef.current.one('layoutstop', () => {
      setZoomLevel(cyRef.current.zoom());
    });



    // Cleanup function
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Separate effect for zoom tracking
  useEffect(() => {
    if (!cyRef.current) return;

    let zoomTimeout;
    const handleZoomChange = () => {
      clearTimeout(zoomTimeout);
      zoomTimeout = setTimeout(() => {
        if (cyRef.current) {
          setZoomLevel(cyRef.current.zoom());
        }
      }, 100);
    };

    cyRef.current.on('zoom pan', handleZoomChange);

    return () => {
      clearTimeout(zoomTimeout);
      if (cyRef.current) {
        cyRef.current.off('zoom pan', handleZoomChange);
      }
    };
  }, []);

  // Update elements when they change (but not on every collapsed node change)
  useEffect(() => {
    if (!cyRef.current) return;

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

    // Store current zoom and pan before updating elements
    const currentZoom = cyRef.current.zoom();
    const currentPan = cyRef.current.pan();

    cyRef.current.elements().remove();
    cyRef.current.add(elementsWithClasses);

    // Run layout without fitting to preserve zoom level
    const layoutInstance = cyRef.current.layout({
      ...layout,
      animate: true,
      animationDuration: 500,
      fit: false, // Don't fit to preserve zoom
      padding: 50
    });

    layoutInstance.run();

    // Restore zoom and pan after layout completes
    layoutInstance.one('layoutstop', () => {
      if (cyRef.current) {
        cyRef.current.zoom(currentZoom);
        cyRef.current.pan(currentPan);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, layout]); // Removed collapsedNodes from dependencies to prevent view resets

  // Separate effect to handle collapsed nodes changes without full re-render
  useEffect(() => {
    if (!cyRef.current) return;

    // Get all visible elements based on current collapsed state
    const visibleElements = getVisibleElements(elements, collapsedNodes);

    // Create sets for quick lookup
    const visibleNodeIds = new Set(visibleElements
      .filter(el => el.data && !el.data.source && !el.data.target)
      .map(el => el.data.id));

    const visibleEdgeIds = new Set(visibleElements
      .filter(el => el.data && el.data.source && el.data.target)
      .map(el => el.data.id));

    // Get current nodes and edges in cytoscape
    const currentNodeIds = new Set();
    const currentEdgeIds = new Set();

    cyRef.current.nodes().forEach(node => currentNodeIds.add(node.id()));
    cyRef.current.edges().forEach(edge => currentEdgeIds.add(edge.id()));

    // Add missing nodes (for expand operation)
    visibleElements.forEach(el => {
      if (el.data && !el.data.source && !el.data.target) { // It's a node
        if (!currentNodeIds.has(el.data.id)) {
          // Add missing node
          const nodeId = el.data.id;
          const hasChildren = getNodeChildren(nodeId, elements).length > 0;
          const isCollapsed = collapsedNodes.has(nodeId);

          const classes = [];
          if (hasChildren) classes.push('expandable');
          if (isCollapsed) classes.push('collapsed');

          cyRef.current.add({
            ...el,
            classes: classes.join(' ')
          });
        }
      } else if (el.data && el.data.source && el.data.target) { // It's an edge
        if (!currentEdgeIds.has(el.data.id)) {
          // Add missing edge
          cyRef.current.add(el);
        }
      }
    });

    // Update classes and visibility for all nodes
    cyRef.current.nodes().forEach(node => {
      const nodeId = node.id();
      const hasChildren = getNodeChildren(nodeId, elements).length > 0;
      const isCollapsed = collapsedNodes.has(nodeId);

      // Remove existing classes
      node.removeClass('expandable collapsed');

      // Add appropriate classes
      if (hasChildren) node.addClass('expandable');
      if (isCollapsed) node.addClass('collapsed');

      // Show/hide based on visibility
      if (visibleNodeIds.has(nodeId)) {
        node.style('display', 'element');
      } else {
        node.style('display', 'none');
      }
    });

    // Update visibility for all edges
    cyRef.current.edges().forEach(edge => {
      const edgeId = edge.id();
      const sourceId = edge.source().id();
      const targetId = edge.target().id();

      // Show edge if both nodes are visible and edge should be visible
      if (visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId) && visibleEdgeIds.has(edgeId)) {
        edge.style('display', 'element');
      } else {
        edge.style('display', 'none');
      }
    });

    // Run a quick layout update to position new nodes properly
    if (cyRef.current.nodes(':visible').length > 0) {
      const currentZoom = cyRef.current.zoom();
      const currentPan = cyRef.current.pan();

      const layoutInstance = cyRef.current.layout({
        ...layout,
        animate: true,
        animationDuration: 300,
        fit: false,
        padding: 30
      });

      layoutInstance.run();

      // Restore zoom and pan after layout
      layoutInstance.one('layoutstop', () => {
        if (cyRef.current) {
          cyRef.current.zoom(currentZoom);
          cyRef.current.pan(currentPan);
        }
      });
    }

  }, [collapsedNodes, elements, getVisibleElements, layout]);

  return (
    <Box sx={{
      position: 'relative',
      ...style,
      ...(isFullscreen && {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        backgroundColor: 'white'
      })
    }}>
      {/* Control Panel */}
      {showControls && (
        <Box sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 1,
          p: 1,
          boxShadow: 2
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
          <Tooltip title="Fit to View">
            <IconButton size="small" onClick={handleFit}>
              <CenterFocusStrong />
            </IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton size="small" onClick={toggleFullscreen}>
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
          <Typography variant="caption" sx={{ textAlign: 'center', mt: 1, fontSize: '0.7rem' }}>
            {Math.round(zoomLevel * 100)}%
          </Typography>
        </Box>
      )}

      {/* Collapse Instructions */}
      {enableCollapse && showControls && (
        <Box sx={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 1,
          p: 1,
          fontSize: '0.75rem',
          color: 'text.secondary'
        }}>
          <Typography variant="caption">
            Double-click nodes to collapse/expand
          </Typography>
        </Box>
      )}

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: isFullscreen ? '100vh' : '400px'
        }}
        className="cytoscape-container"
      />
    </Box>
  );
};

export default CytoscapeGraph;