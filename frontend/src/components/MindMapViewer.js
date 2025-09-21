import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent
} from '@mui/material';
import { AccountTree, BubbleChart, Hub } from '@mui/icons-material';
import CytoscapeGraph from './CytoscapeGraph';
import ForceGraphComponent from './ForceGraph';
import VisNetworkComponent from './VisNetwork';

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

  // Sample data for testing
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
    const graphData = data || sampleData;

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
          <ForceGraphComponent
            graphData={graphData.forceGraph}
            onNodeClick={handleNodeClick}
            onLinkClick={handleEdgeClick}
            width={800}
            height={500}
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