import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Download,
  Share,
  ContentCopy,
  Close,
  Image,
  PictureAsPdf,
  Code,
  Link
} from '@mui/icons-material';
import {
  exportAsPNG,
  exportAsSVG,
  exportAsPDF,
  exportAsJSON,
  generateShareableURL,
  copyToClipboard,
  getOptimalExportDimensions,
  validateExportOptions,
  createShareableState
} from '../utils/exportUtils';
import type { ExportOptions, ShareableState } from '../utils/exportUtils';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  element: HTMLElement | null;
  data?: any;
  graphType: string;
  layoutType: string;
  viewSettings: Record<string, any>;
  selectedNode?: any;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  element,
  data,
  graphType,
  layoutType,
  viewSettings,
  selectedNode
}) => {
  const [format, setFormat] = useState<'png' | 'svg' | 'pdf' | 'json'>('png');
  const [filename, setFilename] = useState('');
  const [quality, setQuality] = useState(2);
  const [customDimensions, setCustomDimensions] = useState(false);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [includeBackground, setIncludeBackground] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareableURL, setShareableURL] = useState<string | null>(null);
  const [isGeneratingURL, setIsGeneratingURL] = useState(false);

  // Get optimal dimensions when element changes
  React.useEffect(() => {
    if (element && !customDimensions && format !== 'json') {
      const dimensions = getOptimalExportDimensions(element, format);
      setWidth(dimensions.width);
      setHeight(dimensions.height);
    }
  }, [element, format, customDimensions]);

  // Generate default filename
  React.useEffect(() => {
    if (!filename) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      setFilename(`${graphType}-visualization-${timestamp}`);
    }
  }, [graphType, filename]);

  const handleExport = useCallback(async () => {
    if (!element && format !== 'json' && format !== 'svg') {
      setExportError('No visualization element available for export');
      return;
    }

    // SVG export requires graph data for proper vector output
    if (format === 'svg' && !data) {
      setExportError('No graph data available for SVG export');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const options: ExportOptions = validateExportOptions({
        format,
        ...(filename && { filename }),
        quality,
        ...(customDimensions && { width, height }),
        ...(includeBackground && { backgroundColor }),
        // Pass graph data for vector SVG export
        ...(format === 'svg' && { graphData: data })
      });

      switch (format) {
        case 'png':
          await exportAsPNG(element!, options);
          break;
        case 'svg':
          await exportAsSVG(element!, options);
          break;
        case 'pdf':
          await exportAsPDF(element!, options);
          break;
        case 'json':
          exportAsJSON(data, options);
          break;
      }

      onClose();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [element, format, filename, quality, customDimensions, width, height, backgroundColor, includeBackground, data, onClose]);

  const handleGenerateShareableURL = useCallback(async () => {
    setIsGeneratingURL(true);
    setExportError(null);

    try {
      const state: ShareableState = createShareableState(
        graphType,
        layoutType,
        viewSettings,
        selectedNode
      );

      const url = generateShareableURL(state);
      setShareableURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Failed to generate shareable URL');
    } finally {
      setIsGeneratingURL(false);
    }
  }, [graphType, layoutType, viewSettings, selectedNode]);

  const handleCopyURL = useCallback(async () => {
    if (shareableURL) {
      try {
        await copyToClipboard(shareableURL);
        // Could show a toast notification here
      } catch (error) {
        setExportError('Failed to copy URL to clipboard');
      }
    }
  }, [shareableURL]);

  const formatOptions = [
    { value: 'png', label: 'PNG Image', icon: <Image />, description: 'High-quality raster image' },
    { value: 'svg', label: 'SVG Vector', icon: <Code />, description: 'Scalable vector graphics' },
    { value: 'pdf', label: 'PDF Document', icon: <PictureAsPdf />, description: 'Portable document format' },
    { value: 'json', label: 'JSON Data', icon: <Code />, description: 'Raw visualization data' }
  ];

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Download color="primary" />
          Export & Share Visualization
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {exportError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError(null)}>
            {exportError}
          </Alert>
        )}

        {/* Export Format Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Export Format
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            {formatOptions.map((option) => (
              <Box
                key={option.value}
                sx={{
                  p: 2,
                  border: 2,
                  borderColor: format === option.value ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover'
                  }
                }}
                onClick={() => setFormat(option.value as any)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {option.icon}
                  <Typography variant="subtitle2" fontWeight="bold">
                    {option.label}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {option.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Export Options */}
        {format !== 'json' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Export Options
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
              {/* Quality Settings */}
              {format === 'png' && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Quality: {quality}x
                  </Typography>
                  <Slider
                    value={quality}
                    onChange={(_, value) => setQuality(value as number)}
                    min={0.5}
                    max={3}
                    step={0.1}
                    marks={[
                      { value: 0.5, label: '0.5x' },
                      { value: 1, label: '1x' },
                      { value: 2, label: '2x' },
                      { value: 3, label: '3x' }
                    ]}
                  />
                </Box>
              )}

              {/* Dimensions */}
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={customDimensions}
                      onChange={(e) => setCustomDimensions(e.target.checked)}
                    />
                  }
                  label="Custom Dimensions"
                />
                {customDimensions && (
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <TextField
                      label="Width"
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      size="small"
                      InputProps={{ inputProps: { min: 100, max: 4000 } }}
                    />
                    <TextField
                      label="Height"
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      size="small"
                      InputProps={{ inputProps: { min: 100, max: 4000 } }}
                    />
                  </Box>
                )}
                {!customDimensions && (
                  <Typography variant="caption" color="text.secondary">
                    Optimal: {width} × {height}
                  </Typography>
                )}
              </Box>

              {/* Background */}
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeBackground}
                      onChange={(e) => setIncludeBackground(e.target.checked)}
                    />
                  }
                  label="Include Background"
                />
                {includeBackground && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <TextField
                      label="Background Color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* Filename */}
        <Box sx={{ mb: 3 }}>
          <TextField
            label="Filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            fullWidth
            helperText="File extension will be added automatically"
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Sharing Options */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Share />
            Share Visualization
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Generate a shareable URL that preserves the current visualization state
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={isGeneratingURL ? <CircularProgress size={16} /> : <Link />}
              onClick={handleGenerateShareableURL}
              disabled={isGeneratingURL}
            >
              Generate Shareable URL
            </Button>
            
            {shareableURL && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                <TextField
                  value={shareableURL}
                  size="small"
                  fullWidth
                  InputProps={{
                    readOnly: true,
                    sx: { fontSize: '0.8rem' }
                  }}
                />
                <Tooltip title="Copy URL">
                  <IconButton onClick={handleCopyURL} size="small">
                    <ContentCopy />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>

          {shareableURL && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                This URL contains the current visualization settings and can be shared with others.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Current Settings Preview */}
        <Box sx={{ 
          p: 2, 
          backgroundColor: 'action.hover', 
          borderRadius: 1,
          border: 1,
          borderColor: 'divider'
        }}>
          <Typography variant="subtitle2" gutterBottom>
            Current Settings
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`Type: ${graphType}`} size="small" />
            <Chip label={`Layout: ${layoutType}`} size="small" />
            {selectedNode && <Chip label={`Selected: ${selectedNode.name || selectedNode.id}`} size="small" />}
            <Chip label={`Format: ${format.toUpperCase()}`} size="small" color="primary" />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose} disabled={isExporting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={isExporting ? <CircularProgress size={16} /> : <Download />}
          onClick={handleExport}
          disabled={isExporting || (!element && format !== 'json')}
        >
          {isExporting ? 'Exporting...' : `Export ${format.toUpperCase()}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;