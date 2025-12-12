import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Alert,
  AlertTitle
} from '@mui/material';
import { AccountTree, BubbleChart, Hub, Refresh } from '@mui/icons-material';
import {
  LazyCytoscapeGraph,
  LazyForceGraph,
  LazyVisNetwork,
  VisualizationWrapper
} from './index';
import type { CytoscapeElement, ForceGraphData, VisNode, VisEdge } from './index';

const VisualizationDemo: React.FC = () => {
  const [graphType, setGraphType] = useState<'cytoscape' | 'force' | 'vis'>('cytoscape');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [forceReload, setForceReload] = useState(0);

  const handleGraphTypeChange = (_: React.MouseEvent<HTMLElement>, newType: string | null) => {
    if (newType !== null) {
      setGraphType(newType as 'cytoscape' | 'force' | 'vis');
      setSelectedNode(null);
    }
  };

  const handleForceReload = () => {
    setForceReload(prev => prev + 1);
  };

  // Sample data for testing
  const sampleCytoscapeData: CytoscapeElement[] = [
    { data: { id: 'main', label: 'main.py', name: 'main.py', type: 'module' } },
    { data: { id: 'utils', label: 'utils.py', name: 'utils.py', type: 'module' } },
    { data: { id: 'MyClass', label: 'MyClass', name: 'MyClass', type: 'class' } },
    { data: { id: 'my_function', label: 'my_function', name: 'my_function', type: 'function' } },
    { data: { source: 'main', target: 'utils', id: 'e1', relationship_type: 'imports' } },
    { data: { source: 'main', target: 'MyClass', id: 'e2', relationship_type: 'contains' } },
    { data: { source: 'utils', target: 'my_function', id: 'e3', relationship_type: 'contains' } }
  ];

  const sampleForceGraphData: ForceGraphData = {
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
  };

  const sampleVisNodes: VisNode[] = [
    { id: 'main', name: 'main.py', type: 'module' },
    { id: 'utils', name: 'utils.py', type: 'module' },
    { id: 'MyClass', name: 'MyClass', type: 'class' },
    { id: 'my_function', name: 'my_function', type: 'function' }
  ];

  const sampleVisEdges: VisEdge[] = [
    { from: 'main', to: 'utils', relationship_type: 'imports' },
    { from: 'main', to: 'MyClass', relationship_type: 'contains' },
    { from: 'utils', to: 'my_function', relationship_type: 'contains' }
  ];

  const handleNodeClick = (nodeData: any) => {
    setSelectedNode(nodeData);
  };

  const renderVisualization = () => {
    const commonProps = {
      onNodeClick: handleNodeClick,
      style: { width: '100%', height: '500px' }
    };

    switch (graphType) {
      case 'cytoscape':
        return (
          <VisualizationWrapper skeletonType="mindmap" height={500}>
            <LazyCytoscapeGraph
              key={`cytoscape-${forceReload}`}
              elements={sampleCytoscapeData}
              layout={{ name: 'cose-bilkent', animate: true }}
              {...commonProps}
            />
          </VisualizationWrapper>
        );

      case 'force':
        return (
          <VisualizationWrapper skeletonType="force-graph" height={500}>
            <LazyForceGraph
              key={`force-${forceReload}`}
              graphData={sampleForceGraphData}
              width={800}
              height={500}
              {...commonProps}
            />
          </VisualizationWrapper>
        );

      case 'vis':
        return (
          <VisualizationWrapper skeletonType="network" height={500}>
            <LazyVisNetwork
              key={`vis-${forceReload}`}
              nodes={sampleVisNodes}
              edges={sampleVisEdges}
              {...commonProps}
            />
          </VisualizationWrapper>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Typography variant="h5" component="h2">
            🚀 Lazy-Loaded Visualization Demo
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleForceReload}
              size="small"
            >
              Force Reload
            </Button>

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

        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Code Splitting Demo</AlertTitle>
          This demo showcases lazy-loaded visualization components with React.Suspense and error boundaries. 
          Each visualization library is loaded only when needed, reducing initial bundle size.
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', lg: 'row' } }}>
          <Box sx={{ flex: 1 }}>
            {renderVisualization()}
          </Box>

          {selectedNode && (
            <Paper sx={{ 
              width: { xs: '100%', lg: 300 }, 
              p: 2,
              backgroundColor: 'action.hover'
            }}>
              <Typography variant="h6" gutterBottom>
                Selected Node
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>ID:</strong> {selectedNode.id}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Name:</strong> {selectedNode.name || selectedNode.label}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Type:</strong> {selectedNode.type}
              </Typography>
              {selectedNode.file_path && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>File:</strong> {selectedNode.file_path}
                </Typography>
              )}
            </Paper>
          )}
        </Box>

        <Box sx={{ mt: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            💡 Performance Features:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 0 }}>
            <li>Lazy loading with React.Suspense reduces initial bundle size</li>
            <li>Error boundaries provide graceful fallbacks for visualization failures</li>
            <li>Skeleton screens improve perceived loading performance</li>
            <li>Dynamic imports load libraries only when needed</li>
            <li>Each visualization type has optimized loading states</li>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default VisualizationDemo;