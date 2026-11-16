/**
 * Modern App Shell with responsive navigation and accessibility features
 */

import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  useTheme,
  useMediaQuery,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Home as HomeIcon,
  Analytics as AnalyticsIcon,
  AccountTree as ArchitectureIcon,
  Search as SearchIcon,
  Code as CodeIcon,
  ExpandLess,
  ExpandMore,
  Visibility as VisibilityIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { ThemeSwitcher } from '@design-system/components/ThemeSwitcher';
import { useThemeToggle } from '@design-system/providers/ThemeProvider';
import { FocusManager, AriaUtils } from '@shared/utils/accessibility';
import { useKeyboardNavigation } from '@shared/hooks/useKeyboardNavigation';
import { useKeyboardDetection } from '@shared/hooks/useKeyboardDetection';
import { useKeyboardShortcuts, createCommonShortcuts } from '@shared/hooks/useKeyboardShortcuts';
import { ConnectionBanner } from '@shared/components/ConnectionBanner';

// Loaded on first use; it is not needed to show the page.
const KeyboardHelpDialog = lazy(() =>
  import('@shared/components/KeyboardHelpDialog').then((module) => ({
    default: module.KeyboardHelpDialog,
  })),
);

interface AppShellProps {
  children: React.ReactNode;
  currentView?: string;
  onViewChange?: (view: string) => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: NavigationItem[];
  disabled?: boolean;
  depth?: number;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: <HomeIcon />,
  },
  {
    id: 'analysis',
    label: 'Analysis',
    icon: <AnalyticsIcon />,
    children: [
      {
        id: 'mindmap',
        label: 'Mind Map',
        icon: <VisibilityIcon />,
      },
      {
        id: 'architecture',
        label: 'Architecture',
        icon: <ArchitectureIcon />,
      },
      {
        id: 'code-explorer',
        label: 'Code Explorer',
        icon: <CodeIcon />,
      },
      {
        id: 'issues',
        label: 'Findings',
        icon: <DashboardIcon />,
      },
    ],
  },
  {
    id: 'search',
    label: 'Search',
    icon: <SearchIcon />,
  },
];

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_MOBILE = 260;

export function AppShell({ children, currentView = 'home', onViewChange }: AppShellProps) {
  const theme = useTheme();
  const { toggleMode } = useThemeToggle();
  // Read synchronously so the first render already knows which drawer to draw.
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['analysis']));
  const [announcementId] = useState(() => AriaUtils.generateId('navigation-announcement'));
  const drawerRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);

  // Enable keyboard navigation detection
  useKeyboardDetection();

  // Keyboard navigation for drawer items
  const flatNavigationItems = React.useMemo(() => {
    const items: NavigationItem[] = [];
    const addItems = (navItems: NavigationItem[], depth = 0) => {
      navItems.forEach((item) => {
        items.push({ ...item, depth });
        if (item.children && expandedItems.has(item.id)) {
          addItems(item.children, depth + 1);
        }
      });
    };
    addItems(navigationItems);
    return items;
  }, [expandedItems]);

  const { containerRef: navigationContainerRef, getItemProps } = useKeyboardNavigation(
    flatNavigationItems.length,
    {
      orientation: 'vertical',
      wrap: true,
      onSelect: (index) => {
        const item = flatNavigationItems[index];
        if (item && !item.disabled) {
          handleItemClick(item.id, Boolean(item.children));
        }
      },
    },
  );

  // Close mobile drawer when view changes
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [currentView, isMobile]);

  // Announce navigation changes to screen readers
  useEffect(() => {
    const currentItem = navigationItems
      .flatMap((item) => [item, ...(item.children || [])])
      .find((item) => item.id === currentView);

    if (currentItem) {
      AriaUtils.updateLiveRegion(announcementId, `Navigated to ${currentItem.label}`, 'polite');
    }
  }, [currentView, announcementId]);

  // Focus management for mobile drawer
  useEffect(() => {
    if (mobileOpen && drawerRef.current) {
      const cleanup = FocusManager.trapFocus(drawerRef.current);
      return cleanup;
    }
    return undefined;
  }, [mobileOpen]);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(!mobileOpen);

    // Announce drawer state change
    AriaUtils.updateLiveRegion(
      announcementId,
      `Navigation menu ${!mobileOpen ? 'opened' : 'closed'}`,
      'polite',
    );
  }, [mobileOpen, announcementId]);

  // Keyboard help dialog state
  const [helpOpen, setHelpOpen] = useState(false);
  const showHelp = useCallback(() => setHelpOpen(true), []);
  const hideHelp = useCallback(() => setHelpOpen(false), []);

  // Set up global keyboard shortcuts
  const shortcuts = React.useMemo(
    () =>
      createCommonShortcuts({
        onHome: () => onViewChange?.('home'),
        onSearch: () => onViewChange?.('search'),
        onHelp: showHelp,
        onToggleTheme: toggleMode,
        onToggleNavigation: handleDrawerToggle,
        onMainContent: () => mainContentRef.current?.focus(),
      }),
    [onViewChange, showHelp, toggleMode, handleDrawerToggle],
  );

  useKeyboardShortcuts({ shortcuts });

  const handleItemClick = useCallback(
    (itemId: string, hasChildren: boolean = false) => {
      if (hasChildren) {
        setExpandedItems((prev) => {
          const newSet = new Set(prev);
          const isExpanding = !newSet.has(itemId);

          if (newSet.has(itemId)) {
            newSet.delete(itemId);
          } else {
            newSet.add(itemId);
          }

          // Announce expansion state change
          const item = navigationItems.find((nav) => nav.id === itemId);
          if (item) {
            AriaUtils.updateLiveRegion(
              announcementId,
              `${item.label} ${isExpanding ? 'expanded' : 'collapsed'}`,
              'polite',
            );
          }

          return newSet;
        });
      } else {
        onViewChange?.(itemId);

        // Close mobile drawer after navigation
        if (isMobile) {
          setMobileOpen(false);
        }

        // Focus main content after navigation
        setTimeout(() => {
          mainContentRef.current?.focus();
        }, 100);
      }
    },
    [onViewChange, isMobile, announcementId],
  );

  const renderNavigationItem = (item: NavigationItem, depth = 0, flatIndex?: number) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isSelected = currentView === item.id;
    const isChildSelected = item.children?.some((child) => child.id === currentView);
    const itemProps = flatIndex !== undefined ? getItemProps(flatIndex) : {};

    return (
      <ListItem
        key={item.id}
        disablePadding
        sx={{
          display: 'block',
          borderRadius: 2,
          m: '0 8px 4px 8px',
          transition: 'transform 0.15s cubic-bezier(0, 0, 0.2, 1)',
          ...(!item.disabled && {
            '&:hover': { transform: 'translateX(4px)' },
            '&:active': { transform: 'scale(0.98)' },
          }),
          '@media (prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' },
        }}
      >
        <ListItemButton
          {...itemProps}
          onClick={() => handleItemClick(item.id, hasChildren)}
          disabled={item.disabled || false}
          selected={Boolean(isSelected || isChildSelected)}
          sx={{
            minHeight: { xs: 52, sm: 48 }, // Larger touch target on mobile
            pl: 2 + depth * 2,
            pr: 2,
            borderRadius: 1,
            transition: 'all 0.2s ease-in-out',
            // Better touch feedback
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
            '&:active': {
              backgroundColor: 'action.selected',
            },
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
              backgroundColor: 'action.focus',
            },
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.contrastText}`,
              },
              '& .MuiListItemIcon-root': {
                color: 'primary.contrastText',
              },
            },
            '&.Mui-disabled': {
              opacity: 0.5,
            },
          }}
          aria-label={`${item.label}${hasChildren ? (isExpanded ? ', expanded' : ', collapsed') : ''}${item.disabled ? ', disabled' : ''}`}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-current={isSelected ? 'page' : undefined}
          aria-describedby={item.disabled ? `${item.id}-disabled-desc` : undefined}
        >
          <ListItemIcon
            sx={{
              minWidth: 40,
              color: 'inherit',
              transition: 'transform 0.2s ease-in-out',
            }}
            aria-hidden="true"
          >
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            sx={{
              '& .MuiTypography-root': {
                fontWeight: isSelected ? 600 : 400,
                fontSize: depth > 0 ? '0.875rem' : '1rem',
              },
            }}
          />
          {hasChildren && (
            <Box
              component="span"
              sx={{
                color: 'inherit',
                display: 'flex',
                alignItems: 'center',
                ml: 1,
              }}
              aria-hidden="true"
            >
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </Box>
          )}
        </ListItemButton>

        {/* Hidden description for disabled items */}
        {item.disabled && (
          <Box
            id={`${item.id}-disabled-desc`}
            sx={{
              position: 'absolute',
              left: '-10000px',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
            }}
          >
            This feature is currently disabled
          </Box>
        )}

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="ul" disablePadding aria-label={`${item.label} submenu`}>
              {item.children?.map((child) =>
                renderNavigationItem(
                  child,
                  depth + 1,
                  flatNavigationItems.findIndex((flatItem) => flatItem.id === child.id),
                ),
              )}
            </List>
          </Collapse>
        )}
      </ListItem>
    );
  };

  const drawer = (
    <Box
      ref={drawerRef}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Drawer Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          minHeight: 64,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography
          id="navigation-drawer-title"
          variant="h6"
          component="div"
          sx={{
            fontWeight: 700,
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <span role="img" aria-label="Python snake">
            🐍
          </span>
          Code Analyzer
        </Typography>
        {isMobile && (
          <IconButton
            onClick={handleDrawerToggle}
            aria-label="Close navigation menu"
            sx={{
              color: 'text.secondary',
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Navigation Items */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }} ref={navigationContainerRef}>
        <List
          component="ul"
          aria-label="Main navigation menu"
          sx={{
            '& .MuiListItemButton-root': {
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
            },
          }}
        >
          {navigationItems.map((item) => {
            const flatIndex = flatNavigationItems.findIndex((flatItem) => flatItem.id === item.id);
            return renderNavigationItem(item, 0, flatIndex);
          })}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center' }}
        >
          Python Code Analyzer v1.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Skip Links for Accessibility */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: '-9999px',
          zIndex: 9999,
          padding: 1,
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          textDecoration: 'none',
          borderRadius: 1,
          '&:focus': {
            left: 2,
            top: 2,
          },
        }}
      >
        Skip to main content
      </Box>

      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 50%, #64b5f6 100%)',
          boxShadow: '0px 4px 20px rgba(25, 118, 210, 0.3)',
          zIndex: theme.zIndex.drawer + 1,
        }}
        role="banner"
      >
        <Toolbar sx={{ py: 1 }}>
          {/* Mobile Menu Button */}
          <IconButton
            color="inherit"
            aria-label={`${mobileOpen ? 'Close' : 'Open'} navigation menu`}
            aria-expanded={mobileOpen}
            aria-controls="navigation-drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              mr: 2,
              display: { md: 'none' },
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'scale(1.1)',
              },
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.contrastText}`,
                outlineOffset: 2,
              },
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Title */}
          <Typography
            variant="h6"
            component="h1"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.5, sm: 1 },
              fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' },
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span role="img" aria-label="Python snake" style={{ fontSize: '1.3em' }}>
              🐍
            </span>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Python Code Analyzer
            </Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              PyAnalyzer
            </Box>
          </Typography>

          {/* Theme Switcher */}
          <Box>
            <ThemeSwitcher variant="icon" size="medium" />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        aria-label="Navigation drawer"
      >
        {/* Mobile Drawer */}
        <Drawer
          id="navigation-drawer"
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            // Rendered only while open: the hidden copy doubled the first render's cost.
            keepMounted: false,
            'aria-labelledby': 'navigation-drawer-title',
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: { xs: '85vw', sm: DRAWER_WIDTH_MOBILE },
              maxWidth: DRAWER_WIDTH,
              backgroundImage: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer: not rendered on small screens, where it would be hidden anyway */}
        {!isMobile && (
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
                backgroundImage: 'none',
                borderRight: 1,
                borderColor: 'divider',
              },
            }}
            open
            PaperProps={{
              'aria-labelledby': 'navigation-drawer-title',
            }}
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        id="main-content"
        ref={mainContentRef}
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
          '&:focus-visible': {
            outline: 'none',
          },
        }}
        role="main"
        tabIndex={-1}
        aria-label="Main content area"
      >
        {/* Toolbar spacer */}
        <Toolbar />

        {/* Page Content */}
        <Box
          sx={{
            p: { xs: 1, sm: 2, md: 3 },
            pb: { xs: 8, sm: 3, md: 4 }, // Extra bottom padding on mobile for safe area
          }}
        >
          <ConnectionBanner />
          {children}
        </Box>
      </Box>

      {/* Live region for announcements */}
      <Box
        id={announcementId}
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      />

      {/* Keyboard Help Dialog */}
      {helpOpen && (
        <Suspense fallback={null}>
          <KeyboardHelpDialog open onClose={hideHelp} shortcuts={shortcuts} />
        </Suspense>
      )}

      {/* Footer - contentinfo landmark at top level */}
      <Box
        component="footer"
        role="contentinfo"
        sx={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          p: 1,
          fontSize: '0.75rem',
          color: 'text.secondary',
          display: { xs: 'none', md: 'block' },
        }}
      >
        v1.0
      </Box>
    </Box>
  );
}
