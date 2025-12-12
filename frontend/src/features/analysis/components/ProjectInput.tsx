import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Paper,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Collapse,
  Tooltip,
  InputAdornment,
  LinearProgress,
  CircularProgress,
  Skeleton,
  Fade,
  Slide,
} from '@mui/material';
import {
  FolderOpen,
  Refresh,
  History,
  Clear,
  CheckCircle,
  Error as ErrorIcon,
  ExpandMore,
  ExpandLess,
  Cancel,
} from '@mui/icons-material';
import EnhancedButton from '../../../components/EnhancedButton.jsx';
import { StatusAnnouncer } from '@shared/components/LiveRegion';
import { AriaDescription } from '@shared/components/AriaComponents';
import { apiService } from '@shared/services/api';

interface ProjectInputProps {
  onAnalysisStart: () => void;
  onAnalysisComplete: (message?: string) => void;
  onAnalysisError: (error: string) => void;
  onReset: () => void;
  loading: boolean;
}

interface AnalysisProgress {
  stage: string;
  progress: number;
  message: string;
  canCancel: boolean;
}

interface RecentProject {
  path: string;
  timestamp: number;
  lastAnalyzed: string;
}

interface ValidationResult {
  isValid: boolean;
  message: string;
  type: 'success' | 'warning' | 'error';
}

const RECENT_PROJECTS_KEY = 'python-analyzer-recent-projects';
const MAX_RECENT_PROJECTS = 5;

const ProjectInput: React.FC<ProjectInputProps> = ({
  onAnalysisStart,
  onAnalysisComplete,
  onAnalysisError,
  onReset,
  loading = false,
}) => {
  const [projectPath, setProjectPath] = useState('');
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [showRecentProjects, setShowRecentProjects] = useState(false);
  const [pathValidation, setPathValidation] = useState<ValidationResult | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showOptimisticUI, setShowOptimisticUI] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load recent projects from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (stored) {
      try {
        const projects = JSON.parse(stored) as RecentProject[];
        setRecentProjects(projects.slice(0, MAX_RECENT_PROJECTS));
      } catch (error) {
        console.warn('Failed to load recent projects:', error);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Real-time path validation
  useEffect(() => {
    if (!projectPath.trim()) {
      setPathValidation(null);
      return;
    }

    const validatePath = () => {
      const path = projectPath.trim();

      // Basic path validation
      if (path.length < 2) {
        setPathValidation({
          isValid: false,
          message: 'Path too short',
          type: 'error',
        });
        return;
      }

      // Check for common Python project indicators
      const hasPythonIndicators = /\.(py|pyw)$|__pycache__|\.pyc$|requirements\.txt|setup\.py|pyproject\.toml/i.test(path);
      const isAbsolutePath = /^([a-zA-Z]:\\|\/)/i.test(path);

      if (!isAbsolutePath) {
        setPathValidation({
          isValid: false,
          message: 'Please provide an absolute path',
          type: 'error',
        });
        return;
      }

      if (hasPythonIndicators || path.includes('python') || path.includes('py')) {
        setPathValidation({
          isValid: true,
          message: 'Valid Python project path',
          type: 'success',
        });
      } else {
        setPathValidation({
          isValid: true,
          message: 'Path looks valid, but no Python files detected',
          type: 'warning',
        });
      }
    };

    const timeoutId = setTimeout(validatePath, 300);
    return () => clearTimeout(timeoutId);
  }, [projectPath]);

  // Save project to recent projects
  const saveToRecentProjects = useCallback((path: string) => {
    const newProject: RecentProject = {
      path,
      timestamp: Date.now(),
      lastAnalyzed: new Date().toLocaleString(),
    };

    setRecentProjects(prev => {
      const filtered = prev.filter(p => p.path !== path);
      const updated = [newProject, ...filtered].slice(0, MAX_RECENT_PROJECTS);
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);



  const simulateProgressUpdates = useCallback(() => {
    const stages = [
      { stage: 'Initializing', progress: 10, message: 'Setting up analysis environment...', canCancel: true },
      { stage: 'Scanning', progress: 25, message: 'Scanning project files...', canCancel: true },
      { stage: 'Parsing', progress: 50, message: 'Parsing Python code...', canCancel: true },
      { stage: 'Analyzing', progress: 75, message: 'Analyzing dependencies and structure...', canCancel: false },
      { stage: 'Finalizing', progress: 90, message: 'Generating results...', canCancel: false },
    ];

    let currentStage = 0;
    const updateProgress = () => {
      if (currentStage < stages.length && isAnalyzing) {
        const currentStageData = stages[currentStage];
        if (currentStageData) {
          setAnalysisProgress(currentStageData);
        }
        currentStage++;
        setTimeout(updateProgress, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
      }
    };

    updateProgress();
  }, [isAnalyzing]);

  const handleAnalyze = async () => {
    if (!projectPath.trim()) {
      setLocalError('Please enter a project path');
      return;
    }

    if (pathValidation && !pathValidation.isValid) {
      setLocalError('Please fix the path validation errors before analyzing');
      return;
    }

    setLocalError('');
    setLocalSuccess('');
    setIsAnalyzing(true);
    setShowOptimisticUI(true);
    setAnalysisProgress({
      stage: 'Starting',
      progress: 0,
      message: 'Preparing to analyze project...',
      canCancel: true,
    });

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    if (onAnalysisStart) {
      onAnalysisStart();
    }

    // Start progress simulation
    simulateProgressUpdates();

    try {
      const result = await apiService.analyzeProject(projectPath);

      if (result.success) {
        setAnalysisProgress({
          stage: 'Complete',
          progress: 100,
          message: 'Analysis completed successfully!',
          canCancel: false,
        });

        // Show completion state briefly before clearing
        setTimeout(() => {
          setAnalysisProgress(null);
          setIsAnalyzing(false);
          setShowOptimisticUI(false);
        }, 1500);

        const successMessage = result.message || 'Analysis completed successfully';
        setLocalSuccess(successMessage);
        saveToRecentProjects(projectPath);
        if (onAnalysisComplete) {
          onAnalysisComplete(successMessage);
        }
      } else {
        const errorMessage = result.message || 'Analysis failed';
        setLocalError(errorMessage);
        setAnalysisProgress(null);
        setIsAnalyzing(false);
        setShowOptimisticUI(false);
        if (onAnalysisError) {
          onAnalysisError(errorMessage);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setLocalError('Analysis was cancelled');
        setAnalysisProgress(null);
        setIsAnalyzing(false);
        setShowOptimisticUI(false);
        return;
      }

      const errorMessage = apiService.getErrorMessage(err);
      setLocalError(errorMessage);
      setAnalysisProgress(null);
      setIsAnalyzing(false);
      setShowOptimisticUI(false);
      if (onAnalysisError) {
        onAnalysisError(errorMessage);
      }
      console.error('Analysis error:', err);
    }
  };

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setAnalysisProgress(null);
    setIsAnalyzing(false);
    setShowOptimisticUI(false);
    setLocalError('Analysis cancelled by user');
  };

  const handleReset = async () => {
    // Cancel any ongoing analysis
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setLocalError('');
    setLocalSuccess('');
    setAnalysisProgress(null);
    setIsAnalyzing(false);
    setShowOptimisticUI(false);

    try {
      const result = await apiService.resetAnalysis();

      if (result.success) {
        setLocalSuccess(result.message || 'Analysis reset successfully');
        setProjectPath('');
        setPathValidation(null);
        if (onReset) {
          onReset();
        }
      } else {
        const errorMessage = result.message || 'Reset failed';
        setLocalError(errorMessage);
      }
    } catch (err) {
      const errorMessage = apiService.getErrorMessage(err);
      setLocalError(errorMessage);
      console.error('Reset error:', err);
    }
  };

  const handleRecentProjectSelect = (project: RecentProject) => {
    setProjectPath(project.path);
    setShowRecentProjects(false);
    setLocalError('');
    setLocalSuccess('');
  };

  const clearRecentProjects = () => {
    setRecentProjects([]);
    localStorage.removeItem(RECENT_PROJECTS_KEY);
  };

  const getValidationIcon = () => {
    if (!pathValidation) return null;

    switch (pathValidation.type) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <ErrorIcon color="warning" />;
      default:
        return null;
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        mb: { xs: 2, sm: 3, md: 4 },
        borderRadius: { xs: 2, sm: 3 },
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        border: (theme) => `1px solid ${theme.palette.mode === 'dark'
          ? 'rgba(144, 202, 249, 0.12)'
          : 'rgba(25, 118, 210, 0.08)'}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        mx: { xs: 0, sm: 'auto' },
        '&:hover': {
          boxShadow: (theme) => theme.palette.mode === 'dark'
            ? '0px 8px 32px rgba(144, 202, 249, 0.15)'
            : '0px 8px 32px rgba(25, 118, 210, 0.12)',
          transform: { xs: 'none', sm: 'translateY(-2px)' },
        }
      }}
      className="hover-lift"
    >
      <Typography
        variant="h5"
        component="h2"
        gutterBottom
        sx={{
          fontWeight: 600,
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: { xs: 2, sm: 3 },
          fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' }
        }}
      >
        <FolderOpen sx={{ fontSize: { xs: '1.1em', sm: '1.2em' } }} />
        Project Analysis
      </Typography>

      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        {/* Progress Indicator */}
        {analysisProgress && (
          <Fade in={true}>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                mb: 3,
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)'
                  : 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
                border: (theme) => `1px solid ${theme.palette.mode === 'dark'
                  ? 'rgba(144, 202, 249, 0.3)'
                  : 'rgba(25, 118, 210, 0.2)'}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                    {analysisProgress.stage}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {analysisProgress.message}
                  </Typography>
                </Box>
                {analysisProgress.canCancel && (
                  <Tooltip title="Cancel analysis">
                    <IconButton
                      onClick={handleCancelAnalysis}
                      color="error"
                      sx={{
                        '&:hover': {
                          backgroundColor: 'error.light',
                          color: 'white',
                        },
                      }}
                    >
                      <Cancel />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={analysisProgress.progress}
                  sx={{
                    flexGrow: 1,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: (theme) => theme.palette.mode === 'dark'
                      ? 'rgba(144, 202, 249, 0.2)'
                      : 'rgba(25, 118, 210, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background: (theme) => theme.palette.mode === 'dark'
                        ? 'linear-gradient(45deg, #90caf9 30%, #64b5f6 90%)'
                        : 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                    },
                  }}
                />
                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600, minWidth: 40 }}>
                  {analysisProgress.progress}%
                </Typography>
              </Box>
            </Paper>
          </Fade>
        )}

        {/* Skeleton Loading State */}
        {showOptimisticUI && !analysisProgress && (
          <Slide direction="up" in={true}>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                mb: 3,
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #424242 0%, #616161 100%)'
                  : 'linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
                <Skeleton variant="text" width="40%" height={32} />
              </Box>
              <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 4, mb: 2 }} />
              <Skeleton variant="text" width="60%" height={20} />
            </Paper>
          </Slide>
        )}



        {/* Path Input Field */}
        <TextField
          fullWidth
          label="Python Project Path"
          placeholder="/path/to/python/project"
          value={projectPath}
          onChange={(e) => setProjectPath(e.target.value)}
          variant="outlined"
          size="medium"
          error={pathValidation?.type === 'error'}
          helperText={pathValidation?.message}
          slotProps={{
            htmlInput: {
              'aria-label': 'Enter the absolute path to your Python project directory',
              'aria-describedby': `${pathValidation ? 'path-validation-message' : ''} path-input-description`,
              'aria-invalid': pathValidation?.type === 'error',
              'aria-required': true,
              style: { fontSize: '0.875rem' }
            },
            input: {
              endAdornment: pathValidation && (
                <InputAdornment position="end">
                  {getValidationIcon() && (
                    <Tooltip title={pathValidation.message}>
                      <span role="img" aria-label={pathValidation.type}>{getValidationIcon()}</span>
                    </Tooltip>
                  )}
                </InputAdornment>
              ),
            },
          }}
          sx={{
            mb: { xs: 1.5, sm: 2 },
            '& .MuiOutlinedInput-root': {
              borderRadius: { xs: 1.5, sm: 2 },
              fontSize: { xs: '0.875rem', sm: '1rem' },
              backgroundColor: (theme) => theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(255, 255, 255, 0.8)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(255, 255, 255, 1)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: '2px',
                },
              },
              '&.Mui-focused': {
                backgroundColor: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(255, 255, 255, 1)',
                boxShadow: (theme) => theme.palette.mode === 'dark'
                  ? '0 0 0 3px rgba(144, 202, 249, 0.2)'
                  : '0 0 0 3px rgba(25, 118, 210, 0.1)',
              },
            },
            '& .MuiInputLabel-root': {
              fontWeight: 500,
            }
          }}
        />

        {/* Hidden descriptions for screen readers */}
        <AriaDescription id="path-input-description">
          Enter the full path to your Python project directory. The path should be absolute and contain Python files. Examples: /home/user/projects/my-python-app or C:\Users\user\projects\my-python-app
        </AriaDescription>

        {pathValidation && (
          <AriaDescription id="path-validation-message">
            Path validation: {pathValidation.message}
          </AriaDescription>
        )}

        {/* Status announcer for analysis progress */}
        <StatusAnnouncer
          status={
            isAnalyzing ? 'loading' :
            localError ? 'error' :
            localSuccess ? 'success' :
            'idle'
          }
          loadingMessage={analysisProgress?.message || 'Analyzing project...'}
          successMessage={localSuccess}
          errorMessage={localError}
        />

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <Box sx={{ mb: 2 }} role="region" aria-labelledby="recent-projects-heading">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <IconButton
                size="small"
                onClick={() => setShowRecentProjects(!showRecentProjects)}
                sx={{ color: 'primary.main' }}
                aria-expanded={showRecentProjects}
                aria-controls="recent-projects-list"
                aria-label={`${showRecentProjects ? 'Hide' : 'Show'} recent projects`}
              >
                <History />
              </IconButton>
              <Typography 
                id="recent-projects-heading"
                variant="body2" 
                color="primary.main" 
                sx={{ fontWeight: 500 }}
                component="h3"
              >
                Recent Projects ({recentProjects.length})
              </Typography>
              {showRecentProjects ? <ExpandLess aria-hidden="true" /> : <ExpandMore aria-hidden="true" />}
              <Box sx={{ flexGrow: 1 }} />
              <Tooltip title="Clear all recent projects">
                <IconButton 
                  size="small" 
                  onClick={clearRecentProjects}
                  aria-label="Clear all recent projects"
                >
                  <Clear fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Collapse in={showRecentProjects}>
              <Paper
                variant="outlined"
                sx={{
                  maxHeight: 200,
                  overflow: 'auto',
                  backgroundColor: (theme) => theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.02)'
                    : 'rgba(0, 0, 0, 0.02)',
                }}
                role="region"
                aria-label="Recent projects list"
              >
                <List 
                  dense 
                  id="recent-projects-list"
                  role="listbox"
                  aria-label="Select a recent project"
                >
                  {recentProjects.map((project, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemButton 
                        onClick={() => handleRecentProjectSelect(project)}
                        role="option"
                        aria-label={`Select project: ${project.path}, last analyzed ${project.lastAnalyzed}`}
                      >
                        <ListItemText
                          primary={project.path}
                          secondary={`Last analyzed: ${project.lastAnalyzed}`}
                          primaryTypographyProps={{
                            variant: 'body2',
                            sx: { fontFamily: 'monospace' }
                          }}
                          secondaryTypographyProps={{
                            variant: 'caption'
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Collapse>
          </Box>
        )}

        <Box sx={{
          display: 'flex',
          gap: { xs: 1.5, sm: 2 },
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          '& > *': {
            flex: { xs: '1', sm: 'none' }
          }
        }}>
          {isAnalyzing && analysisProgress?.canCancel ? (
            <EnhancedButton
              variant="contained"
              color="error"
              startIcon={<Cancel />}
              onClick={handleCancelAnalysis}
              size="large"
              hoverEffect="lift"
              sx={{
                py: { xs: 1.25, sm: 1.5 },
                px: { xs: 2, sm: 3 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                background: 'linear-gradient(45deg, #d32f2f 30%, #f44336 90%)',
                boxShadow: '0px 4px 16px rgba(211, 47, 47, 0.3)',
              }}
            >
              Cancel Analysis
            </EnhancedButton>
          ) : (
            <EnhancedButton
              variant="contained"
              startIcon={
                isAnalyzing ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <FolderOpen />
                )
              }
              onClick={handleAnalyze}
              loading={loading || isAnalyzing}
              size="large"
              hoverEffect="lift"
              disabled={pathValidation?.type === 'error' || isAnalyzing}
              sx={{
                py: { xs: 1.25, sm: 1.5 },
                px: { xs: 2, sm: 3 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                background: (theme) => {
                  if (isAnalyzing) {
                    return theme.palette.mode === 'dark'
                      ? 'linear-gradient(45deg, #616161 30%, #757575 90%)'
                      : 'linear-gradient(45deg, #757575 30%, #9e9e9e 90%)';
                  }
                  return theme.palette.mode === 'dark'
                    ? 'linear-gradient(45deg, #90caf9 30%, #64b5f6 90%)'
                    : 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)';
                },
                boxShadow: (theme) => {
                  const color = isAnalyzing ? '117, 117, 117' : theme.palette.mode === 'dark' ? '144, 202, 249' : '25, 118, 210';
                  return `0px 4px 16px rgba(${color}, 0.3)`;
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {isAnalyzing
                ? `Analyzing... ${analysisProgress?.progress || 0}%`
                : loading
                  ? 'Analyzing...'
                  : 'Analyze Project'
              }
            </EnhancedButton>
          )}

          <EnhancedButton
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleReset}
            disabled={loading || isAnalyzing}
            size="large"
            hoverEffect="lift"
            sx={{
              py: { xs: 1.25, sm: 1.5 },
              px: { xs: 2, sm: 3 },
              fontSize: { xs: '0.875rem', sm: '1rem' },
              borderWidth: 2,
              borderColor: isAnalyzing ? 'grey.400' : 'primary.main',
              color: isAnalyzing ? 'grey.400' : 'primary.main',
              '&:hover': {
                borderWidth: 2,
                backgroundColor: (theme) => {
                  if (isAnalyzing) return 'transparent';
                  return theme.palette.mode === 'dark'
                    ? 'rgba(144, 202, 249, 0.08)'
                    : 'rgba(25, 118, 210, 0.04)';
                },
                borderColor: isAnalyzing ? 'grey.400' : 'primary.dark',
                color: isAnalyzing ? 'grey.400' : 'primary.dark',
              }
            }}
          >
            Reset
          </EnhancedButton>
        </Box>
      </Box>

      {localError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {localError}
        </Alert>
      )}

      {localSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {localSuccess}
        </Alert>
      )}
    </Paper>
  );
};

export default ProjectInput;