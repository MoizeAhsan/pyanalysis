import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, Typography, Box } from '@mui/material';
import ProjectInput from '../features/analysis/components/ProjectInput';

const theme = createTheme();

const ProjectInputDemo: React.FC = () => {
  const handleAnalysisStart = () => {
    console.log('Analysis started');
  };

  const handleAnalysisComplete = (message?: string) => {
    console.log('Analysis completed:', message);
  };

  const handleAnalysisError = (error: string) => {
    console.error('Analysis error:', error);
  };

  const handleReset = () => {
    console.log('Reset');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Enhanced Project Input Demo
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This demo showcases the modernized project input component with
            real-time path validation, recent projects history, and enhanced loading states.
          </Typography>
        </Box>
        
        <ProjectInput
          onAnalysisStart={handleAnalysisStart}
          onAnalysisComplete={handleAnalysisComplete}
          onAnalysisError={handleAnalysisError}
          onReset={handleReset}
          loading={false}
        />
        
        <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Features Implemented:
          </Typography>
          <ul>
            <li>Real-time path validation with visual feedback (absolute paths only)</li>
            <li>Recent projects history with localStorage persistence</li>
            <li>Enhanced loading states with progress indicators</li>
            <li>Cancellation support for ongoing analysis</li>
            <li>Skeleton screens during loading</li>
            <li>Optimistic UI updates</li>
            <li>Dark mode support with theme-aware styling</li>
            <li>Responsive design</li>
            <li>Accessibility improvements</li>
          </ul>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default ProjectInputDemo;