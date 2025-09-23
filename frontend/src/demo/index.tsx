import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { 
  CssBaseline, 
  Container, 
  Typography, 
  Box, 
  Tabs, 
  Tab, 
  Paper,
  Switch,
  FormControlLabel,
  Chip
} from '@mui/material';
import ProjectInputDemo from './ProjectInputDemo';
import VisualizationDemo from './VisualizationDemo';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`demo-tabpanel-${index}`}
      aria-labelledby={`demo-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

const DemoApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
    },
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            🎯 Frontend Modernization Demo
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 3 }}>
            Showcasing modernized components with enhanced performance, accessibility, and user experience
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 3 }}>
            <FormControlLabel
              control={<Switch checked={isDarkMode} onChange={toggleTheme} />}
              label={`${isDarkMode ? 'Dark' : 'Light'} Mode`}
            />
            <Chip label="React 18" color="primary" />
            <Chip label="TypeScript" color="info" />
            <Chip label="Material-UI v6" color="secondary" />
            <Chip label="Vite" color="success" />
          </Box>
        </Box>

        {/* Demo Navigation */}
        <Paper elevation={3} sx={{ borderRadius: 3, mb: 4 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange} 
              aria-label="demo tabs"
              centered
            >
              <Tab label="📊 Visualization Components" />
              <Tab label="📝 Project Input Component" />
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            <VisualizationDemo />
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <Box sx={{ p: 3 }}>
              <ProjectInputDemo />
            </Box>
          </TabPanel>
        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Frontend Modernization Complete ✅ | All components enhanced with modern React patterns, 
            TypeScript, performance optimizations, and accessibility improvements.
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default DemoApp;