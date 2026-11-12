/**
 * Keyboard shortcuts help dialog
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close as CloseIcon, Keyboard as KeyboardIcon } from '@mui/icons-material';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
}

interface KeyboardHelpDialogProps {
  open: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export function KeyboardHelpDialog({ open, onClose, shortcuts }: KeyboardHelpDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { containerProps } = useFocusTrap({
    active: open,
    onEscape: onClose,
  });

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys = [];
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.metaKey) keys.push(isMobile ? 'Cmd' : '⌘');
    if (shortcut.altKey) keys.push(isMobile ? 'Alt' : '⌥');
    if (shortcut.shiftKey) keys.push(isMobile ? 'Shift' : '⇧');
    keys.push(shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase());

    return keys;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      aria-labelledby="keyboard-help-title"
      aria-describedby="keyboard-help-description"
      PaperProps={{
        ...containerProps,
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        id="keyboard-help-title"
        sx={{
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <KeyboardIcon color="primary" />
          <Typography variant="h6" component="h2">
            Keyboard Shortcuts
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          aria-label="Close keyboard shortcuts help"
          sx={{
            color: 'text.secondary',
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Typography
          id="keyboard-help-description"
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          Use these keyboard shortcuts to navigate and interact with the application more
          efficiently.
        </Typography>

        <List dense sx={{ '& .MuiListItem-root': { px: 0 } }}>
          {shortcuts.map((shortcut, index) => (
            <ListItem
              key={`${shortcut.key}-${index}`}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1.5,
                borderBottom: index < shortcuts.length - 1 ? 1 : 0,
                borderColor: 'divider',
              }}
            >
              <ListItemText
                primary={shortcut.description}
                primaryTypographyProps={{
                  sx: {
                    fontWeight: 500,
                    fontSize: '0.925rem',
                  },
                }}
              />
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {formatShortcut(shortcut).map((key, keyIndex) => (
                  <Chip
                    key={`${key}-${keyIndex}`}
                    label={key}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      height: 24,
                      minWidth: 24,
                      backgroundColor: 'action.hover',
                      borderColor: 'divider',
                      '&:not(:last-child)': {
                        marginRight: 0.25,
                      },
                    }}
                  />
                ))}
              </Box>
            </ListItem>
          ))}
        </List>

        <Box sx={{ mt: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Tip:</strong> Press{' '}
            <Chip
              label="?"
              size="small"
              variant="outlined"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                height: 20,
                mx: 0.5,
              }}
            />{' '}
            at any time to open this help dialog.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          autoFocus
          sx={{
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
            },
          }}
        >
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Hook for managing keyboard help dialog
 */
export function useKeyboardHelp(shortcuts: KeyboardShortcut[]) {
  const [open, setOpen] = useState(false);

  const showHelp = () => setOpen(true);
  const hideHelp = () => setOpen(false);

  const KeyboardHelpComponent = () => (
    <KeyboardHelpDialog open={open} onClose={hideHelp} shortcuts={shortcuts} />
  );

  return {
    showHelp,
    hideHelp,
    isOpen: open,
    KeyboardHelpComponent,
  };
}
