/**
 * Hook for managing global keyboard shortcuts
 */

import { useEffect, useCallback } from 'react';
import { FocusManager } from '@shared/utils/accessibility';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: KeyboardShortcut[];
}

export function useKeyboardShortcuts({ enabled = true, shortcuts }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when user is typing in an input
      const target = event.target as HTMLElement;
      const isInputElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true';

      if (isInputElement && !event.ctrlKey && !event.metaKey && !event.altKey) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
        const altMatches = !!shortcut.altKey === event.altKey;
        const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
        const metaMatches = !!shortcut.metaKey === event.metaKey;

        if (keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    },
    [enabled, shortcuts],
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [enabled, handleKeyDown]);

  return {
    shortcuts,
  };
}

// Common keyboard shortcuts
export const createCommonShortcuts = (actions: {
  onHome?: () => void;
  onSearch?: () => void;
  onHelp?: () => void;
  onSettings?: () => void;
  onToggleTheme?: () => void;
  onToggleNavigation?: () => void;
  onMainContent?: () => void;
}): KeyboardShortcut[] => [
  {
    key: 'h',
    altKey: true,
    action: () => actions.onHome?.(),
    description: 'Go to home',
  },
  {
    key: 's',
    ctrlKey: true,
    action: () => actions.onSearch?.(),
    description: 'Open search',
  },
  {
    key: '/',
    action: () => actions.onSearch?.(),
    description: 'Open search',
  },
  {
    key: '?',
    shiftKey: true,
    action: () => actions.onHelp?.(),
    description: 'Show keyboard shortcuts',
  },
  {
    key: 't',
    altKey: true,
    action: () => actions.onToggleTheme?.(),
    description: 'Toggle theme',
  },
  {
    key: 'm',
    altKey: true,
    action: () => actions.onToggleNavigation?.(),
    description: 'Toggle navigation menu',
  },
  {
    key: 'Escape',
    action: () => {
      // Close any open modals or focus main content
      const focusable = FocusManager.getFocusableElements(document.body);
      const mainContent = document.getElementById('main-content');
      if (mainContent && focusable.includes(mainContent)) {
        mainContent.focus();
      }
    },
    description: 'Close modals or focus main content',
  },
  {
    key: '1',
    altKey: true,
    action: () => actions.onMainContent?.(),
    description: 'Focus main content',
  },
];
