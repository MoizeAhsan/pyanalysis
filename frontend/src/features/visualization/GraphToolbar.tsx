import { useEffect, useState, type RefObject } from 'react';
import { IconButton, ListItemText, Menu, MenuItem, Stack, Tooltip } from '@mui/material';
import {
  CenterFocusStrong,
  Download,
  Fullscreen,
  FullscreenExit,
  ZoomIn,
  ZoomOut,
} from '@mui/icons-material';
import type { GraphCanvasHandle } from './GraphCanvas';

interface GraphToolbarProps {
  canvas: RefObject<GraphCanvasHandle>;
  /** Base file name for exported images, without extension. */
  exportName: string;
  /** Element shown full screen by the full-screen button; omitted hides the button. */
  fullscreenTarget?: RefObject<HTMLElement> | undefined;
}

export function downloadText(text: string, fileName: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  try {
    downloadDataUrl(url, fileName);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function useFullscreen(target: RefObject<HTMLElement> | undefined) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const update = () =>
      setActive(
        Boolean(document.fullscreenElement) && document.fullscreenElement === target?.current,
      );
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, [target]);
  const supported = typeof document !== 'undefined' && document.fullscreenEnabled === true;
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void target?.current?.requestFullscreen();
  };
  return { active, supported, toggle };
}

export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Zoom, fit, full-screen, and PNG/SVG export controls for a {@link GraphCanvas}. */
export function GraphToolbar({ canvas, exportName, fullscreenTarget }: GraphToolbarProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const fullscreen = useFullscreen(fullscreenTarget);
  const exportPng = () => {
    setMenuAnchor(null);
    const png = canvas.current?.toPng();
    if (png) downloadDataUrl(png, `${exportName}.png`);
  };
  const exportSvg = () => {
    setMenuAnchor(null);
    const svg = canvas.current?.toSvg();
    if (svg) downloadText(svg, `${exportName}.svg`, 'image/svg+xml');
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
      {fullscreenTarget && fullscreen.supported && (
        <Tooltip title={fullscreen.active ? 'Exit full screen' : 'Full screen'}>
          <IconButton
            aria-label={fullscreen.active ? 'Exit full screen' : 'Full screen'}
            onClick={fullscreen.toggle}
          >
            {fullscreen.active ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Download image">
        <IconButton
          aria-label="Download image"
          aria-haspopup="menu"
          aria-expanded={menuAnchor !== null}
          onClick={(event) => setMenuAnchor(event.currentTarget)}
        >
          <Download />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={exportPng}>
          <ListItemText primary="PNG image" secondary="For slides and chat" />
        </MenuItem>
        <MenuItem onClick={exportSvg}>
          <ListItemText primary="SVG vector" secondary="Scales cleanly in documents" />
        </MenuItem>
      </Menu>
    </Stack>
  );
}
