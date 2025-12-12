import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Alert,
  Box
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
import VirtualList from './VirtualList';
import { apiService } from '@shared/services/api';
import { usePerformanceMonitor } from '../utils/performance';

const AnalysisResults = ({ analysisTriggered, onDataLoaded, loading: parentLoading = false }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { startTiming, endTiming } = usePerformanceMonitor();

  const fetchAnalysisData = useCallback(async () => {
    setLoading(true);
    setError('');
    startTiming('fetch-analysis-data');

    try {
      const result = await apiService.getAnalysisData();
      console.log('Analysis data received:', result); // Debug log
      setData(result);
      if (onDataLoaded) {
        onDataLoaded(result);
      }
      endTiming('fetch-analysis-data');
    } catch (err) {
      setError('Failed to fetch analysis data');
      console.error('Error fetching analysis data:', err);
      endTiming('fetch-analysis-data');
    } finally {
      setLoading(false);
    }
  }, [onDataLoaded, startTiming, endTiming]);

  // Parse the actual API response structure
  // The API returns: { success: true, message: "...", data: { ... } }
  const responseData = data?.data || data || {}; // Handle both wrapped and unwrapped responses

  const {
    project_info = {},
    modules = [],
    classes = [],
    functions = [],
    statistics = {},
    has_data = false
  } = responseData;

  // Memoize expensive computations - must be at top level
  const stats = useMemo(() => ({
    total_files: project_info.total_files || statistics.total_files || 0,
    total_lines: project_info.total_lines || statistics.total_lines || 0,
    modules_count: statistics.modules_count || modules.length || 0,
    classes_count: statistics.classes_count || classes.length || 0,
    functions_count: statistics.functions_count || functions.length || 0
  }), [project_info, statistics, modules.length, classes.length, functions.length]);

  // Memoize render functions for better performance - must be at top level
  const renderModuleItem = useCallback((module, index) => (
    <Box key={module.id || index} sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <Description color="action" sx={{ mr: 2 }} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          {module.name || `Module ${index + 1}`}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {module.location?.file_path || 'Unknown file'}
        </Typography>
      </Box>
      <Chip
        label={module.type || 'module'}
        size="small"
        variant="outlined"
        sx={{ ml: 1 }}
      />
    </Box>
  ), []);

  const renderClassChip = useCallback((cls, index) => (
    <Chip
      key={cls.id || index}
      label={cls.name || `Class ${index + 1}`}
      size="small"
      color="primary"
      variant="outlined"
      sx={{ mr: 0.5, mb: 0.5 }}
    />
  ), []);

  const renderFunctionChip = useCallback((func, index) => (
    <Chip
      key={func.id || index}
      label={func.name || `Function ${index + 1}`}
      size="small"
      color="secondary"
      variant="outlined"
      sx={{ mr: 0.5, mb: 0.5 }}
    />
  ), []);

  useEffect(() => {
    if (analysisTriggered) {
      fetchAnalysisData();
    }
  }, [analysisTriggered, fetchAnalysisData]);

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
              modules.length > 50 ? (
                // Use VirtualList for large datasets
                <VirtualList
                  items={modules}
                  renderItem={renderModuleItem}
                  itemHeight={72}
                  containerHeight={400}
                  overscan={5}
                />
              ) : (
                // Use LazyList for smaller datasets
                <LazyList
                  items={modules}
                  initialBatchSize={10}
                  batchSize={15}
                  maxItems={100}
                  renderItem={renderModuleItem}
                  sx={{ maxHeight: 400, overflow: 'auto' }}
                />
              )
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
                  initialBatchSize={20}
                  batchSize={20}
                  maxItems={100}
                  renderItem={renderClassChip}
                  showLoadMore={classes.length > 20}
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
                  initialBatchSize={20}
                  batchSize={20}
                  maxItems={100}
                  renderItem={renderFunctionChip}
                  showLoadMore={functions.length > 20}
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