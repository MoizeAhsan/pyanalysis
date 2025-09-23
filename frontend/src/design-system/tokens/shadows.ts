/**
 * Design tokens for shadows following Material Design 3 principles
 * Includes elevation levels and custom shadow styles
 */

export const shadowTokens = {
  // Material Design 3 elevation levels
  elevation: {
    0: 'none',
    1: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
    2: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
    3: '0px 1px 3px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
    4: '0px 2px 3px rgba(0, 0, 0, 0.3), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)',
    5: '0px 4px 4px rgba(0, 0, 0, 0.3), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',
  },
  
  // Dark theme elevation levels
  elevationDark: {
    0: 'none',
    1: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
    2: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
    3: '0px 1px 3px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
    4: '0px 2px 3px rgba(0, 0, 0, 0.3), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)',
    5: '0px 4px 4px rgba(0, 0, 0, 0.3), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',
  },
  
  // Custom shadow styles
  custom: {
    // Subtle shadows
    subtle: '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24)',
    
    // Card shadows
    card: '0px 2px 4px rgba(0, 0, 0, 0.1), 0px 8px 16px rgba(0, 0, 0, 0.1)',
    cardHover: '0px 4px 8px rgba(0, 0, 0, 0.12), 0px 16px 24px rgba(0, 0, 0, 0.14)',
    
    // Button shadows
    button: '0px 1px 2px rgba(0, 0, 0, 0.2)',
    buttonHover: '0px 2px 4px rgba(0, 0, 0, 0.2), 0px 4px 8px rgba(0, 0, 0, 0.14)',
    buttonPressed: 'inset 0px 1px 2px rgba(0, 0, 0, 0.2)',
    
    // Modal shadows
    modal: '0px 8px 16px rgba(0, 0, 0, 0.24), 0px 16px 32px rgba(0, 0, 0, 0.16)',
    
    // Dropdown shadows
    dropdown: '0px 4px 8px rgba(0, 0, 0, 0.12), 0px 8px 16px rgba(0, 0, 0, 0.08)',
    
    // Focus shadows
    focus: '0px 0px 0px 2px rgba(25, 118, 210, 0.2)',
    focusError: '0px 0px 0px 2px rgba(244, 67, 54, 0.2)',
    focusSuccess: '0px 0px 0px 2px rgba(76, 175, 80, 0.2)',
    
    // Glow effects
    glow: '0px 0px 16px rgba(25, 118, 210, 0.3)',
    glowHover: '0px 0px 24px rgba(25, 118, 210, 0.4)',
    
    // Inner shadows
    inset: 'inset 0px 1px 2px rgba(0, 0, 0, 0.1)',
    insetDeep: 'inset 0px 2px 4px rgba(0, 0, 0, 0.15)',
  },
  
  // Component-specific shadows
  component: {
    appBar: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    drawer: '0px 8px 16px rgba(0, 0, 0, 0.15)',
    fab: '0px 3px 5px rgba(0, 0, 0, 0.2), 0px 6px 10px rgba(0, 0, 0, 0.14), 0px 1px 18px rgba(0, 0, 0, 0.12)',
    fabHover: '0px 5px 5px rgba(0, 0, 0, 0.2), 0px 9px 12px rgba(0, 0, 0, 0.14), 0px 3px 20px rgba(0, 0, 0, 0.12)',
    tooltip: '0px 2px 8px rgba(0, 0, 0, 0.15)',
    snackbar: '0px 3px 5px rgba(0, 0, 0, 0.2), 0px 6px 10px rgba(0, 0, 0, 0.14)',
  },
} as const;

export type ShadowToken = typeof shadowTokens;