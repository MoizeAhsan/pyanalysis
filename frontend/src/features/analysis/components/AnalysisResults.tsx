import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Assessment,
  AccountTree,
  Speed,
  DataArray
} from '@mui/icons-material';
import { performanceMonitor } from '@shared/utils';
import { apiService } from '@shared/services/api';
import type { AnalysisData } from '@shared/types';

interface AnalysisResultsProps {
  analysisTriggered: boolean;
  onDataLoaded: (data: AnalysisData) => void;
  loading: boolean;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = memo(({
  analysisTriggered,
  onDataLoaded,
  loading
}) => {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // Clear local state when analysis is reset (analysisTriggered becomes false)
  useEffect(() => {
    if (!analysisTriggered) {
      setData(null);
      setError(null);
      setCurrentTab(0);
      setIsFetching(false);
    }
  }, [analysisTriggered]);

  // Fetch analysis data when analysis completes
  useEffect(() => {
    if (analysisTriggered && !loading) {
      const fetchAnalysisData = async () => {
        setIsFetching(true);
        setError(null);
        performanceMonitor.startTiming('fetch-analysis-data');
        
        try {
          const response = await apiService.getAnalysisData();
          
          if (response.success && response.data) {
            const analysisData = response.data;
            
            // Check if we have actual data
            if (!analysisData.has_data) {
              setError('No analysis data available. Please analyze a project first.');
              setData(null);
            } else {
              setData(analysisData);
              onDataLoaded(analysisData);
            }
          } else {
            setError(response.message || 'Failed to load analysis data');
            setData(null);
          }
        } catch (err) {
          const errorMessage = apiService.getErrorMessage(err);
          setError(errorMessage);
          setData(null);
        } finally {
          setIsFetching(false);
          performanceMonitor.endTiming('fetch-analysis-data');
        }
      };

      fetchAnalysisData();
    }
  }, [analysisTriggered, loading, onDataLoaded]);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  }, []);

  if (loading || isFetching) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          {loading ? 'Analyzing project...' : 'Loading analysis data...'}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!data) return null;

  const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );

  // Use statistics from API response
  const modulesCount = data.statistics?.modules_count ?? data.modules.length;
  const classesCount = data.statistics?.classes_count ?? data.classes.length;
  const functionsCount = data.statistics?.functions_count ?? data.functions.length;
  const totalElements = data.statistics?.total_elements ?? (modulesCount + classesCount + functionsCount);
  const dependencyCount = data.dependency_graph?.edges?.length ?? 0;

  // Get project info
  const projectName = data.project_info?.name ?? 'Unknown Project';
  const totalFiles = data.project_info?.total_files ?? 0;
  const totalLines = data.project_info?.total_lines ?? 0;

  return (
    <Box sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Assessment />
          Analysis Results
        </Typography>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Project
                </Typography>
                <Typography variant="h6">
                  {projectName}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {totalFiles} files • {totalLines.toLocaleString()} lines
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Code Elements
                </Typography>
                <Typography variant="h6">
                  {totalElements}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip label={`${modulesCount} Modules`} size="small" color="primary" sx={{ mr: 0.5, mb: 0.5 }} />
                  <Chip label={`${classesCount} Classes`} size="small" color="success" sx={{ mr: 0.5, mb: 0.5 }} />
                  <Chip label={`${functionsCount} Functions`} size="small" color="warning" sx={{ mr: 0.5, mb: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Dependencies
                </Typography>
                <Typography variant="h6">
                  {dependencyCount}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Import relationships
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Patterns
                </Typography>
                <Typography variant="h6">
                  {data.architectural_patterns?.length ?? 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Architectural patterns
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Tabbed Content */}
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange}>
              <Tab label="Modules" icon={<DataArray />} />
              <Tab label="Functions" icon={<Speed />} />
              <Tab label="Classes" icon={<Assessment />} />
              <Tab label="Dependencies" icon={<AccountTree />} />
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            <Typography variant="h6" gutterBottom>
              Modules ({modulesCount})
            </Typography>
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              <List>
                {data.modules.map((module, index) => (
                  <ListItem key={module.id || index} divider>
                    <ListItemText
                      primary={module.name}
                      secondary={`${module.location?.file_path ?? 'Unknown path'} • Line ${module.location?.line_number ?? 0}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <Typography variant="h6" gutterBottom>
              Functions ({functionsCount})
            </Typography>
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              <List>
                {data.functions.map((func, index) => (
                  <ListItem key={func.id || index} divider>
                    <ListItemText
                      primary={func.name}
                      secondary={`${func.location?.file_path ?? 'Unknown'} • Line ${func.location?.line_number ?? 0} • ${func.parameters?.length ?? 0} parameters`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <Typography variant="h6" gutterBottom>
              Classes ({classesCount})
            </Typography>
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              <List>
                {data.classes.map((cls, index) => (
                  <ListItem key={cls.id || index} divider>
                    <ListItemText
                      primary={cls.name}
                      secondary={`${cls.location?.file_path ?? 'Unknown'} • Line ${cls.location?.line_number ?? 0}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            <Typography variant="h6" gutterBottom>
              Dependencies ({dependencyCount})
            </Typography>
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              <List>
                {(data.dependency_graph?.edges ?? []).map((edge, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={`${edge.source} → ${edge.target}`}
                      secondary={`Type: ${edge.relationship_type}${edge.weight ? ` • Weight: ${edge.weight}` : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
});

AnalysisResults.displayName = 'AnalysisResults';

export default AnalysisResults;