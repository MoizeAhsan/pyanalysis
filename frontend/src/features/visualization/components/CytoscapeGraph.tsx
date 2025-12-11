import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { ZoomIn, ZoomOut, CenterFocusStrong, Fullscreen, FullscreenExit } from '@mui/icons-material';

// Lazy load cytoscape (built-in layouts only - no extensions needed)
let cytoscapeInstance: any = null;

const loadCytoscape = async () => {
  // Return cached instance if already loaded
  if (cytoscapeInstance) {
    return cytoscapeInstance;
  }

  const { default: cytoscape } = await import('cytoscape');
  cytoscapeInstance = cytoscape;
  return cytoscape;
};

export interface CytoscapeElement {
  data: {
    id: string;
    label?: string;
    name?: string;
    type?: string;
    source?: string;
    target?: string;
    relationship_type?: string;
    [key: string]: any;
  };
  classes?: string;
}

export interface CytoscapeLayout {
  name: string;
  animate?: boolean;
  animationDuration?: number;
  fit?: boolean;
  padding?: number;
  [key: string]: any;
}

interface CytoscapeGraphProps {
  elements: CytoscapeElement[];
  style?: React.CSSProperties;
  layout?: CytoscapeLayout;
  stylesheet?: any[];
  onNodeClick?: (nodeData: any) => void;
  onEdgeClick?: (edgeData: any) => void;
  enableCollapse?: boolean;
  showControls?: boolean;
}

const CytoscapeGraph: React.FC<CytoscapeGraphProps> = ({
  elements = [],
  style = { width: '100%', height: '400px' },
  layout = { name: 'dagre' },
  stylesheet = [],
  onNodeClick = () => {},
  onEdgeClick = () => {},
  enableCollapse = true,
  showControls = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper functions
  const getNodeChildren = useCallback((nodeId: string, elements: CytoscapeElement[]) => {
    return elements
      .filter(el => el.data && el.data.source === nodeId)
      .map(edge => edge.data.target!);
  }, []);

  const getAllDescendants = useCallback((nodeId: string, elements: CytoscapeElement[]) => {
    const descendants = new Set<string>();
    const queue = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = getNodeChildren(currentId, elements);

      children.forEach(childId => {
        if (!descendants.has(childId)) {
          descendants.add(childId);
          queue.push(childId);
        }
      });
    }

    return Array.from(descendants);
  }, [getNodeChildren]);

  const toggleNodeCollapse = useCallback((nodeId: string) => {
    if (!enableCollapse) return;

    setCollapsedNodes(prevCollapsed => {
      const newCollapsedNodes = new Set(prevCollapsed);

      if (prevCollapsed.has(nodeId)) {
        newCollapsedNodes.delete(nodeId);
      } else {
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
      setTimeout(() => {
        setZoomLevel(cyRef.current.zoom());
      }, 100);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const getVisibleElements = useCallback((elements: CytoscapeElement[], collapsed: Set<string>) => {
    if (collapsed.size === 0) return elements;

    const hiddenNodes = new Set<string>();

    collapsed.forEach(collapsedNodeId => {
      const descendants = getAllDescendants(collapsedNodeId, elements);
      descendants.forEach(descendant => hiddenNodes.add(descendant));
    });

    return elements.filter(el => {
      if (el.data) {
        if (hiddenNodes.has(el.data.id)) return false;
        if (el.data.source && (hiddenNodes.has(el.data.source) || hiddenNodes.has(el.data.target!))) {
          return false;
        }
      }
      return true;
    });
  }, [getAllDescendants]);

  // Initialize cytoscape
  useEffect(() => {
    let mounted = true;

    const initializeCytoscape = async () => {
      if (!containerRef.current) {
        // Container might not be ready yet, retry after a short delay
        setTimeout(() => {
          if (mounted && containerRef.current) {
            initializeCytoscape();
          }
        }, 100);
        return;
      }

      // Don't initialize with empty elements
      if (!elements || elements.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const cytoscape = await loadCytoscape();

        if (!mounted || !containerRef.current) return;

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
              'background-color': '#1976d2',
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
              'background-color': '#388e3c',
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
              'background-color': '#f57c00',
              'shape': 'diamond',
              'width': '75px',
              'height': '75px',
              'border-color': '#e65100',
              'font-size': '11px'
            }
          },
          {
            selector: 'node.collapsed',
            style: {
              'border-width': 4,
              'border-style': 'double',
              'border-color': '#ff5722'
            }
          },
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
              'opacity': 0.7
            }
          },
          {
            selector: ':selected',
            style: {
              'border-width': 5,
              'border-color': '#f44336',
              'z-index': 999
            }
          }
        ];

        const visibleElements = getVisibleElements(elements, collapsedNodes);
        const elementsWithClasses = visibleElements.map(el => {
          if (el.data && !el.data.source && !el.data.target) {
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

        // Use safe layout - map to built-in layouts only
        // Built-in: grid, circle, concentric, breadthfirst, cose, random, preset, null
        const layoutMap: Record<string, string> = {
          'cose-bilkent': 'cose',
          'dagre': 'breadthfirst',  // breadthfirst is similar to dagre's tree layout
        };
        const safeLayoutName = layoutMap[layout.name] || layout.name;
        const safeLayout = { ...layout, name: safeLayoutName };

        cyRef.current = cytoscape({
          container: containerRef.current,
          elements: elementsWithClasses,
          style: [...defaultStylesheet, ...stylesheet],
          layout: {
            ...safeLayout,
            animationDuration: 500,
            fit: true,
            padding: 50
          } as any,
          userZoomingEnabled: true,
          userPanningEnabled: true,
          boxSelectionEnabled: false,
          autoungrabify: false,
          autounselectify: false
        });

        // Event listeners
        let clickTimeout: NodeJS.Timeout;
        cyRef.current.on('tap', 'node', (event: any) => {
          const node = event.target;
          const nodeData = node.data();

          clearTimeout(clickTimeout);

          const now = Date.now();
          const lastClick = node.scratch('lastClick') || 0;
          const timeDiff = now - lastClick;

          if (timeDiff < 400 && enableCollapse) {
            const hasChildren = getNodeChildren(nodeData.id, elements).length > 0;
            if (hasChildren) {
              toggleNodeCollapse(nodeData.id);
              node.scratch('lastClick', 0);
              return;
            }
          }

          clickTimeout = setTimeout(() => {
            onNodeClick(nodeData);
            
            const connectedEdges = node.connectedEdges();
            const connectedNodes = connectedEdges.connectedNodes();

            cyRef.current.elements().removeClass('highlighted dimmed');
            node.addClass('highlighted');
            connectedNodes.addClass('highlighted');
            connectedEdges.addClass('highlighted');

            cyRef.current.nodes().not(node).not(connectedNodes).addClass('dimmed');
            cyRef.current.edges().not(connectedEdges).addClass('dimmed');
          }, 200);

          node.scratch('lastClick', now);
        });

        cyRef.current.on('tap', 'edge', (event: any) => {
          const edge = event.target;
          onEdgeClick(edge.data());
        });

        cyRef.current.on('tap', (event: any) => {
          if (event.target === cyRef.current) {
            cyRef.current.elements().removeClass('highlighted dimmed');
          }
        });

        cyRef.current.one('layoutstop', () => {
          setZoomLevel(cyRef.current.zoom());
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize Cytoscape:', err);
        setError('Failed to load visualization library');
        setIsLoading(false);
      }
    };

    initializeCytoscape();

    return () => {
      mounted = false;
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
    // Only re-initialize when elements array identity changes or layout changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, layout.name]);

  // Update elements when collapsed state changes (not for element changes - that triggers reinit)
  useEffect(() => {
    if (!cyRef.current || isLoading || collapsedNodes.size === 0) return;

    const visibleElements = getVisibleElements(elements, collapsedNodes);
    const elementsWithClasses = visibleElements.map(el => {
      if (el.data && !el.data.source && !el.data.target) {
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

    const currentZoom = cyRef.current.zoom();
    const currentPan = cyRef.current.pan();

    cyRef.current.elements().remove();
    cyRef.current.add(elementsWithClasses);

    const layoutInstance = cyRef.current.layout({
      ...layout,
      animate: true,
      animationDuration: 500,
      fit: false,
      padding: 50
    });

    layoutInstance.run();

    layoutInstance.one('layoutstop', () => {
      if (cyRef.current) {
        cyRef.current.zoom(currentZoom);
        cyRef.current.pan(currentPan);
      }
    });
  }, [collapsedNodes, getVisibleElements, getNodeChildren, isLoading]);

  if (error) {
    return (
      <Box sx={{ ...(style as any), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Show message when no elements provided
  if (!elements || elements.length === 0) {
    return (
      <Box sx={{ ...(style as any), display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
        <Typography variant="h6" color="text.secondary">No data to visualize</Typography>
        <Typography variant="body2" color="text.secondary">Analyze a project to see the visualization</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      position: 'relative',
      ...(style as any),
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
      {/* Loading overlay - shown on top of container while loading */}
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
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1001
        }}>
          <Typography>Loading visualization...</Typography>
        </Box>
      )}

      {showControls && !isLoading && (
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

      {enableCollapse && showControls && !isLoading && (
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