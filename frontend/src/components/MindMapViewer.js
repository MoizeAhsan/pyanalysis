import React, { useState } from 'react';
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
  MenuItem
} from '@mui/material';
import { AccountTree, BubbleChart, Hub, Description, Class, Functions } from '@mui/icons-material';
import CytoscapeGraph from './CytoscapeGraph';
import VisNetworkComponent from './VisNetwork';

// Import ForceGraph component
import ForceGraphComponent from './ForceGraph';

const MindMapViewer = ({ data = null }) => {
  const [graphType, setGraphType] = useState('cytoscape');
  const [selectedNode, setSelectedNode] = useState(null);
  const [layoutType, setLayoutType] = useState('cose-bilkent');

  const handleGraphTypeChange = (_, newType) => {
    if (newType !== null) {
      setGraphType(newType);
    }
  };



  // Get layout configuration based on selected layout type
  const getLayoutConfig = (layoutName) => {
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
          rankDir: 'TB', // Top to bottom
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
          rows: undefined,
          cols: undefined,
          spacingFactor: 1.2
        };
      case 'concentric':
        return {
          ...baseConfig,
          name: 'concentric',
          concentric: (node) => {
            // Arrange by node type - modules in center, then classes, then functions
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
        return baseConfig;
    }
  };

  const handleNodeClick = (nodeData) => {
    setSelectedNode(nodeData);
  };

  const handleEdgeClick = (edgeData) => {
    console.log('Edge clicked:', edgeData);
  };

  // Convert analysis data to graph format
  const convertDataToGraphFormat = (analysisData) => {
    if (!analysisData || !analysisData.data) return null;

    const data = analysisData.data;
    const { modules = [], classes = [], functions = [], dependency_graph = null } = data;

    // Create nodes from modules, classes, and functions
    const nodes = [];
    const edges = [];
    const nodeIds = new Set(); // Track unique node IDs

    // Add modules with proper file path handling
    modules.forEach(module => {
      const nodeId = module.id || module.name;
      if (!nodeIds.has(nodeId)) {
        nodeIds.add(nodeId);
        // Extract filename from file path for cleaner display
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
          docstring: module.docstring
        });
      }
    });

    // Add classes
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
          parameters: cls.parameters,
          decorators: cls.decorators
        });
      }
    });

    // Add functions
    functions.forEach(func => {
      const nodeId = func.id || func.name;
      if (!nodeIds.has(nodeId)) {
        nodeIds.add(nodeId);
        nodes.push({
          id: nodeId,
          label: func.name,
          name: func.name,
          type: 'function',
          file_path: func.location?.file_path,
          line_number: func.location?.line_number,
          docstring: func.docstring,
          parameters: func.parameters,
          return_type: func.return_type,
          decorators: func.decorators
        });
      }
    });

    // Add edges from dependency graph
    if (dependency_graph && dependency_graph.edges) {
      dependency_graph.edges.forEach((edge, index) => {
        // Only add edges if both source and target nodes exist
        if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
          edges.push({
            id: `e${index}`,
            source: edge.source,
            target: edge.target,
            from: edge.source,
            to: edge.target,
            relationship_type: edge.relationship_type,
            weight: edge.weight
          });
        }
      });
    }

    // If no dependency edges, create some basic relationships based on file structure
    if (edges.length === 0) {
      // Create edges from modules to their classes and functions
      [...classes, ...functions].forEach((element, index) => {
        const elementModule = modules.find(mod => 
          element.location?.file_path === mod.location?.file_path
        );
        if (elementModule) {
          const moduleId = elementModule.id || elementModule.name;
          const elementId = element.id || element.name;
          if (nodeIds.has(moduleId) && nodeIds.has(elementId) && moduleId !== elementId) {
            edges.push({
              id: `contains_${index}`,
              source: moduleId,
              target: elementId,
              from: moduleId,
              to: elementId,
              relationship_type: 'contains'
            });
          }
        }
      });
    }

    return {
      cytoscape: [
        ...nodes.map(node => ({ data: node })),
        ...edges.map(edge => ({ data: edge }))
      ],
      forceGraph: {
        nodes: nodes,
        links: edges.map(edge => ({ source: edge.source, target: edge.target }))
      },
      visNetwork: {
        nodes: nodes,
        edges: edges
      }
    };
  };

  // Sample data for testing when no real data is available
  const sampleData = {
    cytoscape: [
      { data: { 
        id: 'main', 
        label: 'main', 
        name: 'main.py',
        type: 'module',
        file_path: '/project/main.py',
        line_number: 1,
        docstring: 'Main module for the application'
      }},
      { data: { 
        id: 'utils', 
        label: 'utils', 
        name: 'utils.py',
        type: 'module',
        file_path: '/project/utils.py',
        line_number: 1,
        docstring: 'Utility functions and helpers'
      }},
      { data: { 
        id: 'MyClass', 
        label: 'MyClass', 
        name: 'MyClass',
        type: 'class',
        file_path: '/project/main.py',
        line_number: 15,
        docstring: 'A sample class demonstrating the analyzer',
        parameters: [
          { name: 'self', type_hint: null, default_value: null },
          { name: 'name', type_hint: 'str', default_value: null }
        ],
        decorators: ['dataclass']
      }},
      { data: { 
        id: 'my_function', 
        label: 'my_function', 
        name: 'my_function',
        type: 'function',
        file_path: '/project/utils.py',
        line_number: 8,
        docstring: 'A utility function that processes data',
        parameters: [
          { name: 'data', type_hint: 'List[str]', default_value: null },
          { name: 'verbose', type_hint: 'bool', default_value: 'False' }
        ],
        return_type: 'Dict[str, Any]',
        decorators: ['staticmethod']
      }},
      { data: { source: 'main', target: 'utils', id: 'e1', relationship_type: 'imports' } },
      { data: { source: 'main', target: 'MyClass', id: 'e2', relationship_type: 'contains' } },
      { data: { source: 'utils', target: 'my_function', id: 'e3', relationship_type: 'contains' } }
    ],
    forceGraph: {
      nodes: [
        { id: 'main', name: 'main.py', type: 'module' },
        { id: 'utils', name: 'utils.py', type: 'module' },
        { id: 'MyClass', name: 'MyClass', type: 'class' },
        { id: 'my_function', name: 'my_function', type: 'function' }
      ],
      links: [
        { source: 'main', target: 'utils' },
        { source: 'main', target: 'MyClass' },
        { source: 'utils', target: 'my_function' }
      ]
    },
    visNetwork: {
      nodes: [
        { id: 'main', name: 'main.py', type: 'module' },
        { id: 'utils', name: 'utils.py', type: 'module' },
        { id: 'MyClass', name: 'MyClass', type: 'class' },
        { id: 'my_function', name: 'my_function', type: 'function' }
      ],
      edges: [
        { from: 'main', to: 'utils' },
        { from: 'main', to: 'MyClass' },
        { from: 'utils', to: 'my_function' }
      ]
    }
  };

  const renderGraph = () => {
    const convertedData = convertDataToGraphFormat(data);
    const graphData = convertedData || sampleData;

    if (!graphData) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No analysis data available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Run an analysis to see the mind map visualization
          </Typography>
        </Box>
      );
    }

    switch (graphType) {
      case 'cytoscape':
        return (
          <CytoscapeGraph
            elements={graphData.cytoscape}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            style={{ width: '100%', height: '600px' }}
            layout={getLayoutConfig(layoutType)}
          />
        );
      case 'force':
        return (
          <ForceGraphComponent
            graphData={graphData.forceGraph}
            onNodeClick={handleNodeClick}
            onLinkClick={handleEdgeClick}
            width={800}
            height={600}
            showLabels={true}
            enableZoom={true}
            enableDrag={true}
            linkDistance={120}
            chargeStrength={-400}
            collisionRadius={25}
          />
        );
      case 'vis':
        return (
          <VisNetworkComponent
            nodes={graphData.visNetwork.nodes}
            edges={graphData.visNetwork.edges}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            style={{ width: '100%', height: '500px' }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ mt: { xs: 2, sm: 4 } }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          border: '1px solid rgba(25, 118, 210, 0.08)',
          boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.08)',
        }}
      >
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
            {graphType === 'cytoscape' && (
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Layout</InputLabel>
                <Select
                  value={layoutType}
                  label="Layout"
                  onChange={(e) => setLayoutType(e.target.value)}
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

        {/* Enhanced Legend and Controls */}
        <Box sx={{ 
          mb: 3, 
          p: 3, 
          background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.04) 0%, rgba(25, 118, 210, 0.08) 100%)',
          borderRadius: 2,
          border: '1px solid rgba(25, 118, 210, 0.12)',
          boxShadow: '0px 2px 8px rgba(25, 118, 210, 0.08)'
        }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mb: 2 }}>
            🎨 Legend & Controls
          </Typography>
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
            gap: 2,
            mb: 2
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              p: 1,
              borderRadius: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
                transform: 'scale(1.02)',
              }
            }}>
              <Box sx={{ 
                width: 20, 
                height: 12, 
                backgroundColor: '#1976d2', 
                borderRadius: '3px',
                boxShadow: '0px 2px 4px rgba(25, 118, 210, 0.3)'
              }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>Modules</Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              p: 1,
              borderRadius: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
                transform: 'scale(1.02)',
              }
            }}>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                backgroundColor: '#388e3c', 
                borderRadius: '50%',
                boxShadow: '0px 2px 4px rgba(56, 142, 60, 0.3)'
              }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>Classes</Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              p: 1,
              borderRadius: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
                transform: 'scale(1.02)',
              }
            }}>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                backgroundColor: '#f57c00', 
                borderRadius: '3px',
                transform: 'rotate(45deg)',
                boxShadow: '0px 2px 4px rgba(245, 124, 0, 0.3)'
              }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>Functions</Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              p: 1,
              borderRadius: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
                transform: 'scale(1.02)',
              }
            }}>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                backgroundColor: '#1976d2', 
                borderRadius: '3px',
                border: '2px dashed #ff5722',
                boxShadow: '0px 2px 4px rgba(25, 118, 210, 0.3)'
              }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>Expandable</Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              p: 1,
              borderRadius: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
                transform: 'scale(1.02)',
              }
            }}>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                backgroundColor: '#0d47a1', 
                borderRadius: '3px',
                border: '2px double #ff5722',
                boxShadow: '0px 2px 4px rgba(13, 71, 161, 0.3)'
              }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>Collapsed</Typography>
            </Box>
          </Box>
          <Box sx={{ 
            p: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: 1,
            border: '1px solid rgba(25, 118, 210, 0.12)'
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ 
              display: 'block',
              lineHeight: 1.5,
              fontSize: '0.8rem'
            }}>
              💡 <strong>Interactive Tips:</strong> Single-click to select and view details • Double-click expandable nodes to collapse/expand • 
              Hover to highlight connections • Click background to clear selection
            </Typography>
          </Box>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: 'stretch'
        }}>
          <Box sx={{ 
            flex: 1,
            minHeight: { xs: '400px', sm: '500px', md: '600px' },
            '& > *': {
              height: { xs: '400px !important', sm: '500px !important', md: '600px !important' }
            }
          }}>
            {renderGraph()}
          </Box>

          {selectedNode && (
            <Card sx={{ 
              width: { xs: '100%', md: 320 }, 
              maxHeight: '500px', 
              overflow: 'auto',
              borderRadius: 3,
              boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
              border: '1px solid rgba(25, 118, 210, 0.12)',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.15)',
                transform: 'translateY(-2px)',
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  color: selectedNode.type === 'module' ? '#1976d2' : 
                         selectedNode.type === 'class' ? '#388e3c' : '#f57c00',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
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
                      backgroundColor: '#f5f5f5',
                      padding: 1,
                      borderRadius: 1,
                      fontSize: '0.8rem'
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
                    {selectedNode.parameters.slice(0, 5).map((param, index) => (
                      <Typography key={index} variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        • {param.name}{param.type_hint ? `: ${param.type_hint}` : ''}
                        {param.default_value ? ` = ${param.default_value}` : ''}
                      </Typography>
                    ))}
                    {selectedNode.parameters.length > 5 && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                        ... and {selectedNode.parameters.length - 5} more parameters
                      </Typography>
                    )}
                  </Box>
                )}

                {selectedNode.return_type && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Returns:</strong> {selectedNode.return_type}
                  </Typography>
                )}

                {selectedNode.decorators && selectedNode.decorators.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Decorators:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedNode.decorators.map((decorator, index) => (
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

                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mt: 2 }}>
                  <strong>ID:</strong> {selectedNode.id}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default MindMapViewer;