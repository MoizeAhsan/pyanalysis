import React, { useState } from 'react';
import {
  Box,
  TextField,
  Paper,
  Typography,
  Alert
} from '@mui/material';
import { FolderOpen, Refresh } from '@mui/icons-material';
import EnhancedButton from './EnhancedButton';

const ProjectInput = ({ onAnalysisStart, onAnalysisComplete, onAnalysisError, onReset, loading = false }) => {
  const [projectPath, setProjectPath] = useState('');
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');

  const handleAnalyze = async () => {
    if (!projectPath.trim()) {
      setLocalError('Please enter a project path');
      return;
    }

    setLocalError('');
    setLocalSuccess('');
    
    if (onAnalysisStart) {
      onAnalysisStart();
    }

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_path: projectPath }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLocalSuccess(data.message || 'Analysis completed successfully');
        if (onAnalysisComplete) {
          onAnalysisComplete(data.message);
        }
      } else {
        const errorMessage = data.detail || data.message || 'Analysis failed';
        setLocalError(errorMessage);
        if (onAnalysisError) {
          onAnalysisError(errorMessage);
        }
      }
    } catch (err) {
      const errorMessage = 'Failed to connect to analysis service. Make sure the backend is running.';
      setLocalError(errorMessage);
      if (onAnalysisError) {
        onAnalysisError(errorMessage);
      }
      console.error('Analysis error:', err);
    }
  };

  const handleReset = async () => {
    setLocalError('');
    setLocalSuccess('');

    try {
      const response = await fetch('/api/reset', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLocalSuccess(data.message || 'Analysis reset successfully');
        setProjectPath('');
        if (onReset) {
          onReset();
        }
      } else {
        const errorMessage = data.detail || data.message || 'Reset failed';
        setLocalError(errorMessage);
      }
    } catch (err) {
      const errorMessage = 'Failed to reset analysis. Make sure the backend is running.';
      setLocalError(errorMessage);
      console.error('Reset error:', err);
    }
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: { xs: 3, sm: 4 }, 
        mb: { xs: 3, sm: 4 },
        borderRadius: 3,
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        border: '1px solid rgba(25, 118, 210, 0.08)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: '0px 8px 32px rgba(25, 118, 210, 0.12)',
          transform: 'translateY(-2px)',
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
          mb: 3
        }}
      >
        <FolderOpen sx={{ fontSize: '1.2em' }} />
        Project Analysis
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Python Project Path"
          placeholder="/path/to/your/python/project"
          value={projectPath}
          onChange={(e) => setProjectPath(e.target.value)}
          variant="outlined"
          sx={{ 
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: '2px',
                },
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
                boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)',
              },
            },
            '& .MuiInputLabel-root': {
              fontWeight: 500,
            }
          }}
        />
        
        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          '& > *': {
            flex: { xs: '1', sm: 'none' }
          }
        }}>
          <EnhancedButton
            variant="contained"
            startIcon={<FolderOpen />}
            onClick={handleAnalyze}
            loading={loading}
            size="large"
            hoverEffect="lift"
            sx={{
              py: 1.5,
              px: 3,
              fontSize: '1rem',
              background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              boxShadow: '0px 4px 16px rgba(25, 118, 210, 0.3)',
            }}
          >
            {loading ? 'Analyzing...' : 'Analyze Project'}
          </EnhancedButton>
          
          <EnhancedButton
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleReset}
            disabled={loading}
            size="large"
            hoverEffect="lift"
            sx={{
              py: 1.5,
              px: 3,
              fontSize: '1rem',
              borderWidth: 2,
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderWidth: 2,
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                borderColor: 'primary.dark',
                color: 'primary.dark',
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