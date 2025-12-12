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
  IconButton,
  Slider,
  Chip,
  Fade,
  ClickAwayListener,
} from '@mui/material';
import {
  Contrast as ContrastIcon,
  Animation as AnimationIcon,
  VolumeUp as VolumeIcon,
  Accessibility as AccessibilityIcon,
  SettingsAccessibility as SettingsIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  TextFields as TextFieldsIcon,
  Keyboard as KeyboardIcon,
  CenterFocusStrong as FocusIcon,
} from '@mui/icons-material';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useHighContrast, useReducedMotion, useColorContrastCheck } from '@shared/hooks/useAccessibility';

interface AccessibilitySettingsProps {
  open?: boolean;
  onClose?: () => void;
}

interface KeyboardShortcut {
  key: string;
  description: string;
  modifiers?: string[];
}

const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: '/', description: 'Focus search' },
  { key: 'Escape', description: 'Close dialogs/panels' },
  { key: 'Tab', description: 'Navigate to next element' },
  { key: 'Tab', description: 'Navigate to previous element', modifiers: ['Shift'] },
  { key: 'Enter', description: 'Activate focused element' },
  { key: 'Space', description: 'Toggle checkboxes/buttons' },
  { key: 'Arrow Keys', description: 'Navigate within menus' },
  { key: 'Home', description: 'Go to first item' },
  { key: 'End', description: 'Go to last item' },
];

export function AccessibilitySettings({ open = true, onClose }: AccessibilitySettingsProps) {
  const [showContrastInfo, setShowContrastInfo] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('accessibility-font-size');
    return saved ? parseInt(saved, 10) : 100;
  });
  const [focusIndicator, setFocusIndicator] = useState(() => {
    return localStorage.getItem('accessibility-focus-indicator') !== 'false';
  });
  
  const { isHighContrast, systemPreference, toggleHighContrast, resetToSystemPreference } = useHighContrast();
  const { prefersReducedMotion } = useReducedMotion();
  const { checkThemeContrast, getContrastRatio } = useColorContrastCheck();
  const panelRef = useRef<HTMLDivElement>(null);

  const contrastResults = checkThemeContrast();
  const hasContrastIssues = Object.values(contrastResults).some(result => !result);

  // Handle font size changes
  const handleFontSizeChange = (_event: Event, newValue: number | number[]) => {
    const size = newValue as number;
    setFontSize(size);
    localStorage.setItem('accessibility-font-size', size.toString());
    document.documentElement.style.fontSize = `${size}%`;
  };

  // Handle focus indicator toggle
  const handleFocusIndicatorChange = () => {
    const newValue = !focusIndicator;
    setFocusIndicator(newValue);
    localStorage.setItem('accessibility-focus-indicator', newValue.toString());
    
    if (newValue) {
      document.body.classList.remove('no-focus-outline');
    } else {
      document.body.classList.add('no-focus-outline');
    }
  };

  // Handle escape key
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && onClose) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus first interactive element
      setTimeout(() => {
        const firstFocusable = panelRef.current?.querySelector('button, [tabindex="0"]') as HTMLElement;
        firstFocusable?.focus();
      }, 100);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  // Apply saved settings on mount
  useEffect(() => {
    const savedFontSize = localStorage.getItem('accessibility-font-size');
    if (savedFontSize) {
      document.documentElement.style.fontSize = `${savedFontSize}%`;
    }
    
    const savedFocusIndicator = localStorage.getItem('accessibility-focus-indicator');
    if (savedFocusIndicator === 'false') {
      document.body.classList.add('no-focus-outline');
    }
  }, []);

  if (!open) return null;

  const KeyBadge = ({ shortcut }: { shortcut: KeyboardShortcut }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {shortcut.modifiers?.map((mod) => (
          <Chip
            key={mod}
            label={mod}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              fontWeight: 600,
              backgroundColor: 'action.selected',
            }}
          />
        ))}
        <Chip
          label={shortcut.key}
          size="small"
          sx={{
            height: 24,
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            fontWeight: 600,
            backgroundColor: 'action.selected',
          }}
        />
      </Box>
      <Typography variant="body2" sx={{ ml: 1 }}>
        {shortcut.description}
      </Typography>
    </Box>
  );

  return (
    <Paper
      ref={panelRef}
      sx={{
        p: 3,
        maxWidth: 500,
        mx: 'auto',
        border: 1,
        borderColor: 'divider',
        position: 'relative',
      }}
      role="dialog"
      aria-labelledby="accessibility-settings-title"
      aria-modal="true"
    >
      {/* Header with close button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <AccessibilityIcon color="primary" />
        <Typography
          id="accessibility-settings-title"
          variant="h6"
          component="h2"
          sx={{ fontWeight: 600, flex: 1 }}
        >
          Accessibility Settings
        </Typography>
        {onClose && (
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Close accessibility settings"
            sx={{
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* High Contrast Mode */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <ContrastIcon color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            High Contrast Mode
          </Typography>
          <Tooltip title="Learn about color contrast">
            <IconButton
              size="small"
              onClick={() => setShowContrastInfo(!showContrastInfo)}
              aria-expanded={showContrastInfo}
              aria-label="Toggle contrast information"
            >
              <InfoIcon fontSize="small" />
            </IconButton>
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
          label="Enable high contrast colors"
        />

        <Typography
          id="high-contrast-description"
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, ml: 6 }}
        >
          {systemPreference
            ? 'System preference detected: High contrast'
            : 'Improves visibility with stronger color differences'
          }
        </Typography>

        {systemPreference && !isHighContrast && (
          <Button size="small" onClick={resetToSystemPreference} sx={{ mt: 1, ml: 6 }}>
            Use System Setting
          </Button>
        )}

        <Collapse in={showContrastInfo}>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              High contrast mode improves text readability by using stronger color differences. 
              This is especially helpful for users with visual impairments or in bright lighting conditions.
            </Typography>
            
            {hasContrastIssues && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Current theme contrast issues detected:
                </Typography>
                <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
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

      <Divider sx={{ my: 2 }} />

      {/* Font Size */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TextFieldsIcon color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Text Size
          </Typography>
          <Chip 
            label={`${fontSize}%`} 
            size="small" 
            color="primary" 
            variant="outlined"
            sx={{ ml: 'auto' }}
          />
        </Box>

        <Box sx={{ ml: 4, mr: 2 }}>
          <Slider
            value={fontSize}
            onChange={handleFontSizeChange}
            aria-label="Text size percentage"
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value}%`}
            step={10}
            marks={[
              { value: 80, label: '80%' },
              { value: 100, label: '100%' },
              { value: 120, label: '120%' },
              { value: 150, label: '150%' },
            ]}
            min={80}
            max={150}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Adjust the base text size for the entire application.
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Focus Indicator */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FocusIcon color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Focus Indicators
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={focusIndicator}
              onChange={handleFocusIndicatorChange}
              aria-describedby="focus-indicator-description"
            />
          }
          label="Show visible focus outlines"
        />

        <Typography
          id="focus-indicator-description"
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, ml: 6 }}
        >
          Highlights the currently focused element for keyboard navigation.
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Reduced Motion */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AnimationIcon color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Motion Preferences
          </Typography>
        </Box>

        <Box sx={{ ml: 4 }}>
          <Chip
            icon={prefersReducedMotion ? undefined : undefined}
            label={prefersReducedMotion ? '✓ Reduced motion active' : 'Normal animations enabled'}
            color={prefersReducedMotion ? 'success' : 'default'}
            variant="outlined"
            size="small"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Change this setting in your operating system's accessibility preferences.
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Screen Reader Information */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <VolumeIcon color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Screen Reader Support
          </Typography>
        </Box>

        <Box sx={{ ml: 4 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            This application includes comprehensive screen reader support with:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0, '& li': { mb: 0.5 } }}>
            <li>ARIA labels and descriptions</li>
            <li>Live region announcements</li>
            <li>Semantic HTML structure</li>
            <li>Keyboard navigation support</li>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Keyboard Shortcuts */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <KeyboardIcon color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Keyboard Navigation
          </Typography>
          <Button
            size="small"
            onClick={() => setShowShortcuts(!showShortcuts)}
            aria-expanded={showShortcuts}
            sx={{ ml: 'auto' }}
          >
            {showShortcuts ? 'Hide shortcuts' : 'Show all shortcuts'}
          </Button>
        </Box>

        <Box sx={{ ml: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Use keyboard shortcuts for faster navigation:
          </Typography>
          
          {/* Always visible shortcut */}
          <KeyBadge shortcut={{ key: '?', description: 'Show all shortcuts' }} />
          
          <Collapse in={showShortcuts}>
            <Fade in={showShortcuts}>
              <Box sx={{ mt: 1 }}>
                {KEYBOARD_SHORTCUTS.slice(1).map((shortcut, index) => (
                  <KeyBadge key={index} shortcut={shortcut} />
                ))}
              </Box>
            </Fade>
          </Collapse>
        </Box>
      </Box>

      {/* Reset all settings */}
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setFontSize(100);
            document.documentElement.style.fontSize = '100%';
            localStorage.removeItem('accessibility-font-size');
            
            setFocusIndicator(true);
            document.body.classList.remove('no-focus-outline');
            localStorage.removeItem('accessibility-focus-indicator');
            
            resetToSystemPreference();
          }}
        >
          Reset All to Defaults
        </Button>
      </Box>
    </Paper>
  );
}

/**
 * Floating accessibility button
 */
export function AccessibilityButton() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleClose = () => setSettingsOpen(false);

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
            '&:focus-visible': {
              outline: '3px solid',
              outlineColor: 'primary.light',
              outlineOffset: 2,
            },
          }}
          aria-label="Open accessibility settings"
          aria-expanded={settingsOpen}
          aria-haspopup="dialog"
        >
          <AccessibilityIcon />
        </Button>
      </Tooltip>

      {settingsOpen && (
        <ClickAwayListener onClickAway={handleClose}>
          <Box
            sx={{
              position: 'absolute',
              bottom: 70,
              right: 0,
              minWidth: 420,
              maxWidth: 500,
              maxHeight: 'calc(90vh - 120px)',
              overflowY: 'auto',
              boxShadow: 6,
              borderRadius: 2,
              '&::-webkit-scrollbar': {
                width: 8,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'action.hover',
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'action.selected',
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: 'action.focus',
                },
              },
            }}
          >
            <AccessibilitySettings
              open={settingsOpen}
              onClose={handleClose}
            />
          </Box>
        </ClickAwayListener>
      )}
    </Box>
  );
}