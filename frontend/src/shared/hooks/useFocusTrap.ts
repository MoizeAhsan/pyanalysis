/**
 * Hook for managing focus traps in modals and overlays
 */

import { useEffect, useRef, useCallback } from 'react';
import { FocusManager } from '@shared/utils/accessibility';

interface UseFocusTrapOptions {
  active: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
  initialFocus?: () => HTMLElement | null;
  onEscape?: () => void;
}

export function useFocusTrap({
  active,
  restoreFocus = true,
  autoFocus = true,
  initialFocus,
  onEscape,
}: UseFocusTrapOptions) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
      }
    },
    [onEscape],
  );

  useEffect(() => {
    if (!active || !containerRef.current) {
      return undefined;
    }

    const container = containerRef.current;

    // Store the currently focused element
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // Set up focus trap
    cleanupRef.current = FocusManager.trapFocus(container);

    // Focus initial element
    if (autoFocus) {
      const focusTarget = initialFocus?.() || FocusManager.getFocusableElements(container)[0];
      if (focusTarget) {
        // Small delay to ensure the element is ready to receive focus
        setTimeout(() => focusTarget.focus(), 10);
      }
    }

    // Add escape key handler
    if (onEscape) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      // Cleanup focus trap
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      // Remove escape handler
      if (onEscape) {
        document.removeEventListener('keydown', handleEscape);
      }

      // Restore focus
      if (restoreFocus && previousFocusRef.current && document.contains(previousFocusRef.current)) {
        setTimeout(() => previousFocusRef.current?.focus(), 10);
      }
    };
  }, [active, autoFocus, restoreFocus, initialFocus, onEscape, handleEscape]);

  return {
    containerRef,
    containerProps: {
      ref: containerRef,
      role: 'dialog',
      'aria-modal': 'true',
      tabIndex: -1,
    },
  };
}
