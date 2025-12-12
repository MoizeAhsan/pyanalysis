import React, { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react';
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
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Collapse,
  Badge,
  useTheme,
  useMediaQuery,
  alpha,
  LinearProgress
} from '@mui/material';
import {
  AccountTree,
  Warning,
  Architecture,
  ImportExport,
  Loop,
  ExpandMore,
  ExpandLess,
  Fullscreen,
  FullscreenExit,
  Refresh,
  FilterList
} from '@mui/icons-material';
import {
  LazyCytoscapeGraph,
  VisualizationWrapper
} from './index';

import type { AnalysisData } from '@shared/types';

interface ArchitectureViewerProps {
  data?: AnalysisData | null;
}

type ViewType = 'dependency' | 'imports' | 'hierarchy';
type LayoutType = 'breadthfirst' | 'cose' | 'concentric' | 'circle';

interface CircularDependency {
  cycle: string[];
  severity: 'high' | 'medium' | 'low';
}

const ArchitectureViewer: React.FC<ArchitectureViewerProps> = memo(({ data = null }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [viewType, setViewType] = useState<ViewType>('dependency');
  const [layoutType, setLayoutType] = useState<LayoutType>('breadthfirst');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showCircularDeps, setShowCircularDeps] = useState(true);
  const [showImports, setShowImports] = useState(true);
  const [showModulesOnly, setShowModulesOnly] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['patterns', 'circular']));
  const [isProcessing, setIsProcessing] = useState(false);
  const [visibleNodeCount, setVisibleNodeCount] = useState(0);
  const [visibleEdgeCount, setVisibleEdgeCount] = useState(0);
  
  const processingTimeoutRef = useRef<NodeJS.Timeout>();

  // Performance optimization: Debounced processing
  useEffect(() => {
    setIsProcessing(true);
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    processingTimeoutRef.current = setTimeout(() => {
      setIsProcessing(false);
    }, 500);

    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [viewType, showModulesOnly, showImports, showCircularDeps, data]);

  // Enhanced circular dependency detection with performance optimization
  const detectCircularDependencies = useCallback((nodes: any[], edges: any[]): CircularDependency[] => {
    const graph: Record<string, string[]> = {};
    const cycles: CircularDependency[] = [];

    // Build adjacency list with early termination for large graphs
    const maxNodes = 1000; // Limit for performance
    const limitedNodes = nodes.slice(0, maxNodes);
    
    limitedNodes.forEach(node => {
      graph[node.id] = [];
    });

    edges.forEach(edge => {
      if (graph[edge.source]) {
        graph[edge.source]!.push(edge.target);
      }
    });

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart !== -1) {
          const cycle = [...path.slice(cycleStart), nodeId];
          const severity: 'high' | 'medium' | 'low' = 
            cycle.length <= 3 ? 'high' : 
            cycle.length <= 5 ? 'medium' : 'low';
          
          cycles.push({ cycle, severity });
        }
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = graph[nodeId] || [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      path.pop();
      return false;
    };

    // Check for cycles with early termination
    const maxCycles = 20; // Limit for performance
    Object.keys(graph).forEach(nodeId => {
      if (!visited.has(nodeId) && cycles.length < maxCycles) {
        dfs(nodeId);
      }
    });

    return cycles;
  }, []);

  // Optimized data processing with memoization and virtualization
  const processedData = useMemo(() => {
    if (!data) return null;

    const modules = data.modules || [];
    const classes = data.classes || [];
    const dependencies = data.dependency_graph?.edges || [];
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeIds = new Set<string>();

    // Performance optimization: Limit processing for large datasets
    const maxNodes = 500;
    const maxEdges = 1000;

    // Process modules with performance considerations
    const limitedModules = modules.slice(0, maxNodes);
    limitedModules.forEach(module => {
      const nodeId = module.name;
      if (!nodeIds.has(nodeId)) {
        nodeIds.add(nodeId);
        const filePath = module.location?.file_path;
        const fileName = filePath
          ? filePath.split('/').pop()?.replace('.py', '')
          : module.name;

        const moduleDeps = module.dependencies || [];
        nodes.push({
          id: nodeId,
          label: fileName,
          name: module.name,
          type: 'module',
          file_path: filePath,
          line_number: module.location?.line_number || 1,
          docstring: module.docstring || `Module: ${module.name}`,
          dependencies: moduleDeps,
          classes_count: 0, // Will be calculated separately if needed
          functions_count: 0,
          complexity: moduleDeps.length
        });
      }
    });

    // Add classes if not showing modules only (with virtualization)
    if (!showModulesOnly) {
      const limitedClasses = classes.slice(0, Math.max(0, maxNodes - nodes.length));
      limitedClasses.forEach(cls => {
        const nodeId = cls.name;
        if (!nodeIds.has(nodeId)) {
          nodeIds.add(nodeId);
          const clsParams = cls.parameters || [];
          nodes.push({
            id: nodeId,
            label: cls.name,
            name: cls.name,
            type: 'class',
            file_path: cls.location?.file_path,
            line_number: cls.location?.line_number,
            docstring: cls.docstring,
            dependencies: cls.dependencies || [],
            parameters: clsParams.map((p: { name: string }) => p.name),
            decorators: cls.decorators || [],
            complexity: clsParams.length
          });
        }
      });
    }

    // Process edges with performance optimization
    const limitedEdges = dependencies.slice(0, maxEdges);
    limitedEdges.forEach((edge: { source: string; target: string; relationship_type: string; weight?: number }, index: number) => {
      const shouldInclude =
        nodeIds.has(edge.source) &&
        nodeIds.has(edge.target) &&
        (showImports || edge.relationship_type !== 'import');

      if (shouldInclude) {
        edges.push({
          id: `e${index}`,
          source: edge.source,
          target: edge.target,
          relationship_type: edge.relationship_type,
          weight: edge.weight || 1,
          isCircular: false
        });
      }
    });

    // Detect circular dependencies with performance optimization
    const cycles = detectCircularDependencies(nodes, edges);

    // Mark circular edges efficiently
    const circularEdgeSet = new Set<string>();
    cycles.forEach(({ cycle }) => {
      cycle.forEach((nodeId, index) => {
        const nextNodeId = cycle[(index + 1) % cycle.length];
        const edgeKey = `${nodeId}-${nextNodeId}`;
        const reverseEdgeKey = `${nextNodeId}-${nodeId}`;
        circularEdgeSet.add(edgeKey);
        circularEdgeSet.add(reverseEdgeKey);
      });
    });

    edges.forEach(edge => {
      const edgeKey = `${edge.source}-${edge.target}`;
      if (circularEdgeSet.has(edgeKey)) {
        edge.isCircular = true;
      }
    });

    // Filter edges based on settings
    const filteredEdges = edges.filter(edge => !edge.isCircular || showCircularDeps);

    // Update counts for performance monitoring
    setVisibleNodeCount(nodes.length);
    setVisibleEdgeCount(filteredEdges.length);

    return {
      nodes: nodes.map(node => ({ data: node })),
      edges: filteredEdges.map(edge => ({
        data: edge,
        classes: edge.isCircular ? 'circular-dependency' : ''
      })),
      cycles,
      stats: {
        totalNodes: nodes.length,
        totalEdges: filteredEdges.length,
        circularDependencies: cycles.length,
        complexity: nodes.reduce((sum, node) => sum + (node.complexity || 0), 0)
      }
    };
  }, [data, viewType, showModulesOnly, showImports, showCircularDeps, detectCircularDependencies]);

  // Enhanced layout configuration with performance optimizations
  const getArchitecturalLayout = useCallback((layoutName: LayoutType) => {
    const baseConfig = {
      animate: true,
      animationDuration: Math.min(1000, Math.max(300, 1000 - (visibleNodeCount * 2))), // Adaptive animation
      fit: true,
      padding: 80
    };

    switch (layoutName) {
      case 'breadthfirst':
        return {
          ...baseConfig,
          name: 'breadthfirst',
          directed: true,
          spacingFactor: visibleNodeCount > 100 ? 1.5 : 2,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: visibleNodeCount < 50,
          circle: false
        } as any;
      case 'cose':
        return {
          ...baseConfig,
          name: 'cose',
          nodeRepulsion: () => Math.max(8000, 12000 - (visibleNodeCount * 20)),
          idealEdgeLength: () => Math.max(100, 150 - (visibleNodeCount / 10)),
          edgeElasticity: () => 0.2,
          nestingFactor: 0.1,
          gravity: 0.3,
          numIter: Math.max(1000, 2500 - (visibleNodeCount * 5)),
          randomize: false
        } as any;
      case 'concentric':
        return {
          ...baseConfig,
          name: 'concentric',
          concentric: (node: any) => {
            const type = node.data('type');
            const complexity = node.data('complexity') || 0;
            if (type === 'module') return 3 + Math.min(complexity / 10, 2);
            if (type === 'class') return 2 + Math.min(complexity / 5, 1);
            return 1;
          },
          levelWidth: () => Math.max(2, 4 - (visibleNodeCount / 100)),
          spacingFactor: visibleNodeCount > 100 ? 1.5 : 2,
          avoidOverlap: true,
          minNodeSpacing: Math.max(80, 120 - (visibleNodeCount / 10))
        } as any;
      case 'circle':
        return {
          ...baseConfig,
          name: 'circle',
          avoidOverlap: true,
          spacingFactor: 1.5
        } as any;
      default:
        return { ...baseConfig, name: 'breadthfirst' } as any;
    }
  }, [visibleNodeCount]);

  const handleViewTypeChange = useCallback((_: React.MouseEvent<HTMLElement>, newType: string | null) => {
    if (newType !== null) {
      setViewType(newType as ViewType);
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

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  // Enhanced stylesheet with performance optimizations
  const cytoscapeStyle = useMemo(() => [
    {
      selector: 'node',
      style: {
        'background-color': theme.palette.primary.main,
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#fff',
        'font-size': Math.max(10, 12 - (visibleNodeCount / 100)),
        'font-weight': 'bold',
        'width': Math.max(60, 80 - (visibleNodeCount / 50)),
        'height': Math.max(40, 50 - (visibleNodeCount / 100)),
        'shape': 'rectangle',
        'border-width': 2,
        'border-color': theme.palette.primary.dark,
        'transition-property': 'background-color, border-color',
        'transition-duration': '0.2s'
      }
    },
    {
      selector: 'node[type="module"]',
      style: {
        'background-color': theme.palette.primary.main,
        'shape': 'rectangle',
        'width': Math.max(80, 100 - (visibleNodeCount / 40)),
        'height': Math.max(50, 60 - (visibleNodeCount / 80))
      }
    },
    {
      selector: 'node[type="class"]',
      style: {
        'background-color': theme.palette.success.main,
        'shape': 'ellipse',
        'width': Math.max(60, 80 - (visibleNodeCount / 50)),
        'height': Math.max(40, 50 - (visibleNodeCount / 100))
      }
    },
    {
      selector: 'edge',
      style: {
        'width': Math.max(1, 2 - (visibleEdgeCount / 1000)),
        'line-color': theme.palette.text.secondary,
        'target-arrow-color': theme.palette.text.secondary,
        'target-arrow-shape': 'triangle',
        'curve-style': visibleEdgeCount > 200 ? 'straight' : 'bezier',
        'arrow-scale': Math.max(0.8, 1.2 - (visibleEdgeCount / 1000))
      }
    },
    {
      selector: 'edge.circular-dependency',
      style: {
        'line-color': theme.palette.error.main,
        'target-arrow-color': theme.palette.error.main,
        'width': Math.max(2, 3 - (visibleEdgeCount / 500)),
        'line-style': 'dashed'
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': theme.palette.secondary.main,
        'background-color': theme.palette.secondary.main
      }
    }
  ], [theme, visibleNodeCount, visibleEdgeCount]);

  // Sample data for testing
  const sampleArchitecturalData = useMemo(() => ({
    nodes: [
      {
        data: {
          id: 'main',
          label: 'main',
          name: 'main.py',
          type: 'module',
          file_path: '/project/main.py',
          dependencies: ['utils', 'models'],
          classes_count: 2,
          functions_count: 5,
          complexity: 7
        }
      },
      {
        data: {
          id: 'utils',
          label: 'utils',
          name: 'utils.py',
          type: 'module',
          file_path: '/project/utils.py',
          dependencies: ['models'],
          classes_count: 1,
          functions_count: 8,
          complexity: 9
        }
      },
      {
        data: {
          id: 'models',
          label: 'models',
          name: 'models.py',
          type: 'module',
          file_path: '/project/models.py',
          dependencies: ['utils'],
          classes_count: 3,
          functions_count: 2,
          complexity: 5
        }
      },
      {
        data: {
          id: 'api',
          label: 'api',
          name: 'api.py',
          type: 'module',
          file_path: '/project/api.py',
          dependencies: ['main', 'models'],
          classes_count: 1,
          functions_count: 10,
          complexity: 11
        }
      }
    ],
    edges: [
      { data: { source: 'main', target: 'utils', id: 'e1', relationship_type: 'imports', isCircular: false } },
      { data: { source: 'main', target: 'models', id: 'e2', relationship_type: 'imports', isCircular: false } },
      { data: { source: 'utils', target: 'models', id: 'e3', relationship_type: 'imports', isCircular: false } },
      { data: { source: 'models', target: 'utils', id: 'e4', relationship_type: 'imports', isCircular: true }, classes: 'circular-dependency' },
      { data: { source: 'api', target: 'main', id: 'e5', relationship_type: 'imports', isCircular: false } },
      { data: { source: 'api', target: 'models', id: 'e6', relationship_type: 'imports', isCircular: false } }
    ],
    cycles: [
      { cycle: ['utils', 'models', 'utils'], severity: 'high' as const }
    ],
    stats: {
      totalNodes: 4,
      totalEdges: 6,
      circularDependencies: 1,
      complexity: 32
    }
  }), []);

  const renderArchitecturalView = useCallback(() => {
    // Use processedData if it has nodes, otherwise fallback to sample data
    const graphData = (processedData && processedData.nodes.length > 0) ? processedData : sampleArchitecturalData;

    if (!graphData || graphData.nodes.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No architectural data available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Run an analysis to see the architectural overview
          </Typography>
        </Box>
      );
    }

    return (
      <VisualizationWrapper skeletonType="architecture" height={isFullscreen ? '100vh' : isMobile ? 350 : isTablet ? 450 : 600}>
        <LazyCytoscapeGraph
          key={`architecture-${refreshKey}`}
          elements={[...graphData.nodes, ...graphData.edges]}
          onNodeClick={handleNodeClick}
          style={{ width: '100%', height: isFullscreen ? '100vh' : isMobile ? '350px' : isTablet ? '450px' : '600px' }}
          layout={getArchitecturalLayout(layoutType)}
          stylesheet={cytoscapeStyle}
          showControls={true}
          enableCollapse={false}
        />
      </VisualizationWrapper>
    );
  }, [processedData, sampleArchitecturalData, handleNodeClick, isFullscreen, refreshKey, getArchitecturalLayout, layoutType, cytoscapeStyle, isMobile, isTablet]);

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
        p: { xs: 1, sm: 2 }
      })
    }}>
      <Paper elevation={isFullscreen ? 0 : 3} sx={{ 
        p: { xs: 2, sm: 3 },
        borderRadius: isFullscreen ? 0 : { xs: 2, sm: 3 },
        height: isFullscreen ? '100vh' : 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Enhanced Header with Performance Indicators */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          mb: { xs: 2, sm: 3 }, 
          flexWrap: 'wrap', 
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2 
        }}>
          <Box>
            <Typography variant="h5" component="h2" sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              mb: 1,
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}>
              <Architecture />
              Architectural Overview
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip 
                label={`${visibleNodeCount} nodes`} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                label={`${visibleEdgeCount} edges`} 
                size="small" 
                color="secondary" 
                variant="outlined" 
              />
              {isProcessing && <LinearProgress sx={{ width: 100, height: 2 }} />}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Layout</InputLabel>
              <Select
                value={layoutType}
                label="Layout"
                onChange={(e) => setLayoutType(e.target.value as LayoutType)}
              >
                <MenuItem value="breadthfirst">Tree</MenuItem>
                <MenuItem value="cose">Force-Directed</MenuItem>
                <MenuItem value="concentric">Concentric</MenuItem>
                <MenuItem value="circle">Circular</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh">
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

            <ToggleButtonGroup
              value={viewType}
              exclusive
              onChange={handleViewTypeChange}
              aria-label="view type"
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  px: { xs: 1, sm: 2 },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }
              }}
            >
              <ToggleButton value="dependency" aria-label="dependency view">
                <AccountTree sx={{ mr: { xs: 0.5, sm: 1 }, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Dependencies</Box>
              </ToggleButton>
              <ToggleButton value="imports" aria-label="imports view">
                <ImportExport sx={{ mr: { xs: 0.5, sm: 1 }, fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Imports</Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Enhanced Controls with Performance Settings */}
        <Box sx={{ 
          mb: 2, 
          p: 2, 
          backgroundColor: alpha(theme.palette.background.default, 0.5), 
          borderRadius: 1,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showCircularDeps}
                  onChange={(e) => setShowCircularDeps(e.target.checked)}
                  color="error"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Loop color="error" fontSize="small" />
                  Show Circular Dependencies
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showImports}
                  onChange={(e) => setShowImports(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ImportExport color="primary" fontSize="small" />
                  Show Import Relationships
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showModulesOnly}
                  onChange={(e) => setShowModulesOnly(e.target.checked)}
                  color="secondary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterList color="secondary" fontSize="small" />
                  Modules Only
                </Box>
              }
            />
          </Box>
        </Box>

        {/* Main Content */}
        <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
          <Box sx={{ flex: 1 }}>
            {renderArchitecturalView()}
          </Box>

          {/* Enhanced Side Panel with Virtualized Lists */}
          <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Performance Stats */}
            <Card sx={{ backgroundColor: alpha(theme.palette.info.main, 0.05) }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  color: 'info.main', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1 
                }}>
                  📊 Performance Stats
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Nodes:</strong> {visibleNodeCount}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Edges:</strong> {visibleEdgeCount}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Complexity:</strong> {processedData?.stats.complexity || 0}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Cycles:</strong> {processedData?.cycles.length || 0}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Architectural Patterns */}
            {false && (
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }} onClick={() => toggleSection('patterns')}>
                    <Typography variant="h6" sx={{ 
                      color: 'success.main', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1 
                    }}>
                      <Architecture />
                      Detected Patterns
                      <Badge badgeContent={0} color="success" />
                    </Typography>
                    <IconButton size="small">
                      {expandedSections.has('patterns') ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                  <Collapse in={expandedSections.has('patterns')}>
                    <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                      {[].slice(0, 5).map((pattern: any, index: number) => (
                        <ListItem key={index} sx={{ px: 0 }}>
                          <ListItemIcon>
                            <Architecture color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={pattern.name}
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  Confidence: {Math.round(pattern.confidence * 100)}%
                                </Typography>
                                <Typography variant="caption" display="block" sx={{ 
                                  fontStyle: 'italic',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {pattern.description}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                      {false && (
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText
                            primary={`... and ${0} more patterns`}
                            sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Collapse>
                </CardContent>
              </Card>
            )}

            {/* Circular Dependencies with Severity Indicators */}
            {processedData?.cycles && processedData.cycles.length > 0 && (
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }} onClick={() => toggleSection('circular')}>
                    <Typography variant="h6" sx={{ 
                      color: 'error.main', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1 
                    }}>
                      <Warning />
                      Circular Dependencies
                      <Badge badgeContent={processedData.cycles.length} color="error" />
                    </Typography>
                    <IconButton size="small">
                      {expandedSections.has('circular') ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                  <Collapse in={expandedSections.has('circular')}>
                    <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                      {processedData.cycles.slice(0, 5).map((cycle, index) => (
                        <ListItem key={index} sx={{ px: 0 }}>
                          <ListItemIcon>
                            <Loop color={
                              cycle.severity === 'high' ? 'error' : 
                              cycle.severity === 'medium' ? 'warning' : 'info'
                            } fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={cycle.cycle.join(' → ')}
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip 
                                  label={cycle.severity} 
                                  size="small" 
                                  color={
                                    cycle.severity === 'high' ? 'error' : 
                                    cycle.severity === 'medium' ? 'warning' : 'info'
                                  }
                                  variant="outlined"
                                />
                                <Typography variant="caption">
                                  {cycle.cycle.length} modules involved
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                      {processedData.cycles.length > 5 && (
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText
                            primary={`... and ${processedData.cycles.length - 5} more cycles`}
                            sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Collapse>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Selected Node Details */}
            {selectedNode && (
              <Card sx={{ 
                maxHeight: isFullscreen ? '50vh' : '400px', 
                overflow: 'auto',
                backgroundColor: alpha(theme.palette.background.paper, 0.95)
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{
                    color: selectedNode.type === 'module' ? 'primary.main' : 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <Architecture />
                    {selectedNode.name || selectedNode.label}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={selectedNode.type}
                      size="small"
                      color={selectedNode.type === 'module' ? 'primary' : 'success'}
                    />
                    {selectedNode.complexity && (
                      <Chip
                        label={`Complexity: ${selectedNode.complexity}`}
                        size="small"
                        variant="outlined"
                        color={selectedNode.complexity > 10 ? 'error' : selectedNode.complexity > 5 ? 'warning' : 'success'}
                      />
                    )}
                  </Box>

                  {selectedNode.file_path && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>File:</strong> {selectedNode.file_path}
                    </Typography>
                  )}

                  {selectedNode.classes_count !== undefined && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Classes:</strong> {selectedNode.classes_count}
                    </Typography>
                  )}

                  {selectedNode.functions_count !== undefined && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Functions:</strong> {selectedNode.functions_count}
                    </Typography>
                  )}

                  {selectedNode.dependencies && selectedNode.dependencies.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Dependencies ({selectedNode.dependencies.length}):
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 100, overflow: 'auto' }}>
                        {selectedNode.dependencies.slice(0, 10).map((dep: string, index: number) => (
                          <Chip
                            key={index}
                            label={dep}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                        {selectedNode.dependencies.length > 10 && (
                          <Chip
                            label={`+${selectedNode.dependencies.length - 10} more`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  {selectedNode.docstring && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Documentation:
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{
                        fontStyle: 'italic',
                        backgroundColor: alpha(theme.palette.background.default, 0.5),
                        padding: 1,
                        borderRadius: 1,
                        fontSize: '0.8rem',
                        maxHeight: 100,
                        overflow: 'auto'
                      }}>
                        {selectedNode.docstring.length > 200
                          ? `${selectedNode.docstring.substring(0, 200)}...`
                          : selectedNode.docstring
                        }
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
});

ArchitectureViewer.displayName = 'ArchitectureViewer';

export default ArchitectureViewer;