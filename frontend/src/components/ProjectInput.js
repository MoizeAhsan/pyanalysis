import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Alert
} from '@mui/material';
import { FolderOpen, Refresh } from '@mui/icons-material';

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
    <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
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
          sx={{ mb: 2 }}
        />
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<FolderOpen />}
            onClick={handleAnalyze}
            disabled={loading}
            size="large"
          >
            {loading ? 'Analyzing...' : 'Analyze Project'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleReset}
            disabled={loading}
            size="large"
          >
            Reset
          </Button>
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