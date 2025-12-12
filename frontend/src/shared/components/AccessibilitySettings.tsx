/**
 * Accessibility settings panel
 */

import {
  Box,
  Switch,
  FormControlLabel,
  Typography,
  Paper,
  Divider,
  Button,
  Tooltip,
  Alert,
  Collapse,
} from '@mui/material';
import {
  Contrast as ContrastIcon,
  Animation as AnimationIcon,
  VolumeUp as VolumeIcon,
  Accessibility as AccessibilityIcon,
  SettingsAccessibility as SettingsIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useHighContrast, useReducedMotion, useColorContrastCheck } from '@shared/hooks/useAccessibility';

interface AccessibilitySettingsProps {
  open?: boolean;
  onClose?: () => void;
}

export function AccessibilitySettings({ open = true }: AccessibilitySettingsProps) {
  const [showContrastInfo, setShowContrastInfo] = useState(false);
  const { isHighContrast, systemPreference, toggleHighContrast, resetToSystemPreference } = useHighContrast();
  const { prefersReducedMotion } = useReducedMotion();
  const { checkThemeContrast } = useColorContrastCheck();

  const contrastResults = checkThemeContrast();
  const hasContrastIssues = Object.values(contrastResults).some(result => !result);

  if (!open) return null;

  return (
    <Paper
      sx={{
        p: 3,
        maxWidth: 500,
        mx: 'auto',
        border: 1,
        borderColor: 'divider',
      }}
      role="region"
      aria-labelledby="accessibility-settings-title"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <AccessibilityIcon color="primary" />
        <Typography
          id="accessibility-settings-title"
          variant="h6"
          component="h2"
          sx={{ fontWeight: 600 }}
        >
          Accessibility Settings
        </Typography>
      </Box>

      {/* High Contrast Mode */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <ContrastIcon color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            High Contrast Mode
          </Typography>
          <Tooltip title="Learn about color contrast">
            <Button
              size="small"
              startIcon={<InfoIcon />}
              onClick={() => setShowContrastInfo(!showContrastInfo)}
              sx={{ ml: 'auto' }}
            >
              Info
            </Button>
          </Tooltip>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={isHighContrast}
              onChange={toggleHighContrast}
              aria-describedby="high-contrast-description"
            />
          }
          label="Enable high contrast colors for better visibility"
        />

        <Typography
          id="high-contrast-description"
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, ml: 4 }}
        >
          {systemPreference
            ? 'System preference detected: High contrast'
            : 'Follow system preference or set manually'
          }
        </Typography>

        {systemPreference && !isHighContrast && (
          <Button size="small" onClick={resetToSystemPreference} sx={{ mt: 1, ml: 4 }}>
            Use System Setting
          </Button>
        )}

        <Collapse in={showContrastInfo}>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              High contrast mode improves text readability by using stronger color differences. 
              This is especially helpful for users with visual impairments or in bright lighting conditions.
            </Typography>
            
            {hasContrastIssues && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Current theme contrast issues detected:
                </Typography>
                <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                  {!contrastResults.primaryOnBackground && (
                    <li>Primary color on background needs improvement</li>
                  )}
                  {!contrastResults.textOnBackground && (
                    <li>Text on background needs improvement</li>
                  )}
                  {!contrastResults.textOnPaper && (
                    <li>Text on paper background needs improvement</li>
                  )}
                </Box>
              </Box>
            )}
          </Alert>
        </Collapse>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Reduced Motion */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AnimationIcon color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Motion Preferences
          </Typography>
        </Box>

        <Box sx={{ ml: 4 }}>
          <Typography variant="body2" color="text.secondary">
            {prefersReducedMotion
              ? '✓ Reduced motion is active (system preference detected)'
              : 'Normal animations are enabled'
            }
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Change this setting in your operating system's accessibility preferences.
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Screen Reader Information */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <VolumeIcon color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Screen Reader Support
          </Typography>
        </Box>

        <Box sx={{ ml: 4 }}>
          <Typography variant="body2" color="text.secondary">
            This application includes comprehensive screen reader support with:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <li>ARIA labels and descriptions</li>
            <li>Live region announcements</li>
            <li>Semantic HTML structure</li>
            <li>Keyboard navigation support</li>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Keyboard Shortcuts */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <SettingsIcon color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Keyboard Navigation
          </Typography>
        </Box>

        <Box sx={{ ml: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Use keyboard shortcuts for faster navigation:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="caption" sx={{ 
                px: 1, 
                py: 0.5, 
                backgroundColor: 'action.hover', 
                borderRadius: 1,
                fontFamily: 'monospace',
                fontWeight: 600,
              }}>
                ?
              </Typography>
              <Typography variant="body2">Show all shortcuts</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

/**
 * Floating accessibility button
 */
export function AccessibilityButton() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
      }}
    >
      <Tooltip title="Accessibility settings">
        <Button
          variant="contained"
          color="primary"
          onClick={() => setSettingsOpen(!settingsOpen)}
          sx={{
            borderRadius: '50%',
            minWidth: 56,
            height: 56,
            boxShadow: 3,
            '&:hover': {
              boxShadow: 6,
            },
          }}
          aria-label="Open accessibility settings"
          aria-expanded={settingsOpen}
        >
          <AccessibilityIcon />
        </Button>
      </Tooltip>

      {settingsOpen && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 70,
            right: 0,
            minWidth: 400,
            maxWidth: 500,
            maxHeight: 'calc(90vh - 120px)',
            overflowY: 'auto',
            boxShadow: 6,
            borderRadius: 2,
          }}
        >
          <AccessibilitySettings
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </Box>
      )}
    </Box>
  );
}