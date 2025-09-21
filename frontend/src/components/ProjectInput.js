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

const ProjectInput = ({ onAnalysisComplete, onReset }) => {
  const [projectPath, setProjectPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAnalyze = async () => {
    if (!projectPath.trim()) {
      setError('Please enter a project path');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_path: projectPath }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'Analysis completed successfully');
        if (onAnalysisComplete) {
          onAnalysisComplete();
        }
      } else {
        setError(data.message || 'Analysis failed');
      }
    } catch (err) {
      setError('Failed to connect to analysis service');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/reset', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'Analysis reset successfully');
        setProjectPath('');
        if (onReset) {
          onReset();
        }
      } else {
        setError(data.message || 'Reset failed');
      }
    } catch (err) {
      setError('Failed to reset analysis');
      console.error('Reset error:', err);
    } finally {
      setLoading(false);
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
    </Paper>
  );
};

export default ProjectInput;