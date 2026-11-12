import type { RefObject } from 'react';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { CenterFocusStrong, Download, ZoomIn, ZoomOut } from '@mui/icons-material';
import type { GraphCanvasHandle } from './GraphCanvas';

interface GraphToolbarProps {
  canvas: RefObject<GraphCanvasHandle>;
  /** Base file name for exported images, without extension. */
  exportName: string;
}

export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Zoom, fit, and PNG export controls for a {@link GraphCanvas}. */
export function GraphToolbar({ canvas, exportName }: GraphToolbarProps) {
  const exportPng = () => {
    const png = canvas.current?.toPng();
    if (png) downloadDataUrl(png, `${exportName}.png`);
  };
  return (
    <Stack direction="row" spacing={0.5} role="toolbar" aria-label="Graph controls">
      <Tooltip title="Zoom in">
        <IconButton aria-label="Zoom in" onClick={() => canvas.current?.zoomBy(1.3)}>
          <ZoomIn />
        </IconButton>
      </Tooltip>
      <Tooltip title="Zoom out">
        <IconButton aria-label="Zoom out" onClick={() => canvas.current?.zoomBy(1 / 1.3)}>
          <ZoomOut />
        </IconButton>
      </Tooltip>
      <Tooltip title="Fit to view">
        <IconButton aria-label="Fit to view" onClick={() => canvas.current?.fit()}>
          <CenterFocusStrong />
        </IconButton>
      </Tooltip>
      <Tooltip title="Download as PNG">
        <IconButton aria-label="Download as PNG" onClick={exportPng}>
          <Download />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
