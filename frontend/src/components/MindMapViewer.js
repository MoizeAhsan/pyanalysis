import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import { AccountTree, BubbleChart, Hub } from '@mui/icons-material';
import CytoscapeGraph from './CytoscapeGraph';
import VisNetworkComponent from './VisNetwork';

// Lazy load ForceGraph to handle dependency issues
const ForceGraphComponent = React.lazy(() =>
  import('./ForceGraph').catch(() => ({
    default: () => (
      <Alert severity="warning">
        Force Graph visualization is temporarily unavailable due to dependency issues.
        Please use Cytoscape or Vis Network instead.
      </Alert>
    )
  }))
);

const MindMapViewer = ({ data = null }) => {
  const [graphType, setGraphType] = useState('cytoscape');
  const [selectedNode, setSelectedNode] = useState(null);

  const handleGraphTypeChange = (event, newType) => {
    if (newType !== null) {
      setGraphType(newType);
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
    if (!analysisData) return null;

    const { modules = [], classes = [], functions = [], imports = [] } = analysisData;

    // Create nodes from modules, classes, and functions
    const nodes = [];
    const edges = [];

    // Add modules
    modules.forEach(module => {
      nodes.push({
        id: module.name || module.file_path,
        label: module.name || module.file_path,
        name: module.name || module.file_path,
        type: 'module'
      });
    });

    // Add classes
    classes.forEach(cls => {
      nodes.push({
        id: cls.name,
        label: cls.name,
        name: cls.name,
        type: 'class'
      });
    });

    // Add functions
    functions.forEach(func => {
      nodes.push({
        id: func.name,
        label: func.name,
        name: func.name,
        type: 'function'
      });
    });

    // Add edges from imports
    imports.forEach((imp, index) => {
      if (imp.source && imp.target) {
        edges.push({
          id: `e${index}`,
          source: imp.source,
          target: imp.target,
          from: imp.source,
          to: imp.target
        });
      }
    });

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
      { data: { id: 'main', label: 'main.py', type: 'module' } },
      { data: { id: 'utils', label: 'utils.py', type: 'module' } },
      { data: { id: 'MyClass', label: 'MyClass', type: 'class' } },
      { data: { id: 'my_function', label: 'my_function', type: 'function' } },
      { data: { source: 'main', target: 'utils', id: 'e1' } },
      { data: { source: 'main', target: 'MyClass', id: 'e2' } },
      { data: { source: 'MyClass', target: 'my_function', id: 'e3' } }
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
        { source: 'MyClass', target: 'my_function' }
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
        { from: 'MyClass', to: 'my_function' }
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
            style={{ width: '100%', height: '500px' }}
          />
        );
      case 'force':
        return (
          <React.Suspense fallback={<Typography>Loading Force Graph...</Typography>}>
            <ForceGraphComponent
              graphData={graphData.forceGraph}
              onNodeClick={handleNodeClick}
              onLinkClick={handleEdgeClick}
              width={800}
              height={500}
            />
          </React.Suspense>
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
    <Box sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            Project Mind Map
          </Typography>

          <ToggleButtonGroup
            value={graphType}
            exclusive
            onChange={handleGraphTypeChange}
            aria-label="graph type"
          >
            <ToggleButton value="cytoscape" aria-label="cytoscape">
              <AccountTree sx={{ mr: 1 }} />
              Cytoscape
            </ToggleButton>
            <ToggleButton value="force" aria-label="force graph" disabled>
              <BubbleChart sx={{ mr: 1 }} />
              Force Graph (Disabled)
            </ToggleButton>
            <ToggleButton value="vis" aria-label="vis network">
              <Hub sx={{ mr: 1 }} />
              Vis Network
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            {renderGraph()}
          </Box>

          {selectedNode && (
            <Card sx={{ width: 300 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Node Details
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Name:</strong> {selectedNode.name || selectedNode.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Type:</strong> {selectedNode.type}
                </Typography>
                <Typography variant="body2" color="text.secondary">
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