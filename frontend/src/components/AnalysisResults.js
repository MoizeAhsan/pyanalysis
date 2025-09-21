import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Description,
  Class,
  Functions,
  ImportExport,
  Folder,
  Code
} from '@mui/icons-material';
import apiService from '../services/api';

const AnalysisResults = ({ analysisTriggered, onDataLoaded }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (analysisTriggered) {
      fetchAnalysisData();
    }
  }, [analysisTriggered]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalysisData = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await apiService.getAnalysisData();
      console.log('Analysis data received:', result); // Debug log
      setData(result);
      if (onDataLoaded) {
        onDataLoaded(result);
      }
    } catch (err) {
      setError('Failed to fetch analysis data');
      console.error('Error fetching analysis data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading analysis results...
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  // Parse the actual API response structure
  // The API returns: { success: true, message: "...", data: { ... } }
  const responseData = data.data || data; // Handle both wrapped and unwrapped responses

  const {
    project_info = {},
    modules = [],
    classes = [],
    functions = [],
    statistics = {},
    has_data = false
  } = responseData;

  // If no data is available, show appropriate message
  if (!has_data && !project_info.name) {
    return (
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No analysis data available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please analyze a project first to see results
        </Typography>
      </Paper>
    );
  }

  // Extract statistics with fallbacks
  const stats = {
    total_files: project_info.total_files || statistics.total_files || 0,
    total_lines: project_info.total_lines || statistics.total_lines || 0,
    modules_count: statistics.modules_count || modules.length || 0,
    classes_count: statistics.classes_count || classes.length || 0,
    functions_count: statistics.functions_count || functions.length || 0
  };

  return (
    <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Analysis Results
      </Typography>

      {/* Project Overview */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Project Overview
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Folder color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {stats.total_files}
                </Typography>
                <Typography color="text.secondary">
                  Python Files
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Code color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {stats.total_lines}
                </Typography>
                <Typography color="text.secondary">
                  Lines of Code
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Class color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {stats.classes_count}
                </Typography>
                <Typography color="text.secondary">
                  Classes
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Functions color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {stats.functions_count}
                </Typography>
                <Typography color="text.secondary">
                  Functions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Parsed Files */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Parsed Files ({stats.modules_count})
          </Typography>
          <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
            <List dense>
              {Array.isArray(modules) && modules.length > 0 ? (
                <>
                  {modules.slice(0, 20).map((module, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Description color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={module.name || `Module ${index + 1}`}
                        secondary={`${module.location?.file_path || 'Unknown file'}`}
                      />
                      <Chip
                        label={module.type || 'module'}
                        size="small"
                        variant="outlined"
                      />
                    </ListItem>
                  ))}
                  {modules.length > 20 && (
                    <ListItem>
                      <ListItemText
                        primary={`... and ${modules.length - 20} more files`}
                        sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                      />
                    </ListItem>
                  )}
                </>
              ) : stats.modules_count > 0 ? (
                <ListItem>
                  <ListItemIcon>
                    <Description color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Module details not available"
                    secondary={`${stats.modules_count} modules found`}
                    sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                  />
                </ListItem>
              ) : (
                <ListItem>
                  <ListItemText
                    primary="No modules found"
                    sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Code Elements
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Classes ({stats.classes_count})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {Array.isArray(classes) && classes.length > 0 ? (
                  <>
                    {classes.slice(0, 10).map((cls, index) => (
                      <Chip
                        key={index}
                        label={cls.name || `Class ${index + 1}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                    {classes.length > 10 && (
                      <Chip
                        label={`+${classes.length - 10} more`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </>
                ) : stats.classes_count > 0 ? (
                  <Chip
                    label={`${stats.classes_count} classes found (details not available)`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No classes found
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Functions ({stats.functions_count})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {Array.isArray(functions) && functions.length > 0 ? (
                  <>
                    {functions.slice(0, 10).map((func, index) => (
                      <Chip
                        key={index}
                        label={func.name || `Function ${index + 1}`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    ))}
                    {functions.length > 10 && (
                      <Chip
                        label={`+${functions.length - 10} more`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </>
                ) : stats.functions_count > 0 ? (
                  <Chip
                    label={`${stats.functions_count} functions found (details not available)`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No functions found
                  </Typography>
                )}
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Dependencies
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {responseData.dependency_graph?.edges?.length > 0 ? (
                  <>
                    <Chip
                      label={`${responseData.dependency_graph.edges.length} dependencies found`}
                      size="small"
                      color="default"
                      variant="outlined"
                      icon={<ImportExport />}
                    />
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No dependencies analyzed
                  </Typography>
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Project Info */}
      {project_info.name && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Project Information
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2">
              <strong>Name:</strong> {project_info.name}
            </Typography>
            <Typography variant="body2">
              <strong>Path:</strong> {project_info.path}
            </Typography>
            <Typography variant="body2">
              <strong>Languages:</strong> {project_info.languages?.join(', ') || 'Python'}
            </Typography>
            {project_info.analysis_timestamp && (
              <Typography variant="body2">
                <strong>Analyzed:</strong> {new Date(project_info.analysis_timestamp).toLocaleString()}
              </Typography>
            )}
          </Paper>
        </Box>
      )}
    </Paper>
  );
};

export default AnalysisResults;