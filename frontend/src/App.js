import { useState, useEffect } from 'react';
import { Container, AppBar, Toolbar, Typography, Box, Alert, Snackbar, Tabs, Tab } from '@mui/material';
import ProjectInput from './components/ProjectInput';
import AnalysisResults from './components/AnalysisResults';
import MindMapViewer from './components/MindMapViewer';
import ArchitectureViewer from './components/ArchitectureViewer';
import CodeExplorer from './components/CodeExplorer';
import SearchInterface from './components/SearchInterface';
import performanceMonitor from './utils/performance';

function App() {
  const [analysisTriggered, setAnalysisTriggered] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedElement, setSelectedElement] = useState(null);

  // Initialize performance monitoring
  useEffect(() => {
    performanceMonitor.startTiming('app-mount');
    
    return () => {
      performanceMonitor.endTiming('app-mount');
      performanceMonitor.cleanup();
    };
  }, []);

  const handleAnalysisStart = () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setAnalysisTriggered(false);
    setAnalysisData(null);
  };

  const handleAnalysisComplete = (message = 'Analysis completed successfully') => {
    setLoading(false);
    setAnalysisTriggered(true);
    setSuccess(message);
  };

  const handleAnalysisError = (errorMessage) => {
    setLoading(false);
    setError(errorMessage);
    setAnalysisTriggered(false);
    setAnalysisData(null);
  };

  const handleReset = () => {
    setAnalysisTriggered(false);
    setAnalysisData(null);
    setError('');
    setSuccess('');
    setLoading(false);
    setActiveTab(0);
  };

  const handleDataLoaded = (data) => {
    setAnalysisData(data);
  };

  const handleCloseSnackbar = () => {
    setError('');
    setSuccess('');
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleElementSelect = (element) => {
    setSelectedElement(element);
    // Switch to Code Explorer tab to show the selected element
    setActiveTab(2);
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
          onAnalysisStart={handleAnalysisStart}
          onAnalysisComplete={handleAnalysisComplete}
          onAnalysisError={handleAnalysisError}
          onReset={handleReset}
          loading={loading}
        />
        
        {analysisTriggered && (
          <AnalysisResults 
            analysisTriggered={analysisTriggered}
            onDataLoaded={handleDataLoaded}
            loading={loading}
          />
        )}
        
        {analysisData && (
          <Box sx={{ mt: 4 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="analysis views">
                <Tab label="Mind Map" />
                <Tab label="Architecture Overview" />
                <Tab label="Code Explorer" />
                <Tab label="Search" />
              </Tabs>
            </Box>
            
            {activeTab === 0 && (
              <MindMapViewer data={analysisData} />
            )}
            
            {activeTab === 1 && (
              <ArchitectureViewer data={analysisData} />
            )}
            
            {activeTab === 2 && (
              <CodeExplorer data={analysisData} selectedElement={selectedElement} />
            )}
            
            {activeTab === 3 && (
              <SearchInterface data={analysisData} onElementSelect={handleElementSelect} />
            )}
          </Box>
        )}

        {/* Global notifications */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
      </Container>
    </div>
  );
}

export default App;