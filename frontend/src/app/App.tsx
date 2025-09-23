import { useState, useEffect } from 'react';
import { Container, Box, Typography } from '@mui/material';
import { AppShell } from './components/AppShell';
import { useNotifications } from '@shared/components/NotificationSystem';
import ProjectInput from '@features/analysis/components/ProjectInput';
import AnalysisResults from '@features/analysis/components/AnalysisResults';
import MindMapViewer from '@features/visualization/components/MindMapViewer';
import ArchitectureViewer from '@features/visualization/components/ArchitectureViewer';
import CodeExplorer from '@features/exploration/components/CodeExplorer';
import SearchInterface from '@features/search/components/SearchInterface';
import { performanceMonitor } from '@shared/utils';
import type { AnalysisData, CodeElement } from '@shared/types';

function App() {
  const [analysisTriggered, setAnalysisTriggered] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [selectedElement, setSelectedElement] = useState<CodeElement | null>(null);
  const { success, error } = useNotifications();

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
    setAnalysisTriggered(false);
    setAnalysisData(null);
  };

  const handleAnalysisComplete = (message = 'Analysis completed successfully') => {
    setLoading(false);
    setAnalysisTriggered(true);
    success(message);
  };

  const handleAnalysisError = (errorMessage: string) => {
    setLoading(false);
    error(errorMessage);
    setAnalysisTriggered(false);
    setAnalysisData(null);
  };

  const handleReset = () => {
    setAnalysisTriggered(false);
    setAnalysisData(null);
    setLoading(false);
    setCurrentView('home');
  };

  const handleDataLoaded = (data: AnalysisData) => {
    setAnalysisData(data);
  };



  const handleViewChange = (view: string) => {
    setCurrentView(view);
  };

  const handleElementSelect = (element: CodeElement) => {
    setSelectedElement(element);
    // Switch to Code Explorer view to show the selected element
    setCurrentView('code-explorer');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return (
          <Container maxWidth="xl" className="fade-in">
            <Box sx={{ 
              mb: { xs: 3, sm: 4 }, 
              textAlign: 'center',
              animation: 'fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <Typography 
                variant="h3" 
                component="h2" 
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
          </Container>
        );

      case 'mindmap':
        return analysisData ? (
          <Container maxWidth="xl" className="fade-in">
            <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Mind Map View
            </Typography>
            <Box sx={{ 
              backgroundColor: 'background.paper',
              borderRadius: 2,
              minHeight: '600px',
              boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)'
            }}>
              <MindMapViewer data={analysisData} />
            </Box>
          </Container>
        ) : (
          <Container maxWidth="xl">
            <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Please analyze a project first to view the mind map.
            </Typography>
          </Container>
        );

      case 'architecture':
        return analysisData ? (
          <Container maxWidth="xl" className="fade-in">
            <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Architecture View
            </Typography>
            <Box sx={{ 
              backgroundColor: 'background.paper',
              borderRadius: 2,
              minHeight: '600px',
              boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)'
            }}>
              <ArchitectureViewer data={analysisData} />
            </Box>
          </Container>
        ) : (
          <Container maxWidth="xl">
            <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Please analyze a project first to view the architecture.
            </Typography>
          </Container>
        );

      case 'code-explorer':
        return analysisData ? (
          <Container maxWidth="xl" className="fade-in">
            <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Code Explorer
            </Typography>
            <Box sx={{ 
              backgroundColor: 'background.paper',
              borderRadius: 2,
              minHeight: '600px',
              boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)'
            }}>
              <CodeExplorer data={analysisData} selectedElement={selectedElement} />
            </Box>
          </Container>
        ) : (
          <Container maxWidth="xl">
            <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Please analyze a project first to explore the code.
            </Typography>
          </Container>
        );

      case 'search':
        return analysisData ? (
          <Container maxWidth="xl" className="fade-in">
            <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Search Interface
            </Typography>
            <Box sx={{ 
              backgroundColor: 'background.paper',
              borderRadius: 2,
              minHeight: '600px',
              boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)'
            }}>
              <SearchInterface data={analysisData} onElementSelect={handleElementSelect} />
            </Box>
          </Container>
        ) : (
          <Container maxWidth="xl">
            <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Please analyze a project first to search through the code.
            </Typography>
          </Container>
        );

      default:
        return (
          <Container maxWidth="xl">
            <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              View not found.
            </Typography>
          </Container>
        );
    }
  };

  return (
    <AppShell currentView={currentView} onViewChange={handleViewChange}>
      {renderContent()}
    </AppShell>
  );
}

export default App;