/**
 * Accessibility utilities and helpers
 */

// Focus management utilities
export class FocusManager {
  private static focusStack: HTMLElement[] = [];

  /**
   * Trap focus within a container element
   */
  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Store the currently focused element
    const previouslyFocused = document.activeElement as HTMLElement;
    this.focusStack.push(previouslyFocused);

    // Focus the first element
    firstElement?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      const previousElement = this.focusStack.pop();
      if (previousElement && document.contains(previousElement)) {
        previousElement.focus();
      }
    };
  }

  /**
   * Get all focusable elements within a container
   */
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors)).filter((element) => {
      const htmlElement = element as HTMLElement;
      return (
        htmlElement.offsetWidth > 0 &&
        htmlElement.offsetHeight > 0 &&
        !htmlElement.hidden &&
        window.getComputedStyle(htmlElement).visibility !== 'hidden'
      );
    }) as HTMLElement[];
  }

  /**
   * Announce text to screen readers
   */
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.setAttribute('class', 'sr-only');
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';

    document.body.appendChild(announcer);
    announcer.textContent = message;

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }
}

// Keyboard navigation utilities
export class KeyboardNavigation {
  /**
   * Handle arrow key navigation for a list of elements
   */
  static handleArrowNavigation(
    event: KeyboardEvent,
    elements: HTMLElement[],
    currentIndex: number,
    options: {
      orientation?: 'horizontal' | 'vertical' | 'both';
      wrap?: boolean;
      onNavigate?: (newIndex: number) => void;
    } = {},
  ): number {
    const { orientation = 'vertical', wrap = true, onNavigate } = options;
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          newIndex =
            currentIndex > 0 ? currentIndex - 1 : wrap ? elements.length - 1 : currentIndex;
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          newIndex =
            currentIndex < elements.length - 1 ? currentIndex + 1 : wrap ? 0 : currentIndex;
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          newIndex =
            currentIndex > 0 ? currentIndex - 1 : wrap ? elements.length - 1 : currentIndex;
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          newIndex =
            currentIndex < elements.length - 1 ? currentIndex + 1 : wrap ? 0 : currentIndex;
        }
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = elements.length - 1;
        break;
    }

    if (newIndex !== currentIndex) {
      elements[newIndex]?.focus();
      onNavigate?.(newIndex);
    }

    return newIndex;
  }
}

// Color contrast utilities
export class ColorContrast {
  /**
   * Calculate the relative luminance of a color
   */
  static getLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * (r || 0) + 0.7152 * (g || 0) + 0.0722 * (b || 0);
  }

  /**
   * Calculate contrast ratio between two colors
   */
  static getContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Check if contrast ratio meets WCAG standards
   */
  static meetsWCAG(color1: string, color2: string, level: 'AA' | 'AAA' = 'AA'): boolean {
    const ratio = this.getContrastRatio(color1, color2);
    return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
  }

  /**
   * Convert hex color to RGB
   */
  private static hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1] || '0', 16),
          parseInt(result[2] || '0', 16),
          parseInt(result[3] || '0', 16),
        ]
      : null;
  }
}

// ARIA utilities
export class AriaUtils {
  /**
   * Generate a unique ID for ARIA relationships
   */
  static generateId(prefix = 'aria'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set up ARIA describedby relationship
   */
  static setDescribedBy(element: HTMLElement, descriptionId: string) {
    const existingIds = element.getAttribute('aria-describedby')?.split(' ') || [];
    if (!existingIds.includes(descriptionId)) {
      existingIds.push(descriptionId);
      element.setAttribute('aria-describedby', existingIds.join(' '));
    }
  }

  /**
   * Remove ARIA describedby relationship
   */
  static removeDescribedBy(element: HTMLElement, descriptionId: string) {
    const existingIds = element.getAttribute('aria-describedby')?.split(' ') || [];
    const filteredIds = existingIds.filter((id) => id !== descriptionId);

    if (filteredIds.length > 0) {
      element.setAttribute('aria-describedby', filteredIds.join(' '));
    } else {
      element.removeAttribute('aria-describedby');
    }
  }

  /**
   * Set up ARIA labelledby relationship
   */
  static setLabelledBy(element: HTMLElement, labelId: string) {
    element.setAttribute('aria-labelledby', labelId);
  }

  /**
   * Update ARIA live region
   */
  static updateLiveRegion(
    regionId: string,
    message: string,
    priority: 'polite' | 'assertive' = 'polite',
  ) {
    let region = document.getElementById(regionId);

    if (!region) {
      region = document.createElement('div');
      region.id = regionId;
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      region.style.position = 'absolute';
      region.style.left = '-10000px';
      region.style.width = '1px';
      region.style.height = '1px';
      region.style.overflow = 'hidden';
      document.body.appendChild(region);
    }

    region.textContent = message;
  }
}

// Screen reader utilities
export class ScreenReaderUtils {
  /**
   * Check if user prefers reduced motion
   */
  static prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Check if user is using a screen reader
   */
  static isUsingScreenReader(): boolean {
    // This is a heuristic and not 100% reliable
    return (
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('VoiceOver') ||
      window.speechSynthesis?.getVoices().length > 0
    );
  }

  /**
   * Create a visually hidden element for screen readers
   */
  static createScreenReaderOnly(text: string): HTMLElement {
    const element = document.createElement('span');
    element.textContent = text;
    element.className = 'sr-only';
    element.style.position = 'absolute';
    element.style.left = '-10000px';
    element.style.width = '1px';
    element.style.height = '1px';
    element.style.overflow = 'hidden';
    return element;
  }
}

// Export all utilities
export const a11y = {
  FocusManager,
  KeyboardNavigation,
  ColorContrast,
  AriaUtils,
  ScreenReaderUtils,
};
