import React from 'react';
import { Container, AppBar, Toolbar, Typography, Box } from '@mui/material';
import ProjectInput from './components/ProjectInput';
import MindMapViewer from './components/MindMapViewer';

function App() {
  return (
    <div className="App">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Python Code Analyzer
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Visual Python Project Explorer
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Analyze Python projects with interactive mind maps and architectural overviews
          </Typography>
        </Box>
        
        <ProjectInput />
        <MindMapViewer />
      </Container>
    </div>
  );
}

export default App;