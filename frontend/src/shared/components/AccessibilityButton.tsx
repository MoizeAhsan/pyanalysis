import { Suspense, lazy, useState } from 'react';
import { Box, Button, ClickAwayListener, Tooltip } from '@mui/material';
import { Accessibility as AccessibilityIcon } from '@mui/icons-material';

// The settings panel is loaded on first open; the page does not need it to render.
const AccessibilitySettings = lazy(() =>
  import('./AccessibilitySettings').then((module) => ({ default: module.AccessibilitySettings })),
);

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
            <Suspense fallback={null}>
              <AccessibilitySettings open={settingsOpen} onClose={handleClose} />
            </Suspense>
          </Box>
        </ClickAwayListener>
      )}
    </Box>
  );
}
