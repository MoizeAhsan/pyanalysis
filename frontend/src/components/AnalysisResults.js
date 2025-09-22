import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Description,
  Class,
  Functions,
  ImportExport,
  Folder,
  Code,
  Assessment,
  Info
} from '@mui/icons-material';
import CollapsibleSection from './CollapsibleSection';
import LazyList from './LazyList';
import apiService from '../services/api';

const AnalysisResults = ({ analysisTriggered, onDataLoaded, loading: parentLoading = false }) => {
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

  if (loading || parentLoading) {
    return (
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {parentLoading ? 'Analyzing project...' : 'Loading analysis results...'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This may take a few moments for large projects
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
      <CollapsibleSection
        title="Project Overview"
        icon={<Assessment />}
        defaultExpanded={true}
      >
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
      </CollapsibleSection>

      {/* Parsed Files */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <CollapsibleSection
            title={`Parsed Files (${stats.modules_count})`}
            icon={<Description />}
            badge={stats.modules_count}
            defaultExpanded={stats.modules_count <= 10}
          >
            {Array.isArray(modules) && modules.length > 0 ? (
              <LazyList
                items={modules}
                initialBatchSize={10}
                batchSize={15}
                maxItems={100}
                renderItem={(module, index) => (
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
                )}
                sx={{ maxHeight: 400, overflow: 'auto' }}
              />
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
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                No modules found
              </Typography>
            )}
          </CollapsibleSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <CollapsibleSection
            title="Code Elements"
            icon={<Code />}
            defaultExpanded={true}
          >
            <CollapsibleSection
              title={`Classes (${stats.classes_count})`}
              icon={<Class />}
              badge={stats.classes_count}
              defaultExpanded={stats.classes_count <= 10 && stats.classes_count > 0}
              variant="outlined"
            >
              {Array.isArray(classes) && classes.length > 0 ? (
                <LazyList
                  items={classes}
                  initialBatchSize={10}
                  batchSize={15}
                  maxItems={50}
                  renderItem={(cls, index) => (
                    <Chip
                      key={index}
                      label={cls.name || `Class ${index + 1}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  )}
                  showLoadMore={false}
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
                />
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
            </CollapsibleSection>

            <CollapsibleSection
              title={`Functions (${stats.functions_count})`}
              icon={<Functions />}
              badge={stats.functions_count}
              defaultExpanded={stats.functions_count <= 10 && stats.functions_count > 0}
              variant="outlined"
            >
              {Array.isArray(functions) && functions.length > 0 ? (
                <LazyList
                  items={functions}
                  initialBatchSize={10}
                  batchSize={15}
                  maxItems={50}
                  renderItem={(func, index) => (
                    <Chip
                      key={index}
                      label={func.name || `Function ${index + 1}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  )}
                  showLoadMore={false}
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
                />
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
            </CollapsibleSection>

            <CollapsibleSection
              title="Dependencies"
              icon={<ImportExport />}
              badge={responseData.dependency_graph?.edges?.length || 0}
              defaultExpanded={false}
              variant="outlined"
            >
              {responseData.dependency_graph?.edges?.length > 0 ? (
                <Chip
                  label={`${responseData.dependency_graph.edges.length} dependencies found`}
                  size="small"
                  color="default"
                  variant="outlined"
                  icon={<ImportExport />}
                />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No dependencies analyzed
                </Typography>
              )}
            </CollapsibleSection>
          </CollapsibleSection>
        </Grid>
      </Grid>

      {/* Project Info */}
      {project_info.name && (
        <CollapsibleSection
          title="Project Information"
          icon={<Info />}
          defaultExpanded={false}
        >
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Name:</strong> {project_info.name}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Path:</strong> {project_info.path}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Languages:</strong> {project_info.languages?.join(', ') || 'Python'}
          </Typography>
          {project_info.analysis_timestamp && (
            <Typography variant="body2">
              <strong>Analyzed:</strong> {new Date(project_info.analysis_timestamp).toLocaleString()}
            </Typography>
          )}
        </CollapsibleSection>
      )}
    </Paper>
  );
};

export default AnalysisResults;