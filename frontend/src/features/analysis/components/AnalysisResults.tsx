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

  // Mock data for demonstration - replace with actual API call
  const mockAnalysisData: AnalysisData = {
    project_name: "Sample Python Project",
    total_files: 25,
    total_lines: 5432,
    modules: [
      {
        name: "app",
        path: "/src/app.py",
        type: "module",
        lines_of_code: 234,
        functions: [
          { name: "main", line_number: 10, parameters: [] },
          { name: "init_app", line_number: 25, parameters: ["config"] }
        ],
        classes: [
          { name: "Application", line_number: 50, methods: [], attributes: [], inheritance: [] }
        ],
        imports: [
          { module: "flask", line_number: 1 },
          { module: "os", line_number: 2 }
        ]
      },
      {
        name: "models",
        path: "/src/models.py",
        type: "module",
        lines_of_code: 156,
        functions: [],
        classes: [
          { name: "User", line_number: 15, methods: [], attributes: [], inheritance: [] },
          { name: "Post", line_number: 45, methods: [], attributes: [], inheritance: [] }
        ],
        imports: []
      }
    ],
    dependencies: [
      { source: "app", target: "flask", type: "import" },
      { source: "models", target: "sqlalchemy", type: "import" },
      { source: "utils", target: "requests", type: "import" }
    ],
    architecture: {
      nodes: [],
      edges: [],
      layers: []
    },
    mindmap: {
      nodes: [],
      edges: []
    }
  };

  useEffect(() => {
    if (analysisTriggered && !loading) {
      performanceMonitor.startTiming('fetch-analysis-data');
      
      // Simulate API call
      setTimeout(() => {
        try {
          setData(mockAnalysisData);
          onDataLoaded(mockAnalysisData);
          setError(null);
          performanceMonitor.endTiming('fetch-analysis-data');
        } catch (err) {
          setError('Failed to load analysis data');
          performanceMonitor.endTiming('fetch-analysis-data');
        }
      }, 1000);
    }
  }, [analysisTriggered, loading, onDataLoaded]);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Analyzing project...
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

  const totalFunctions = data.modules.reduce((sum, module) => sum + module.functions.length, 0);
  const totalClasses = data.modules.reduce((sum, module) => sum + module.classes.length, 0);

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
                  {data.project_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {data.total_files} files • {data.total_lines.toLocaleString()} lines
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
                  {data.modules.length + totalClasses + totalFunctions}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip label={`${data.modules.length} Modules`} size="small" color="primary" sx={{ mr: 0.5, mb: 0.5 }} />
                  <Chip label={`${totalClasses} Classes`} size="small" color="success" sx={{ mr: 0.5, mb: 0.5 }} />
                  <Chip label={`${totalFunctions} Functions`} size="small" color="warning" sx={{ mr: 0.5, mb: 0.5 }} />
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
                  {data.dependencies.length}
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
                  Performance
                </Typography>
                <Typography variant="h6">
                  Optimized
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Virtualized rendering
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
              Modules ({data.modules.length})
            </Typography>
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              <List>
                {data.modules.map((module, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={module.name}
                      secondary={`${module.path} • ${module.lines_of_code} LOC • ${module.functions.length} functions • ${module.classes.length} classes`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <Typography variant="h6" gutterBottom>
              Functions ({totalFunctions})
            </Typography>
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              <List>
                {data.modules.flatMap(module => 
                  module.functions.map((func, index) => (
                    <ListItem key={`${module.name}-${index}`} divider>
                      <ListItemText
                        primary={func.name}
                        secondary={`${module.name} • Line ${func.line_number} • ${func.parameters.length} parameters`}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <Typography variant="h6" gutterBottom>
              Classes ({totalClasses})
            </Typography>
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              <List>
                {data.modules.flatMap(module => 
                  module.classes.map((cls, index) => (
                    <ListItem key={`${module.name}-${index}`} divider>
                      <ListItemText
                        primary={cls.name}
                        secondary={`${module.name} • Line ${cls.line_number} • ${cls.methods.length} methods`}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            <Typography variant="h6" gutterBottom>
              Dependencies ({data.dependencies.length})
            </Typography>
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              <List>
                {data.dependencies.map((dep, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={`${dep.source} → ${dep.target}`}
                      secondary={`Type: ${dep.type}${dep.weight ? ` • Weight: ${dep.weight}` : ''}`}
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