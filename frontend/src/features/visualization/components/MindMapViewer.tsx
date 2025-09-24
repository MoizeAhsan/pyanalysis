import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  AccountTree,
  BubbleChart,
  Hub,
  Description,
  Class,
  Functions,
  Fullscreen,
  FullscreenExit,
  Refresh,
  Download
} from '@mui/icons-material';
import {
  LazyCytoscapeGraph,
  LazyForceGraph,
  LazyVisNetwork,
  VisualizationWrapper
} from './index';
import ExportDialog from './ExportDialog';
import FullscreenViewer from './FullscreenViewer';
import type {
  CytoscapeElement,
  ForceGraphData,
  VisNode,
  VisEdge
} from './index';

import type { AnalysisData } from '@shared/types';

interface MindMapViewerProps {
  data?: AnalysisData | null;
}

type GraphType = 'cytoscape' | 'force' | 'vis';
type LayoutType = 'cose-bilkent' | 'dagre' | 'breadthfirst' | 'circle' | 'grid' | 'concentric';

const MindMapViewer: React.FC<MindMapViewerProps> = memo(({ data }) => {
  const theme = useTheme();
  const [graphType, setGraphType] = useState<GraphType>('cytoscape');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [layoutType, setLayoutType] = useState<LayoutType>('cose-bilkent');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [visualizationElement, setVisualizationElement] = useState<HTMLElement | null>(null);

  const handleGraphTypeChange = useCallback((_: React.MouseEvent<HTMLElement>, newType: string | null) => {
    if (newType !== null) {
      setGraphType(newType as GraphType);
      setSelectedNode(null);
    }
  }, []);

  const handleNodeClick = useCallback((nodeData: any) => {
    setSelectedNode(nodeData);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setSelectedNode(null);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const handleExport = useCallback(() => {
    setShowExportDialog(true);
  }, []);

  const handleCloseExportDialog = useCallback(() => {
    setShowExportDialog(false);
  }, []);

  // Enhanced layout configuration with theme-aware settings
  const getLayoutConfig = useCallback((layoutName: LayoutType) => {
    const baseConfig = {
      animate: true,
      animationDuration: 800,
      fit: true,
      padding: 60
    };

    switch (layoutName) {
      case 'cose-bilkent':
        return {
          ...baseConfig,
          name: 'cose-bilkent',
          nodeRepulsion: 8000,
          idealEdgeLength: 120,
          edgeElasticity: 0.3,
          nestingFactor: 0.2,
          gravity: 0.4,
          numIter: 3000,
          tile: true,
          tilingPaddingVertical: 15,
          tilingPaddingHorizontal: 15,
          quality: 'proof',
          randomize: false,
          nodeDimensionsIncludeLabels: true,
          uniformNodeDimensions: false,
          packComponents: true,
          stepSize: 30
        };
      case 'dagre':
        return {
          ...baseConfig,
          name: 'dagre',
          rankDir: 'TB',
          nodeSep: 80,
          edgeSep: 20,
          rankSep: 100,
          spacingFactor: 1.2
        };
      case 'breadthfirst':
        return {
          ...baseConfig,
          name: 'breadthfirst',
          directed: true,
          spacingFactor: 1.5,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: true
        };
      case 'circle':
        return {
          ...baseConfig,
          name: 'circle',
          radius: 200,
          spacingFactor: 1.2,
          avoidOverlap: true
        };
      case 'grid':
        return {
          ...baseConfig,
          name: 'grid',
          avoidOverlap: true,
          condense: true,
          spacingFactor: 1.2
        };
      case 'concentric':
        return {
          ...baseConfig,
          name: 'concentric',
          concentric: (node: any) => {
            const type = node.data('type');
            if (type === 'module') return 3;
            if (type === 'class') return 2;
            if (type === 'function') return 1;
            return 0;
          },
          levelWidth: () => 2,
          spacingFactor: 1.5,
          avoidOverlap: true,
          minNodeSpacing: 80
        };
      default:
        return { ...baseConfig, name: 'cose-bilkent' } as any;
    }
  }, []);

  // Enhanced data conversion with theme-aware colors
  const convertedData = useMemo(() => {
    if (!data) return null;

    const modules = data.modules || [];
    const classes = modules.flatMap(m => m.classes || []);
    const functions = modules.flatMap(m => m.functions || []);
    const dependencies = data.dependencies || [];
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeIds = new Set<string>();

    // Add modules with enhanced styling
    modules.forEach(module => {
      const nodeId = module.name;
      if (!nodeIds.has(nodeId)) {
        nodeIds.add(nodeId);
        const fileName = module.path ?
          module.path.split('/').pop()?.replace('.py', '') :
          module.name;

        nodes.push({
          id: nodeId,
          label: fileName,
          name: module.name,
          type: 'module',
          file_path: module.path,
          line_number: 1,
          docstring: `Module with ${module.functions.length} functions and ${module.classes.length} classes`
        });
      }
    });

    // Add classes
    classes.forEach(cls => {
      const nodeId = cls.name;
      if (!nodeIds.has(nodeId)) {
        nodeIds.add(nodeId);
        nodes.push({
          id: nodeId,
          label: cls.name,
          name: cls.name,
          type: 'class',
          line_number: cls.line_number,
          docstring: cls.docstring,
          parameters: cls.methods?.map(m => m.name) || [],
          decorators: []
        });
      }
    });

    // Add functions
    functions.forEach(func => {
      const nodeId = func.name;
      if (!nodeIds.has(nodeId)) {
        nodeIds.add(nodeId);
        nodes.push({
          id: nodeId,
          label: func.name,
          name: func.name,
          type: 'function',
          line_number: func.line_number,
          docstring: func.docstring,
          parameters: func.parameters,
          return_type: func.return_type,
          decorators: []
        });
      }
    });

    // Add edges from dependencies
    dependencies.forEach((dep, index) => {
      if (nodeIds.has(dep.source) && nodeIds.has(dep.target)) {
        edges.push({
          id: `e${index}`,
          source: dep.source,
          target: dep.target,
          from: dep.source,
          to: dep.target,
          relationship_type: dep.type,
          weight: dep.weight || 1
        });
      }
    });

    // If no dependency edges, create basic relationships
    if (edges.length === 0) {
      modules.forEach(module => {
        // Connect module to its classes
        module.classes.forEach((cls, index) => {
          if (nodeIds.has(module.name) && nodeIds.has(cls.name)) {
            edges.push({
              id: `contains_class_${index}`,
              source: module.name,
              target: cls.name,
              from: module.name,
              to: cls.name,
              relationship_type: 'contains'
            });
          }
        });

        // Connect module to its functions
        module.functions.forEach((func, index) => {
          if (nodeIds.has(module.name) && nodeIds.has(func.name)) {
            edges.push({
              id: `contains_func_${index}`,
              source: module.name,
              target: func.name,
              from: module.name,
              to: func.name,
              relationship_type: 'contains'
            });
          }
        });
      });
    }

    return {
      cytoscape: [
        ...nodes.map(node => ({ data: node })),
        ...edges.map(edge => ({ data: edge }))
      ] as CytoscapeElement[],
      forceGraph: {
        nodes: nodes,
        links: edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          relationship_type: edge.relationship_type
        }))
      } as ForceGraphData,
      visNetwork: {
        nodes: nodes as VisNode[],
        edges: edges as VisEdge[]
      }
    };
  }, [data]);

  // Sample data for when no real data is available
  const sampleData = useMemo(() => ({
    cytoscape: [
      {
        data: {
          id: 'main',
          label: 'main',
          name: 'main.py',
          type: 'module',
          file_path: '/project/main.py',
          line_number: 1,
          docstring: 'Main module for the application'
        }
      },
      {
        data: {
          id: 'utils',
          label: 'utils',
          name: 'utils.py',
          type: 'module',
          file_path: '/project/utils.py',
          line_number: 1,
          docstring: 'Utility functions and helpers'
        }
      },
      {
        data: {
          id: 'MyClass',
          label: 'MyClass',
          name: 'MyClass',
          type: 'class',
          file_path: '/project/main.py',
          line_number: 15,
          docstring: 'A sample class demonstrating the analyzer'
        }
      },
      {
        data: {
          id: 'my_function',
          label: 'my_function',
          name: 'my_function',
          type: 'function',
          file_path: '/project/utils.py',
          line_number: 8,
          docstring: 'A utility function that processes data'
        }
      },
      { data: { source: 'main', target: 'utils', id: 'e1', relationship_type: 'imports' } },
      { data: { source: 'main', target: 'MyClass', id: 'e2', relationship_type: 'contains' } },
      { data: { source: 'utils', target: 'my_function', id: 'e3', relationship_type: 'contains' } }
    ] as CytoscapeElement[],
    forceGraph: {
      nodes: [
        { id: 'main', name: 'main.py', type: 'module' },
        { id: 'utils', name: 'utils.py', type: 'module' },
        { id: 'MyClass', name: 'MyClass', type: 'class' },
        { id: 'my_function', name: 'my_function', type: 'function' }
      ],
      links: [
        { source: 'main', target: 'utils', relationship_type: 'imports' },
        { source: 'main', target: 'MyClass', relationship_type: 'contains' },
        { source: 'utils', target: 'my_function', relationship_type: 'contains' }
      ]
    } as ForceGraphData,
    visNetwork: {
      nodes: [
        { id: 'main', name: 'main.py', type: 'module' },
        { id: 'utils', name: 'utils.py', type: 'module' },
        { id: 'MyClass', name: 'MyClass', type: 'class' },
        { id: 'my_function', name: 'my_function', type: 'function' }
      ] as VisNode[],
      edges: [
        { from: 'main', to: 'utils', relationship_type: 'imports' },
        { from: 'main', to: 'MyClass', relationship_type: 'contains' },
        { from: 'utils', to: 'my_function', relationship_type: 'contains' }
      ] as VisEdge[]
    }
  }), []);

  const renderVisualization = useCallback(() => {
    const graphData = convertedData || sampleData;

    if (!graphData) {
      return (
        <Box sx={{
          textAlign: 'center',
          py: 8,
          color: 'text.secondary'
        }}>
          <Typography variant="h6" gutterBottom>
            No analysis data available
          </Typography>
          <Typography variant="body2">
            Run an analysis to see the mind map visualization
          </Typography>
        </Box>
      );
    }

    const commonProps = {
      onNodeClick: handleNodeClick,
      style: {
        width: '100%',
        height: isFullscreen ? '100vh' : '600px'
      }
    };

    switch (graphType) {
      case 'cytoscape':
        return (
          <VisualizationWrapper skeletonType="mindmap" height={isFullscreen ? '100vh' : 600}>
            <LazyCytoscapeGraph
              key={`cytoscape-${refreshKey}`}
              elements={graphData.cytoscape}
              layout={getLayoutConfig(layoutType)}
              showControls={true}
              enableCollapse={true}
              {...commonProps}
            />
          </VisualizationWrapper>
        );

      case 'force':
        return (
          <VisualizationWrapper skeletonType="force-graph" height={isFullscreen ? '100vh' : 600}>
            <LazyForceGraph
              key={`force-${refreshKey}`}
              graphData={graphData.forceGraph}
              width={800}
              height={isFullscreen ? window.innerHeight : 600}
              showLabels={true}
              enableZoom={true}
              enableDrag={true}
              linkDistance={120}
              chargeStrength={-400}
              collisionRadius={25}
              {...commonProps}
            />
          </VisualizationWrapper>
        );

      case 'vis':
        return (
          <VisualizationWrapper skeletonType="network" height={isFullscreen ? '100vh' : 600}>
            <LazyVisNetwork
              key={`vis-${refreshKey}`}
              nodes={graphData.visNetwork.nodes}
              edges={graphData.visNetwork.edges}
              {...commonProps}
            />
          </VisualizationWrapper>
        );

      default:
        return null;
    }
  }, [convertedData, sampleData, graphType, handleNodeClick, isFullscreen, refreshKey, getLayoutConfig, layoutType]);

  return (
    <Box sx={{
      mt: { xs: 2, sm: 4 },
      ...(isFullscreen && {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'background.default',
        p: 2
      })
    }}>
      <Paper
        elevation={isFullscreen ? 0 : 3}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: isFullscreen ? 0 : 3,
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
          boxShadow: isFullscreen ? 'none' : '0px 8px 32px rgba(0, 0, 0, 0.08)',
          height: isFullscreen ? '100vh' : 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Enhanced Header */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' }
        }}>
          <Typography
            variant="h5"
            component="h2"
            sx={{
              fontWeight: 600,
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}
          >
            🗺️ Project Mind Map
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Layout Selector for Cytoscape */}
            {graphType === 'cytoscape' && (
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Layout</InputLabel>
                <Select
                  value={layoutType}
                  label="Layout"
                  onChange={(e) => setLayoutType(e.target.value as LayoutType)}
                >
                  <MenuItem value="cose-bilkent">Hierarchical (CoSE)</MenuItem>
                  <MenuItem value="dagre">Tree (Dagre)</MenuItem>
                  <MenuItem value="breadthfirst">Breadth First</MenuItem>
                  <MenuItem value="circle">Circular</MenuItem>
                  <MenuItem value="grid">Grid</MenuItem>
                  <MenuItem value="concentric">Concentric</MenuItem>
                </Select>
              </FormControl>
            )}

            {/* Control Buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Export & Share">
                <IconButton onClick={handleExport} size="small">
                  <Download />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh Visualization">
                <IconButton onClick={handleRefresh} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                <IconButton onClick={toggleFullscreen} size="small">
                  {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                </IconButton>
              </Tooltip>
            </Box>

            {/* Graph Type Selector */}
            <ToggleButtonGroup
              value={graphType}
              exclusive
              onChange={handleGraphTypeChange}
              aria-label="graph type"
              size="small"
            >
              <ToggleButton value="cytoscape" aria-label="cytoscape">
                <AccountTree sx={{ mr: 1 }} />
                Cytoscape
              </ToggleButton>
              <ToggleButton value="force" aria-label="force graph">
                <BubbleChart sx={{ mr: 1 }} />
                Force Graph
              </ToggleButton>
              <ToggleButton value="vis" aria-label="vis network">
                <Hub sx={{ mr: 1 }} />
                Vis Network
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Enhanced Legend */}
        <Box sx={{
          mb: 3,
          p: 3,
          background: alpha(theme.palette.primary.main, 0.04),
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          boxShadow: `0px 2px 8px ${alpha(theme.palette.primary.main, 0.08)}`
        }}>
          <Typography variant="subtitle1" gutterBottom sx={{
            fontWeight: 600,
            color: 'primary.main',
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            🎨 Legend & Interactive Controls
          </Typography>

          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 2
          }}>
            {[
              { type: 'module', color: theme.palette.primary.main, shape: 'rectangle', label: 'Modules' },
              { type: 'class', color: theme.palette.success.main, shape: 'circle', label: 'Classes' },
              { type: 'function', color: theme.palette.warning.main, shape: 'diamond', label: 'Functions' },
              { type: 'relationship', color: theme.palette.info.main, shape: 'line', label: 'Relationships' }
            ].map(({ type, color, shape, label }) => (
              <Box key={type} sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1.5,
                borderRadius: 1,
                backgroundColor: alpha(color, 0.1),
                border: `1px solid ${alpha(color, 0.2)}`,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: alpha(color, 0.15),
                  transform: 'scale(1.02)',
                }
              }}>
                <Box sx={{
                  width: shape === 'line' ? 20 : shape === 'circle' ? 16 : 20,
                  height: shape === 'line' ? 2 : shape === 'circle' ? 16 : 12,
                  backgroundColor: color,
                  borderRadius: shape === 'circle' ? '50%' : shape === 'diamond' ? '3px' : '3px',
                  transform: shape === 'diamond' ? 'rotate(45deg)' : 'none',
                  boxShadow: `0px 2px 4px ${alpha(color, 0.3)}`
                }} />
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{
            p: 2,
            backgroundColor: alpha(theme.palette.background.paper, 0.8),
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`
          }}>
            <Typography variant="caption" color="text.secondary" sx={{
              display: 'block',
              lineHeight: 1.5,
              fontSize: '0.8rem'
            }}>
              💡 <strong>Interactive Features:</strong> Single-click to select and view details •
              Double-click expandable nodes to collapse/expand • Hover to highlight connections •
              Use mouse wheel to zoom • Drag to pan • Click background to clear selection
            </Typography>
          </Box>
        </Box>

        {/* Main Content Area */}
        <Box sx={{
          display: 'flex',
          gap: 2,
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: 'stretch',
          flex: isFullscreen ? 1 : 'none'
        }}>
          <Box
            ref={(el) => setVisualizationElement(el as HTMLElement)}
            sx={{
              flex: 1,
              minHeight: { xs: '400px', sm: '500px', md: '600px' },
              '& > *': {
                height: isFullscreen ? '100%' : { xs: '400px !important', sm: '500px !important', md: '600px !important' }
              }
            }}
          >
            {isFullscreen ? (
              <FullscreenViewer
                open={isFullscreen}
                onClose={() => setIsFullscreen(false)}
                onExport={handleExport}
                title="Project Mind Map"
                metadata={{
                  graphType,
                  layoutType,
                  nodeCount: convertedData?.cytoscape.filter(el => !el.data.source).length || sampleData.cytoscape.filter(el => !el.data.source).length,
                  edgeCount: convertedData?.cytoscape.filter(el => el.data.source).length || sampleData.cytoscape.filter(el => el.data.source).length
                }}
              >
                {renderVisualization()}
              </FullscreenViewer>
            ) : (
              renderVisualization()
            )}
          </Box>

          {/* Enhanced Node Details Panel */}
          {selectedNode && (
            <Card sx={{
              width: { xs: '100%', md: 320 },
              maxHeight: isFullscreen ? '100%' : '600px',
              overflow: 'auto',
              borderRadius: 3,
              boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              background: alpha(theme.palette.background.paper, 0.95),
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.15)',
                transform: 'translateY(-2px)',
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{
                  color: selectedNode.type === 'module' ? theme.palette.primary.main :
                    selectedNode.type === 'class' ? theme.palette.success.main :
                      theme.palette.warning.main,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2
                }}>
                  {selectedNode.type === 'module' && <Description />}
                  {selectedNode.type === 'class' && <Class />}
                  {selectedNode.type === 'function' && <Functions />}
                  {selectedNode.name || selectedNode.label}
                </Typography>

                <Chip
                  label={selectedNode.type}
                  size="small"
                  color={selectedNode.type === 'module' ? 'primary' :
                    selectedNode.type === 'class' ? 'success' : 'warning'}
                  sx={{ mb: 2 }}
                />

                {selectedNode.file_path && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>File:</strong> {selectedNode.file_path}
                  </Typography>
                )}

                {selectedNode.line_number && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Line:</strong> {selectedNode.line_number}
                  </Typography>
                )}

                {selectedNode.docstring && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Documentation:
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{
                      fontStyle: 'italic',
                      backgroundColor: alpha(theme.palette.background.default, 0.5),
                      padding: 1.5,
                      borderRadius: 1,
                      fontSize: '0.8rem',
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                    }}>
                      {selectedNode.docstring.length > 200
                        ? `${selectedNode.docstring.substring(0, 200)}...`
                        : selectedNode.docstring
                      }
                    </Typography>
                  </Box>
                )}

                {selectedNode.parameters && selectedNode.parameters.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Parameters:
                    </Typography>
                    {selectedNode.parameters.slice(0, 5).map((param: any, index: number) => (
                      <Typography key={index} variant="body2" color="text.secondary" sx={{
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        backgroundColor: alpha(theme.palette.background.default, 0.3),
                        p: 0.5,
                        borderRadius: 0.5,
                        mb: 0.5
                      }}>
                        • {param.name}{param.type_hint ? `: ${param.type_hint}` : ''}
                        {param.default_value ? ` = ${param.default_value}` : ''}
                      </Typography>
                    ))}
                    {selectedNode.parameters.length > 5 && (
                      <Typography variant="body2" color="text.secondary" sx={{
                        fontSize: '0.8rem',
                        fontStyle: 'italic'
                      }}>
                        ... and {selectedNode.parameters.length - 5} more parameters
                      </Typography>
                    )}
                  </Box>
                )}

                {selectedNode.return_type && (
                  <Typography variant="body2" color="text.secondary" sx={{
                    mb: 1,
                    fontFamily: 'monospace',
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    p: 0.5,
                    borderRadius: 0.5
                  }}>
                    <strong>Returns:</strong> {selectedNode.return_type}
                  </Typography>
                )}

                {selectedNode.decorators && selectedNode.decorators.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Decorators:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedNode.decorators.map((decorator: string, index: number) => (
                        <Chip
                          key={index}
                          label={`@${decorator}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                <Typography variant="body2" color="text.secondary" sx={{
                  fontSize: '0.8rem',
                  mt: 2,
                  fontFamily: 'monospace',
                  backgroundColor: alpha(theme.palette.background.default, 0.3),
                  p: 0.5,
                  borderRadius: 0.5
                }}>
                  <strong>ID:</strong> {selectedNode.id}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </Paper>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onClose={handleCloseExportDialog}
        element={visualizationElement}
        data={convertedData || sampleData}
        graphType={graphType}
        layoutType={layoutType}
        viewSettings={{
          showLabels: true,
          enableZoom: true,
          enableDrag: true,
          linkDistance: 120,
          chargeStrength: -400,
          collisionRadius: 25
        }}
        selectedNode={selectedNode}
      />
    </Box>
  );
});

MindMapViewer.displayName = 'MindMapViewer';

export default MindMapViewer;