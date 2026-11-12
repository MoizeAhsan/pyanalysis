/**
 * Hook to detect keyboard navigation and apply appropriate styles
 */

import { useEffect } from 'react';

export function useKeyboardDetection() {
  useEffect(() => {
    let isKeyboardNavigation = false;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'Tab' ||
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight' ||
        event.key === 'Enter' ||
        event.key === ' ' ||
        event.key === 'Escape'
      ) {
        if (!isKeyboardNavigation) {
          isKeyboardNavigation = true;
          document.body.classList.add('keyboard-navigation-active');
        }
      }
    };

    const handleMouseDown = () => {
      if (isKeyboardNavigation) {
        isKeyboardNavigation = false;
        document.body.classList.remove('keyboard-navigation-active');
      }
    };

    const handlePointerDown = () => {
      if (isKeyboardNavigation) {
        isKeyboardNavigation = false;
        document.body.classList.remove('keyboard-navigation-active');
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('pointerdown', handlePointerDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.body.classList.remove('keyboard-navigation-active');
    };
  }, []);
}
