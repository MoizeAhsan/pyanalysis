import { useEffect, useCallback, useMemo } from 'react';
import { Container, Box, Typography } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import { AppShell } from './components/AppShell';
import { AnimatedPage } from '@shared/components/AnimatedPage';
import { useNotifications } from '@shared/components/NotificationSystem';
import { AccessibilityButton } from '@shared/components/AccessibilitySettings';
import {
  useAnalysisTriggered,
  useAnalysisData,
  useLoading,
  useCurrentView,
  useSelectedElement,
  useSetAnalysisTriggered,
  useSetAnalysisData,
  useSetLoading,
  useSetCurrentView,
  useSetSelectedElement
} from '@shared/stores/appStore';
import ProjectInput from '@features/analysis/components/ProjectInput';
import AnalysisResults from '@features/analysis/components/AnalysisResults';
import {
  LazyMindMapViewer,
  LazyArchitectureViewer,
  LazyCodeExplorer,
  LazySearchInterface,
  LazyVisualizationDemo,
  preloadMindMapViewer,
  preloadArchitectureViewer,
  preloadCodeExplorer
} from './components/LazyRoutes';
import type { AnalysisData, CodeElement } from '@shared/types';

function App() {
  // Use individual Zustand selectors to prevent object recreation
  const analysisTriggered = useAnalysisTriggered();
  const analysisData = useAnalysisData();
  const loading = useLoading();
  const currentView = useCurrentView();
  const selectedElement = useSelectedElement();
  const setAnalysisTriggered = useSetAnalysisTriggered();
  const setAnalysisData = useSetAnalysisData();
  const setLoading = useSetLoading();
  const setCurrentView = useSetCurrentView();
  const setSelectedElement = useSetSelectedElement();
  const { success, error } = useNotifications();

  // Preload critical components when analysis data is available
  useEffect(() => {
    if (analysisData) {
      // Preload visualization components likely to be used
      preloadMindMapViewer();
      preloadArchitectureViewer();
      preloadCodeExplorer();
    }
  }, [analysisData]);

  const handleAnalysisStart = useCallback(() => {
    setLoading(true);
    setAnalysisTriggered(false);
    setAnalysisData(null);
  }, [setLoading, setAnalysisTriggered, setAnalysisData]);

  const handleAnalysisComplete = useCallback((message = 'Analysis completed successfully') => {
    setLoading(false);
    setAnalysisTriggered(true);
    success(message);
  }, [setLoading, setAnalysisTriggered, success]);

  const handleAnalysisError = useCallback((errorMessage: string) => {
    setLoading(false);
    error(errorMessage);
    setAnalysisTriggered(false);
    setAnalysisData(null);
  }, [setLoading, error, setAnalysisTriggered, setAnalysisData]);

  const handleReset = useCallback(() => {
    setAnalysisTriggered(false);
    setAnalysisData(null);
    setLoading(false);
    setCurrentView('home');
  }, [setAnalysisTriggered, setAnalysisData, setLoading, setCurrentView]);

  const handleDataLoaded = useCallback((data: AnalysisData) => {
    setAnalysisData(data);
  }, [setAnalysisData]);

  const handleViewChange = useCallback((view: string) => {
    setCurrentView(view);
  }, [setCurrentView]);

  const handleElementSelect = useCallback((element: CodeElement) => {
    setSelectedElement(element);
    // Switch to Code Explorer view to show the selected element
    setCurrentView('code-explorer');
  }, [setSelectedElement, setCurrentView]);

  // Memoize the main content components to prevent unnecessary re-renders
  const homeContent = useMemo(() => (
    <AnimatedPage pageKey="home">
      <Container maxWidth="xl" className="fade-in" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        <Box sx={{
          mb: { xs: 2, sm: 3, md: 4 },
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
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem', lg: '3rem' },
              lineHeight: { xs: 1.3, sm: 1.2 },
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: { xs: 1.5, sm: 2 },
              px: { xs: 1, sm: 0 }
            }}
            className="responsive-title"
          >
            Visual Python Project Explorer
          </Typography>
          <Typography
            variant="h6"
            component="p"
            color="text.secondary"
            sx={{
              maxWidth: { xs: '100%', sm: 600 },
              mx: 'auto',
              fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
              lineHeight: 1.6,
              fontWeight: 400,
              px: { xs: 2, sm: 0 }
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
    </AnimatedPage>
  ), [analysisTriggered, loading, handleAnalysisStart, handleAnalysisComplete, handleAnalysisError, handleReset, handleDataLoaded]);

  const noDataMessage = useMemo(() => (
    <AnimatedPage pageKey="no-data">
      <Container maxWidth="xl">
        <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Please analyze a project first to view this section.
        </Typography>
      </Container>
    </AnimatedPage>
  ), []);

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return homeContent;

      case 'mindmap':
        return analysisData ? (
          <AnimatedPage pageKey="mindmap">
            <Container maxWidth="xl" className="fade-in" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
              <Typography 
                variant="h4" 
                component="h2" 
                gutterBottom 
                sx={{ 
                  fontWeight: 600, 
                  mb: { xs: 2, sm: 3 },
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
                }}
              >
                Mind Map View
              </Typography>
              <Box sx={{
                backgroundColor: 'background.paper',
                borderRadius: { xs: 1, sm: 2 },
                minHeight: { xs: '400px', sm: '500px', md: '600px' },
                height: { xs: 'calc(100vh - 200px)', sm: 'auto' },
                boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden'
              }}>
                <LazyMindMapViewer data={analysisData} />
              </Box>
            </Container>
          </AnimatedPage>
        ) : noDataMessage;

      case 'architecture':
        return analysisData ? (
          <AnimatedPage pageKey="architecture">
            <Container maxWidth="xl" className="fade-in" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
              <Typography 
                variant="h4" 
                component="h2" 
                gutterBottom 
                sx={{ 
                  fontWeight: 600, 
                  mb: { xs: 2, sm: 3 },
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
                }}
              >
                Architecture View
              </Typography>
              <Box sx={{
                backgroundColor: 'background.paper',
                borderRadius: { xs: 1, sm: 2 },
                minHeight: { xs: '400px', sm: '500px', md: '600px' },
                height: { xs: 'calc(100vh - 200px)', sm: 'auto' },
                boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden'
              }}>
                <LazyArchitectureViewer data={analysisData} />
              </Box>
            </Container>
          </AnimatedPage>
        ) : noDataMessage;

      case 'code-explorer':
        return analysisData ? (
          <AnimatedPage pageKey="code-explorer">
            <Container maxWidth="xl" className="fade-in" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
              <Typography 
                variant="h4" 
                component="h2" 
                gutterBottom 
                sx={{ 
                  fontWeight: 600, 
                  mb: { xs: 2, sm: 3 },
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
                }}
              >
                Code Explorer
              </Typography>
              <Box sx={{
                backgroundColor: 'background.paper',
                borderRadius: { xs: 1, sm: 2 },
                minHeight: { xs: '400px', sm: '500px', md: '600px' },
                boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)',
                overflow: 'auto'
              }}>
                <LazyCodeExplorer data={analysisData} selectedElement={selectedElement} />
              </Box>
            </Container>
          </AnimatedPage>
        ) : noDataMessage;

      case 'search':
        return analysisData ? (
          <AnimatedPage pageKey="search">
            <Container maxWidth="xl" className="fade-in" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
              <Typography 
                variant="h4" 
                component="h2" 
                gutterBottom 
                sx={{ 
                  fontWeight: 600, 
                  mb: { xs: 2, sm: 3 },
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
                }}
              >
                Search Interface
              </Typography>
              <Box sx={{
                backgroundColor: 'background.paper',
                borderRadius: { xs: 1, sm: 2 },
                minHeight: { xs: '400px', sm: '500px', md: '600px' },
                boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)',
                overflow: 'auto'
              }}>
                <LazySearchInterface data={analysisData} onElementSelect={handleElementSelect} />
              </Box>
            </Container>
          </AnimatedPage>
        ) : noDataMessage;

      case 'visualization-demo':
        return (
          <AnimatedPage pageKey="visualization-demo">
            <Container maxWidth="xl" className="fade-in">
              <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                🚀 Modernized Visualization Components
              </Typography>
              <Box sx={{
                backgroundColor: 'background.paper',
                borderRadius: 2,
                minHeight: '600px',
                boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)'
              }}>
                <LazyMindMapViewer />
              </Box>
            </Container>
          </AnimatedPage>
        );

      case 'component-demo':
        return (
          <AnimatedPage pageKey="component-demo">
            <Container maxWidth="xl" className="fade-in">
              <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                🎮 Interactive Visualization Demo
              </Typography>
              <Box sx={{
                backgroundColor: 'background.paper',
                borderRadius: 2,
                minHeight: '600px',
                boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08)'
              }}>
                <LazyVisualizationDemo />
              </Box>
            </Container>
          </AnimatedPage>
        );

      default:
        return (
          <AnimatedPage pageKey="404">
            <Container maxWidth="xl">
              <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                View not found.
              </Typography>
            </Container>
          </AnimatedPage>
        );
    }
  };

  return (
    <AppShell currentView={currentView} onViewChange={handleViewChange}>
      <AnimatePresence mode="wait" initial={false}>
        {renderContent()}
      </AnimatePresence>
      
      {/* Accessibility Settings Button */}
      <AccessibilityButton />
    </AppShell>
  );
}

export default App;