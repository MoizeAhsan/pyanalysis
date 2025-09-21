import React, { useState } from 'react';
import { Container, AppBar, Toolbar, Typography, Box } from '@mui/material';
import ProjectInput from './components/ProjectInput';
import AnalysisResults from './components/AnalysisResults';
import MindMapViewer from './components/MindMapViewer';

function App() {
  const [analysisTriggered, setAnalysisTriggered] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);

  const handleAnalysisComplete = () => {
    setAnalysisTriggered(true);
  };

  const handleReset = () => {
    setAnalysisTriggered(false);
    setAnalysisData(null);
  };

  const handleDataLoaded = (data) => {
    setAnalysisData(data);
  };

  return (
    <div className="App">
      <AppBar position="static" sx={{ background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            🐍 Python Code Analyzer
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Visual Python Project Explorer
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Analyze Python projects with interactive mind maps and architectural overviews. 
            Get insights into your code structure, dependencies, and relationships.
          </Typography>
        </Box>
        
        <ProjectInput 
          onAnalysisComplete={handleAnalysisComplete}
          onReset={handleReset}
        />
        
        <AnalysisResults 
          analysisTriggered={analysisTriggered}
          onDataLoaded={handleDataLoaded}
        />
        
        <MindMapViewer data={analysisData} />
      </Container>
    </div>
  );
}

export default App;