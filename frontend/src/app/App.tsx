import { useState, useEffect } from 'react';
import { Container, AppBar, Toolbar, Typography, Box, Alert, Snackbar, Tabs, Tab } from '@mui/material';
import ProjectInput from '@features/analysis/components/ProjectInput';
import AnalysisResults from '@features/analysis/components/AnalysisResults';
import MindMapViewer from '@features/visualization/components/MindMapViewer';
import ArchitectureViewer from '@features/visualization/components/ArchitectureViewer';
import CodeExplorer from '@features/exploration/components/CodeExplorer';
import SearchInterface from '@features/search/components/SearchInterface';
import performanceMonitor from '@shared/utils/performance';
import type { AnalysisData, CodeElement } from '@shared/types';

function App() {
  const [analysisTriggered, setAnalysisTriggered] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedElement, setSelectedElement] = useState<CodeElement | null>(null);

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

  const handleAnalysisError = (errorMessage: string) => {
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

  const handleDataLoaded = (data: AnalysisData) => {
    setAnalysisData(data);
  };

  const handleCloseSnackbar = () => {
    setError('');
    setSuccess('');
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleElementSelect = (element: CodeElement) => {
    setSelectedElement(element);
    // Switch to Code Explorer tab to show the selected element
    setActiveTab(2);
  };

  return (
    <div className="App">
      <AppBar 
        position="static" 
        sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 50%, #64b5f6 100%)',
          boxShadow: '0px 4px 20px rgba(25, 118, 210, 0.3)',
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontSize: { xs: '1.1rem', sm: '1.25rem' }
            }}
          >
            <span style={{ fontSize: '1.5em' }}>🐍</span>
            Python Code Analyzer
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container 
        maxWidth="xl" 
        sx={{ 
          mt: { xs: 2, sm: 4 },
          px: { xs: 2, sm: 3, md: 4 }
        }}
        className="fade-in"
      >
        <Box sx={{ 
          mb: { xs: 3, sm: 4 }, 
          textAlign: 'center',
          animation: 'fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            sx={{ 
              fontWeight: 700, 
              color: 'primary.main',
              fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}
            className="responsive-title"
          >
            Visual Python Project Explorer
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ 
              maxWidth: { xs: '100%', sm: 600 }, 
              mx: 'auto',
              fontSize: { xs: '1rem', sm: '1.25rem' },
              lineHeight: 1.6,
              fontWeight: 400
            }}
            className="responsive-subtitle"
          >
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
          <Box sx={{ mt: { xs: 3, sm: 4 } }} className="fade-in">
            <Box sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              borderRadius: '12px 12px 0 0',
              px: 2,
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)'
            }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange} 
                aria-label="analysis views"
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    minHeight: 64,
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    fontWeight: 600,
                    textTransform: 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      color: 'primary.main',
                      backgroundColor: 'rgba(25, 118, 210, 0.04)',
                    },
                    '&.Mui-selected': {
                      color: 'primary.main',
                      fontWeight: 700,
                    }
                  },
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                    background: 'linear-gradient(90deg, #1976d2, #42a5f5)',
                  }
                }}
              >
                <Tab label="🗺️ Mind Map" />
                <Tab label="🏗️ Architecture" />
                <Tab label="🔍 Code Explorer" />
                <Tab label="🔎 Search" />
              </Tabs>
            </Box>
            
            <Box sx={{ 
              backgroundColor: 'background.paper',
              borderRadius: '0 0 12px 12px',
              minHeight: '500px',
              boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)'
            }}>
              {activeTab === 0 && (
                <Box className="fade-in">
                  <MindMapViewer data={analysisData} />
                </Box>
              )}
              
              {activeTab === 1 && (
                <Box className="fade-in">
                  <ArchitectureViewer data={analysisData} />
                </Box>
              )}
              
              {activeTab === 2 && (
                <Box className="fade-in">
                  <CodeExplorer data={analysisData} selectedElement={selectedElement} />
                </Box>
              )}
              
              {activeTab === 3 && (
                <Box className="fade-in">
                  <SearchInterface data={analysisData} onElementSelect={handleElementSelect} />
                </Box>
              )}
            </Box>
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