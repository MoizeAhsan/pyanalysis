/**
 * Custom hook for keyboard navigation
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { KeyboardNavigation } from '@shared/utils/accessibility';

interface UseKeyboardNavigationOptions {
  orientation?: 'horizontal' | 'vertical' | 'both';
  wrap?: boolean;
  autoFocus?: boolean;
  onNavigate?: (index: number) => void;
  onSelect?: (index: number) => void;
}

export function useKeyboardNavigation(
  itemCount: number,
  options: UseKeyboardNavigationOptions = {},
) {
  const {
    orientation = 'vertical',
    wrap = true,
    autoFocus = false,
    onNavigate,
    onSelect,
  } = options;

  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // Update item refs array when item count changes
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, itemCount);
  }, [itemCount]);

  // Auto focus first item if requested
  useEffect(() => {
    if (autoFocus && itemRefs.current[0]) {
      itemRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const elements = itemRefs.current.filter(Boolean) as HTMLElement[];
      if (elements.length === 0) return;

      KeyboardNavigation.handleArrowNavigation(event, elements, currentIndex, {
        orientation,
        wrap,
        onNavigate: (index) => {
          setCurrentIndex(index);
          onNavigate?.(index);
        },
      });

      // Handle Enter and Space for selection
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect?.(currentIndex);
      }
    },
    [currentIndex, orientation, wrap, onNavigate, onSelect],
  );

  // Attach keyboard event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const setItemRef = useCallback((index: number) => {
    return (element: HTMLElement | null) => {
      itemRefs.current[index] = element;
    };
  }, []);

  const focusItem = useCallback((index: number) => {
    if (index >= 0 && index < itemRefs.current.length) {
      itemRefs.current[index]?.focus();
      setCurrentIndex(index);
    }
  }, []);

  return {
    containerRef,
    currentIndex,
    setCurrentIndex,
    setItemRef,
    focusItem,
    containerProps: {
      ref: containerRef,
    },
    getItemProps: (index: number) => ({
      ref: setItemRef(index),
      tabIndex: index === currentIndex ? 0 : -1,
    }),
  };
}
