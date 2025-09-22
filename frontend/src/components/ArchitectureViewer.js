import { useState, useMemo, useEffect } from 'react';
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
  ListItemIcon
} from '@mui/material';
import {
  AccountTree,
  Warning,
  Architecture,
  ImportExport,
  Loop
} from '@mui/icons-material';
import CytoscapeGraph from './CytoscapeGraph';

const ArchitectureViewer = ({ data = null }) => {
  const [viewType, setViewType] = useState('dependency');
  const [layoutType, setLayoutType] = useState('dagre');
  const [selectedNode, setSelectedNode] = useState(null);
  const [showCircularDeps, setShowCircularDeps] = useState(true);
  const [showImports, setShowImports] = useState(true);
  const [showModulesOnly, setShowModulesOnly] = useState(false);
  const [circularDependencies, setCircularDependencies] = useState([]);

  // Process data to create architectural views using useMemo to prevent infinite re-renders
  // Simple circular dependency detection using DFS
  const detectCircularDependencies = (nodes, edges) => {
    const graph = {};
    const cycles = [];

    // Build adjacency list
    nodes.forEach(node => {
      graph[node.id] = [];
    });

    edges.forEach(edge => {
      if (graph[edge.source]) {
        graph[edge.source].push(edge.target);
      }
    });

    const visited = new Set();
    const recursionStack = new Set();
    const path = [];

    const dfs = (nodeId) => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), nodeId]);
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

    // Check for cycles starting from each unvisited node
    Object.keys(graph).forEach(nodeId => {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    });

    return cycles;
  };
  
  const processedData = useMemo(() => {
    if (!data || !data.data) return null;

    const { modules = [], classes = [], functions = [], dependency_graph = null } = data.data;

    // Create nodes and edges for different architectural views
    const nodes = [];
    const edges = [];
    const nodeIds = new Set();

    // For dependency view, focus on modules and their relationships
    if (viewType === 'dependency') {
      // Add modules
      modules.forEach(module => {
        const nodeId = module.id || module.name;
        if (!nodeIds.has(nodeId)) {
          nodeIds.add(nodeId);
          const fileName = module.location?.file_path ?
            module.location.file_path.split('/').pop().replace('.py', '') :
            module.name;

          nodes.push({
            id: nodeId,
            label: fileName,
            name: module.name,
            type: 'module',
            file_path: module.location?.file_path,
            line_number: module.location?.line_number,
            docstring: module.docstring,
            dependencies: module.dependencies || [],
            classes_count: classes.filter(cls =>
              cls.location?.file_path === module.location?.file_path
            ).length,
            functions_count: functions.filter(func =>
              func.location?.file_path === module.location?.file_path
            ).length
          });
        }
      });

      // Add classes if not showing modules only
      if (!showModulesOnly) {
        classes.forEach(cls => {
          const nodeId = cls.id || cls.name;
          if (!nodeIds.has(nodeId)) {
            nodeIds.add(nodeId);
            nodes.push({
              id: nodeId,
              label: cls.name,
              name: cls.name,
              type: 'class',
              file_path: cls.location?.file_path,
              line_number: cls.location?.line_number,
              docstring: cls.docstring,
              dependencies: cls.dependencies || [],
              parameters: cls.parameters,
              decorators: cls.decorators
            });
          }
        });
      }
    }

    // Add edges from dependency graph
    if (dependency_graph && dependency_graph.edges) {
      dependency_graph.edges.forEach((edge, index) => {
        // Filter edges based on current settings
        const shouldInclude =
          nodeIds.has(edge.source) &&
          nodeIds.has(edge.target) &&
          (showImports || edge.relationship_type !== 'imports');

        if (shouldInclude) {
          edges.push({
            id: `e${index}`,
            source: edge.source,
            target: edge.target,
            relationship_type: edge.relationship_type,
            weight: edge.weight || 1,
            isCircular: false // Will be updated by circular dependency detection
          });
        }
      });
    }

    // Detect circular dependencies
    const cycles = detectCircularDependencies(nodes, edges);

    // Mark circular edges
    cycles.forEach(cycle => {
      cycle.forEach((nodeId, index) => {
        const nextNodeId = cycle[(index + 1) % cycle.length];
        const edge = edges.find(e =>
          (e.source === nodeId && e.target === nextNodeId) ||
          (e.source === nextNodeId && e.target === nodeId)
        );
        if (edge) {
          edge.isCircular = true;
        }
      });
    });

    return {
      nodes: nodes.map(node => ({ data: node })),
      edges: edges
        .filter(edge => !edge.isCircular || showCircularDeps)
        .map(edge => ({
          data: edge,
          classes: edge.isCircular ? 'circular-dependency' : ''
        })),
      cycles
    };
  }, [data, viewType, showModulesOnly, showImports, showCircularDeps]);

  // Update circular dependencies when processed data changes
  useEffect(() => {
    if (processedData && processedData.cycles) {
      setCircularDependencies(processedData.cycles);
    }
  }, [processedData]);



  // Get layout configuration optimized for architectural views
  const getArchitecturalLayout = (layoutName) => {
    const baseConfig = {
      animate: true,
      animationDuration: 1000,
      fit: true,
      padding: 80
    };

    switch (layoutName) {
      case 'dagre':
        return {
          ...baseConfig,
          name: 'dagre',
          rankDir: 'TB', // Top to bottom for hierarchical view
          nodeSep: 100,
          edgeSep: 50,
          rankSep: 150,
          spacingFactor: 1.5
        };
      case 'breadthfirst':
        return {
          ...baseConfig,
          name: 'breadthfirst',
          directed: true,
          spacingFactor: 2,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: true
        };
      case 'cose-bilkent':
        return {
          ...baseConfig,
          name: 'cose-bilkent',
          nodeRepulsion: 12000,
          idealEdgeLength: 150,
          edgeElasticity: 0.2,
          nestingFactor: 0.1,
          gravity: 0.3,
          numIter: 2500,
          tile: true,
          quality: 'proof'
        };
      case 'concentric':
        return {
          ...baseConfig,
          name: 'concentric',
          concentric: (node) => {
            // Arrange modules in outer ring, classes in inner ring
            const type = node.data('type');
            if (type === 'module') return 2;
            if (type === 'class') return 1;
            return 0;
          },
          levelWidth: () => 3,
          spacingFactor: 2,
          avoidOverlap: true,
          minNodeSpacing: 120
        };
      default:
        return baseConfig;
    }
  };

  const handleViewTypeChange = (_, newType) => {
    if (newType !== null) {
      setViewType(newType);
    }
  };

  const handleNodeClick = (nodeData) => {
    setSelectedNode(nodeData);
  };

  const handleEdgeClick = (edgeData) => {
    console.log('Edge clicked:', edgeData);
  };

  // Sample architectural data for testing
  const sampleArchitecturalData = {
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
          functions_count: 5
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
          functions_count: 8
        }
      },
      {
        data: {
          id: 'models',
          label: 'models',
          name: 'models.py',
          type: 'module',
          file_path: '/project/models.py',
          dependencies: ['utils'], // Creates circular dependency
          classes_count: 3,
          functions_count: 2
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
          functions_count: 10
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
    ]
  };

  const renderArchitecturalView = () => {
    const graphData = processedData || sampleArchitecturalData;

    if (!graphData) {
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

    const cytoscapeStyle = [
      // Node styles
      {
        selector: 'node',
        style: {
          'background-color': '#1976d2',
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': '#fff',
          'font-size': '12px',
          'font-weight': 'bold',
          'width': '80px',
          'height': '50px',
          'shape': 'rectangle',
          'border-width': 2,
          'border-color': '#0d47a1'
        }
      },
      {
        selector: 'node[type="module"]',
        style: {
          'background-color': '#1976d2',
          'shape': 'rectangle',
          'width': '100px',
          'height': '60px'
        }
      },
      {
        selector: 'node[type="class"]',
        style: {
          'background-color': '#388e3c',
          'shape': 'ellipse',
          'width': '80px',
          'height': '50px'
        }
      },
      // Edge styles
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#666',
          'target-arrow-color': '#666',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'arrow-scale': 1.2
        }
      },
      {
        selector: 'edge.circular-dependency',
        style: {
          'line-color': '#f44336',
          'target-arrow-color': '#f44336',
          'width': 3,
          'line-style': 'dashed'
        }
      },
      // Selected node style
      {
        selector: 'node:selected',
        style: {
          'border-width': 4,
          'border-color': '#ff5722',
          'background-color': '#ff9800'
        }
      }
    ];

    return (
      <CytoscapeGraph
        elements={[...graphData.nodes, ...graphData.edges]}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        style={{ width: '100%', height: '600px' }}
        layout={getArchitecturalLayout(layoutType)}
        stylesheet={cytoscapeStyle}
      />
    );
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Architecture />
            Architectural Overview
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Layout</InputLabel>
              <Select
                value={layoutType}
                label="Layout"
                onChange={(e) => setLayoutType(e.target.value)}
              >
                <MenuItem value="dagre">Hierarchical</MenuItem>
                <MenuItem value="breadthfirst">Tree</MenuItem>
                <MenuItem value="cose-bilkent">Force-Directed</MenuItem>
                <MenuItem value="concentric">Concentric</MenuItem>
              </Select>
            </FormControl>

            <ToggleButtonGroup
              value={viewType}
              exclusive
              onChange={handleViewTypeChange}
              aria-label="view type"
              size="small"
            >
              <ToggleButton value="dependency" aria-label="dependency view">
                <AccountTree sx={{ mr: 1 }} />
                Dependencies
              </ToggleButton>
              <ToggleButton value="imports" aria-label="imports view">
                <ImportExport sx={{ mr: 1 }} />
                Imports
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Controls */}
        <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showCircularDeps}
                  onChange={(e) => setShowCircularDeps(e.target.checked)}
                  color="error"
                />
              }
              label="Show Circular Dependencies"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showImports}
                  onChange={(e) => setShowImports(e.target.checked)}
                  color="primary"
                />
              }
              label="Show Import Relationships"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showModulesOnly}
                  onChange={(e) => setShowModulesOnly(e.target.checked)}
                  color="secondary"
                />
              }
              label="Modules Only"
            />
          </Box>
        </Box>

        {/* Legend */}
        <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Legend:
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 24,
                height: 16,
                backgroundColor: '#1976d2',
                borderRadius: '2px',
                border: '2px solid #0d47a1'
              }} />
              <Typography variant="body2">Modules</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 20,
                height: 20,
                backgroundColor: '#388e3c',
                borderRadius: '50%',
                border: '2px solid #2e7d32'
              }} />
              <Typography variant="body2">Classes</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 20,
                height: 2,
                backgroundColor: '#666'
              }} />
              <Typography variant="body2">Dependencies</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 20,
                height: 2,
                backgroundColor: '#f44336',
                borderTop: '2px dashed #f44336'
              }} />
              <Typography variant="body2">Circular Dependencies</Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            {renderArchitecturalView()}
          </Box>

          {/* Side panel with details and circular dependencies */}
          <Box sx={{ width: 320 }}>
            {/* Circular Dependencies Alert */}
            {circularDependencies.length > 0 && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#f44336', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning />
                    Circular Dependencies ({circularDependencies.length})
                  </Typography>
                  <List dense>
                    {circularDependencies.slice(0, 3).map((cycle, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Loop color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary={cycle.join(' → ')}
                          secondary={`${cycle.length} modules involved`}
                        />
                      </ListItem>
                    ))}
                    {circularDependencies.length > 3 && (
                      <ListItem>
                        <ListItemText
                          primary={`... and ${circularDependencies.length - 3} more cycles`}
                          sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            )}

            {/* Selected Node Details */}
            {selectedNode && (
              <Card sx={{ maxHeight: '400px', overflow: 'auto' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{
                    color: selectedNode.type === 'module' ? '#1976d2' : '#388e3c',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <Architecture />
                    {selectedNode.name || selectedNode.label}
                  </Typography>

                  <Chip
                    label={selectedNode.type}
                    size="small"
                    color={selectedNode.type === 'module' ? 'primary' : 'success'}
                    sx={{ mb: 2 }}
                  />

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
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selectedNode.dependencies.slice(0, 5).map((dep, index) => (
                          <Chip
                            key={index}
                            label={dep}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                        {selectedNode.dependencies.length > 5 && (
                          <Chip
                            label={`+${selectedNode.dependencies.length - 5} more`}
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
                        backgroundColor: '#f5f5f5',
                        padding: 1,
                        borderRadius: 1,
                        fontSize: '0.8rem'
                      }}>
                        {selectedNode.docstring.length > 150
                          ? `${selectedNode.docstring.substring(0, 150)}...`
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
};

export default ArchitectureViewer;