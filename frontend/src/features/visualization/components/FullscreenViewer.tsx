import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Paper,
  Fade,
  Typography,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import {
  FullscreenExit,
  Download,
  Info,
  Close
} from '@mui/icons-material';

interface FullscreenViewerProps {
  open: boolean;
  onClose: () => void;
  onExport: () => void;
  title: string;
  children: React.ReactNode;
  metadata?: {
    graphType: string;
    layoutType: string;
    nodeCount: number;
    edgeCount: number;
  };
}

const FullscreenViewer: React.FC<FullscreenViewerProps> = ({
  open,
  onClose,
  onExport,
  title,
  children,
  metadata
}) => {
  const theme = useTheme();
  const [showControls, setShowControls] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-hide controls after inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Handle mouse movement to show/hide controls
  const handleMouseMove = useCallback(() => {
    resetHideTimer();
  }, [resetHideTimer]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        onClose();
        break;
      case 'e':
      case 'E':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onExport();
        }
        break;
      case 'i':
      case 'I':
        setShowInfo(prev => !prev);
        break;
      case 'h':
      case 'H':
        setShowControls(prev => !prev);
        break;
    }
  }, [onClose, onExport]);

  // Set up event listeners
  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousemove', handleMouseMove);
      resetHideTimer();

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousemove', handleMouseMove);
        if (hideControlsTimeoutRef.current) {
          clearTimeout(hideControlsTimeoutRef.current);
        }
      };
    }
    return undefined;
  }, [open, handleKeyDown, handleMouseMove, resetHideTimer]);

  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: theme.palette.mode === 'dark' ? '#000000' : '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Top Controls Bar */}
      <Fade in={showControls} timeout={300}>
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(10px)',
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {metadata && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip 
                  label={metadata.graphType} 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
                <Chip 
                  label={metadata.layoutType} 
                  size="small" 
                  color="secondary" 
                  variant="outlined" 
                />
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Show Info (I)">
              <IconButton 
                onClick={() => setShowInfo(prev => !prev)}
                color={showInfo ? 'primary' : 'default'}
              >
                <Info />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Export (Ctrl+E)">
              <IconButton onClick={onExport}>
                <Download />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Exit Fullscreen (Esc)">
              <IconButton onClick={onClose}>
                <FullscreenExit />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>
      </Fade>

      {/* Info Panel */}
      <Fade in={showInfo} timeout={300}>
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            top: 80,
            right: 16,
            zIndex: 10,
            p: 2,
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            minWidth: 250,
            maxWidth: 350
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Visualization Info
            </Typography>
            <IconButton size="small" onClick={() => setShowInfo(false)}>
              <Close />
            </IconButton>
          </Box>

          {metadata && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Graph Type:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {metadata.graphType}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Layout:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {metadata.layoutType}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Nodes:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {metadata.nodeCount}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Edges:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {metadata.edgeCount}
                </Typography>
              </Box>
            </Box>
          )}

          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              <strong>Keyboard Shortcuts:</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              • Esc - Exit fullscreen
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              • Ctrl+E - Export visualization
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              • I - Toggle info panel
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              • H - Toggle controls
            </Typography>
          </Box>
        </Paper>
      </Fade>

      {/* Bottom Controls Hint */}
      <Fade in={showControls} timeout={300}>
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            backgroundColor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(10px)',
            px: 2,
            py: 1,
            borderRadius: 2,
            border: 1,
            borderColor: alpha(theme.palette.divider, 0.2)
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Move mouse to show controls • Press H to toggle • Press I for info
          </Typography>
        </Box>
      </Fade>

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative'
        }}
        onMouseMove={handleMouseMove}
      >
        {children}
      </Box>

      {/* Click overlay to show controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          cursor: showControls ? 'default' : 'pointer'
        }}
        onClick={() => !showControls && setShowControls(true)}
      />
    </Box>
  );
};

export default FullscreenViewer;