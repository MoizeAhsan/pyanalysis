// Utility functions for exporting visualizations

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'json';
  quality?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  filename?: string;
}

export interface ShareableState {
  graphType: string;
  layoutType: string;
  viewSettings: Record<string, any>;
  selectedNode?: any;
  timestamp: number;
  version: string;
}

/**
 * Export visualization as PNG image
 */
export const exportAsPNG = async (
  element: HTMLElement | SVGElement,
  options: Partial<ExportOptions> = {}
): Promise<void> => {
  try {
    // Dynamic import for better code splitting
    const html2canvas = await import('html2canvas');
    
    const canvas = await html2canvas.default(element as HTMLElement, {
      backgroundColor: options.backgroundColor || '#ffffff',
      width: options.width,
      height: options.height,
      scale: options.quality || 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    } as any);

    // Create download link
    const link = document.createElement('a');
    link.download = options.filename || `visualization-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to export as PNG:', error);
    throw new Error('PNG export failed. Please try again.');
  }
};

/**
 * Export visualization as SVG
 */
export const exportAsSVG = async (
  element: HTMLElement | SVGElement,
  options: Partial<ExportOptions> = {}
): Promise<void> => {
  try {
    let svgElement: SVGElement;

    if (element.tagName === 'svg') {
      svgElement = element as SVGElement;
    } else {
      // Find SVG element within the container
      const svgChild = element.querySelector('svg');
      if (!svgChild) {
        throw new Error('No SVG element found in the visualization');
      }
      svgElement = svgChild;
    }

    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    
    // Set dimensions if provided
    if (options.width) {
      clonedSvg.setAttribute('width', options.width.toString());
    }
    if (options.height) {
      clonedSvg.setAttribute('height', options.height.toString());
    }

    // Set background color if provided
    if (options.backgroundColor) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('fill', options.backgroundColor);
      clonedSvg.insertBefore(rect, clonedSvg.firstChild);
    }

    // Serialize SVG to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    
    // Create blob and download
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = options.filename || `visualization-${Date.now()}.svg`;
    link.href = url;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export as SVG:', error);
    throw new Error('SVG export failed. Please try again.');
  }
};

/**
 * Export visualization as PDF
 */
export const exportAsPDF = async (
  element: HTMLElement | SVGElement,
  options: Partial<ExportOptions> = {}
): Promise<void> => {
  try {
    // Dynamic imports for better code splitting
    const [jsPDF, html2canvas] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);

    const canvas = await html2canvas.default(element as HTMLElement, {
      backgroundColor: options.backgroundColor || '#ffffff',
      width: options.width,
      height: options.height,
      scale: options.quality || 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    } as any);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF.jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(options.filename || `visualization-${Date.now()}.pdf`);
  } catch (error) {
    console.error('Failed to export as PDF:', error);
    throw new Error('PDF export failed. Please try again.');
  }
};

/**
 * Export visualization data as JSON
 */
export const exportAsJSON = (
  data: any,
  options: Partial<ExportOptions> = {}
): void => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = options.filename || `visualization-data-${Date.now()}.json`;
    link.href = url;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export as JSON:', error);
    throw new Error('JSON export failed. Please try again.');
  }
};

/**
 * Create shareable state object
 */
export const createShareableState = (
  graphType: string,
  layoutType: string,
  viewSettings: Record<string, any>,
  selectedNode?: any
): ShareableState => {
  return {
    graphType,
    layoutType,
    viewSettings,
    selectedNode,
    timestamp: Date.now(),
    version: '1.0.0'
  };
};

/**
 * Generate shareable URL with state
 */
export const generateShareableURL = (state: ShareableState): string => {
  try {
    const encodedState = btoa(JSON.stringify(state));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?shared=${encodedState}`;
  } catch (error) {
    console.error('Failed to generate shareable URL:', error);
    throw new Error('Failed to generate shareable URL');
  }
};

/**
 * Parse shareable URL to extract state
 */
export const parseShareableURL = (url?: string): ShareableState | null => {
  try {
    const urlToParse = url || window.location.href;
    const urlObj = new URL(urlToParse);
    const sharedParam = urlObj.searchParams.get('shared');
    
    if (!sharedParam) {
      return null;
    }

    const decodedState = atob(sharedParam);
    const state = JSON.parse(decodedState) as ShareableState;
    
    // Validate state structure
    if (!state.graphType || !state.layoutType || !state.version) {
      throw new Error('Invalid state structure');
    }

    return state;
  } catch (error) {
    console.error('Failed to parse shareable URL:', error);
    return null;
  }
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw new Error('Failed to copy to clipboard');
  }
};

/**
 * Get optimal export dimensions based on content
 */
export const getOptimalExportDimensions = (
  element: HTMLElement,
  format: 'png' | 'svg' | 'pdf' | 'json'
): { width: number; height: number } => {
  const rect = element.getBoundingClientRect();
  const aspectRatio = rect.width / rect.height;
  
  // Base dimensions for different formats
  const baseDimensions = {
    png: { width: 1920, height: 1080 },
    svg: { width: 1200, height: 800 },
    pdf: { width: 1600, height: 1200 },
    json: { width: 1200, height: 800 }
  };

  const base = baseDimensions[format];
  
  // Maintain aspect ratio
  if (aspectRatio > base.width / base.height) {
    // Wider than base ratio
    return {
      width: base.width,
      height: Math.round(base.width / aspectRatio)
    };
  } else {
    // Taller than base ratio
    return {
      width: Math.round(base.height * aspectRatio),
      height: base.height
    };
  }
};

/**
 * Validate export options
 */
export const validateExportOptions = (options: Partial<ExportOptions>): ExportOptions => {
  const validated: ExportOptions = { 
    format: 'png',
    ...options 
  };
  
  // Ensure quality is within valid range
  if (validated.quality !== undefined) {
    validated.quality = Math.max(0.1, Math.min(3, validated.quality));
  }
  
  // Ensure dimensions are positive
  if (validated.width !== undefined) {
    validated.width = Math.max(100, validated.width);
  }
  if (validated.height !== undefined) {
    validated.height = Math.max(100, validated.height);
  }
  
  // Validate filename
  if (validated.filename) {
    validated.filename = validated.filename.replace(/[^a-z0-9.-]/gi, '_');
  }
  
  return validated;
};