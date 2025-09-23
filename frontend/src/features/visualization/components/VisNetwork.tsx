import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';

// Lazy load vis-network
const loadVisNetwork = async () => {
  const { Network } = await import('vis-network');
  return { Network };
};

export interface VisNode {
  id: string;
  label?: string;
  name?: string;
  type?: string;
  color?: string;
  shape?: string;
  size?: number;
  [key: string]: any;
}

export interface VisEdge {
  id?: string;
  from: string;
  to: string;
  source?: string;
  target?: string;
  label?: string;
  color?: string;
  width?: number;
  [key: string]: any;
}

interface VisNetworkProps {
  nodes: VisNode[];
  edges: VisEdge[];
  options?: any;
  onNodeClick?: (node: VisNode) => void;
  onEdgeClick?: (edge: VisEdge) => void;
  style?: React.CSSProperties;
}

const VisNetwork: React.FC<VisNetworkProps> = ({
  nodes = [],
  edges = [],
  options = {},
  onNodeClick = () => {},
  onEdgeClick = () => {},
  style = { width: '100%', height: '400px' }
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getNodeColor = (type?: string): string => {
    switch (type) {
      case 'module': return '#1976d2';
      case 'class': return '#388e3c';
      case 'function': return '#f57c00';
      case 'variable': return '#7b1fa2';
      default: return '#616161';
    }
  };

  const getNodeShape = (type?: string): string => {
    switch (type) {
      case 'module': return 'box';
      case 'class': return 'ellipse';
      case 'function': return 'triangle';
      case 'variable': return 'diamond';
      default: return 'dot';
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeNetwork = async () => {
      if (!containerRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        const { Network } = await loadVisNetwork();

        if (!mounted) return;

        const defaultOptions = {
          nodes: {
            shape: 'dot',
            size: 16,
            font: {
              size: 12,
              color: '#000000',
              strokeWidth: 2,
              strokeColor: '#ffffff'
            },
            borderWidth: 2,
            shadow: {
              enabled: true,
              color: 'rgba(0,0,0,0.2)',
              size: 5,
              x: 2,
              y: 2
            },
            chosen: {
              node: (values: any, _id: string, selected: boolean, hovering: boolean) => {
                if (selected || hovering) {
                  values.borderWidth = 4;
                  values.borderColor = '#f44336';
                  values.shadow = true;
                  values.shadowSize = 10;
                }
              }
            }
          },
          edges: {
            width: 2,
            shadow: {
              enabled: true,
              color: 'rgba(0,0,0,0.1)',
              size: 3,
              x: 1,
              y: 1
            },
            arrows: {
              to: { 
                enabled: true, 
                scaleFactor: 1.2, 
                type: 'arrow' 
              }
            },
            smooth: {
              enabled: true,
              type: 'dynamic',
              roundness: 0.5
            },
            chosen: {
              edge: (values: any, _id: string, selected: boolean, hovering: boolean) => {
                if (selected || hovering) {
                  values.width = 4;
                  values.color = '#f44336';
                  values.shadow = true;
                }
              }
            }
          },
          physics: {
            enabled: true,
            stabilization: { 
              iterations: 200,
              updateInterval: 25
            },
            barnesHut: {
              gravitationalConstant: -8000,
              centralGravity: 0.3,
              springLength: 120,
              springConstant: 0.04,
              damping: 0.09,
              avoidOverlap: 0.1
            }
          },
          interaction: {
            dragNodes: true,
            dragView: true,
            zoomView: true,
            selectConnectedEdges: true,
            hover: true,
            hoverConnectedEdges: true,
            tooltipDelay: 200
          },
          layout: {
            improvedLayout: true,
            clusterThreshold: 150,
            hierarchical: {
              enabled: false,
              levelSeparation: 150,
              nodeSpacing: 100,
              treeSpacing: 200,
              blockShifting: true,
              edgeMinimization: true,
              parentCentralization: true,
              direction: 'UD',
              sortMethod: 'hubsize'
            }
          }
        };

        // Process nodes with enhanced styling
        const processedNodes = nodes.map((node: VisNode) => {
          const baseNode = {
            id: node.id,
            label: node.name || node.label || node.id,
            color: {
              background: node.color || getNodeColor(node.type),
              border: node.color ? '#ffffff' : '#ffffff',
              highlight: {
                background: '#ff9800',
                border: '#f57c00'
              },
              hover: {
                background: '#ffcc80',
                border: '#ff9800'
              }
            },
            shape: node.shape || getNodeShape(node.type),
            size: node.size || (node.type === 'module' ? 25 : node.type === 'class' ? 20 : 15),
            title: `${node.name || node.id} (${node.type || 'unknown'})${
              node.file_path ? `\nFile: ${node.file_path}` : ''
            }${
              node.docstring ? `\n${node.docstring.substring(0, 100)}...` : ''
            }`
          };
          return { ...baseNode, ...node };
        });

        // Process edges with enhanced styling
        const processedEdges = edges.map((edge: VisEdge, index: number) => {
          const baseEdge = {
            id: edge.id || `edge-${index}`,
            from: edge.source || edge.from,
            to: edge.target || edge.to,
            label: edge.label || edge.relationship_type || edge.type,
            color: {
              color: edge.color || (
                edge.relationship_type === 'imports' ? '#2196f3' :
                edge.relationship_type === 'calls' ? '#ff9800' :
                edge.relationship_type === 'contains' ? '#4caf50' :
                edge.relationship_type === 'inherits' ? '#9c27b0' :
                '#999999'
              ),
              highlight: '#f44336',
              hover: '#ff9800',
              inherit: false
            },
            width: edge.width || (
              edge.relationship_type === 'contains' ? 3 :
              edge.relationship_type === 'inherits' ? 3 :
              2
            ),
            dashes: edge.relationship_type === 'contains' ? [5, 5] : false,
            title: `${edge.relationship_type || edge.type || 'relationship'}${
              edge.weight ? ` (weight: ${edge.weight})` : ''
            }`
          };
          return { ...baseEdge, ...edge };
        });

        const data = {
          nodes: processedNodes,
          edges: processedEdges
        };

        const mergedOptions = {
          ...defaultOptions,
          ...options
        };

        networkRef.current = new Network(
          containerRef.current,
          data,
          mergedOptions
        );

        // Enhanced event listeners
        networkRef.current.on('click', (params: any) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = nodes.find((n: VisNode) => n.id === nodeId);
            if (node) {
              onNodeClick(node);
            }
          } else if (params.edges.length > 0) {
            const edgeId = params.edges[0];
            const edge = edges.find((e: VisEdge) => (e.id || `edge-${edges.indexOf(e)}`) === edgeId);
            if (edge) {
              onEdgeClick(edge);
            }
          }
        });

        // Add stabilization progress feedback
        networkRef.current.on('stabilizationProgress', (_params: any) => {
          // Could emit progress events here if needed
        });

        networkRef.current.on('stabilizationIterationsDone', () => {
          // Stabilization complete
          setIsLoading(false);
        });

        // Handle hover effects
        networkRef.current.on('hoverNode', (_params: any) => {
          // Could add custom hover effects here
        });

        networkRef.current.on('blurNode', (_params: any) => {
          // Could add custom blur effects here
        });

        // Handle selection changes
        networkRef.current.on('selectNode', (_params: any) => {
          // Could add custom selection effects here
        });

        networkRef.current.on('deselectNode', (_params: any) => {
          // Could add custom deselection effects here
        });

        // Set loading to false after a short delay if stabilization doesn't complete
        setTimeout(() => {
          if (mounted) {
            setIsLoading(false);
          }
        }, 3000);

      } catch (err) {
        console.error('Failed to initialize Vis Network:', err);
        setError('Failed to load visualization library');
        setIsLoading(false);
      }
    };

    initializeNetwork();

    return () => {
      mounted = false;
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [nodes, edges, options, onNodeClick, onEdgeClick]);

  if (error) {
    return (
      <Box sx={{ ...(style as any), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ ...(style as any), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>Loading network visualization...</Typography>
      </Box>
    );
  }

  if (!nodes.length) {
    return (
      <Box sx={{ ...(style as any), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No data available for network visualization
        </Typography>
      </Box>
    );
  }

  return (
    <div 
      ref={containerRef} 
      style={style}
      className="vis-network-container"
    />
  );
};

export default VisNetwork;