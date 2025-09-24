/**
 * Modern App Shell with responsive navigation and accessibility features
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Visibility as VisibilityIcon,
  PlayArrow as DemoIcon,
  Dashboard as DashboardIcon,
  PlayArrow,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { ThemeSwitcher } from '@design-system/components/ThemeSwitcher';
import { FocusManager, AriaUtils } from '@shared/utils/accessibility';
import { useKeyboardNavigation } from '@shared/hooks/useKeyboardNavigation';
import { useKeyboardDetection } from '@shared/hooks/useKeyboardDetection';

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
    ],
  },
  {
    id: 'search',
    label: 'Search',
    icon: <SearchIcon />,
  },
  {
    id: 'demo',
    label: 'Demo',
    icon: <DemoIcon />,
    children: [
      {
        id: 'visualization-demo',
        label: 'Visualization Components',
        icon: <DashboardIcon />,
      },
      {
        id: 'component-demo',
        label: 'Interactive Demo',
        icon: <PlayArrow />,
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon />,
    disabled: true,
  },
];

const DRAWER_WIDTH = 280;

export function AppShell({ children, currentView = 'home', onViewChange }: AppShellProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
      navItems.forEach(item => {
        items.push({ ...item, depth });
        if (item.children && expandedItems.has(item.id)) {
          addItems(item.children, depth + 1);
        }
      });
    };
    addItems(navigationItems);
    return items;
  }, [expandedItems]);

  const {
    containerRef: navigationContainerRef,
    getItemProps,
  } = useKeyboardNavigation(flatNavigationItems.length, {
    orientation: 'vertical',
    wrap: true,
    onSelect: (index) => {
      const item = flatNavigationItems[index];
      if (item && !item.disabled) {
        handleItemClick(item.id, Boolean(item.children));
      }
    },
  });

  // Close mobile drawer when view changes
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [currentView, isMobile]);

  // Announce navigation changes to screen readers
  useEffect(() => {
    const currentItem = navigationItems
      .flatMap(item => [item, ...(item.children || [])])
      .find(item => item.id === currentView);
    
    if (currentItem) {
      AriaUtils.updateLiveRegion(
        announcementId,
        `Navigated to ${currentItem.label}`,
        'polite'
      );
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
      'polite'
    );
  }, [mobileOpen, announcementId]);

  const handleItemClick = useCallback((itemId: string, hasChildren: boolean = false) => {
    if (hasChildren) {
      setExpandedItems(prev => {
        const newSet = new Set(prev);
        const isExpanding = !newSet.has(itemId);
        
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        
        // Announce expansion state change
        const item = navigationItems.find(nav => nav.id === itemId);
        if (item) {
          AriaUtils.updateLiveRegion(
            announcementId,
            `${item.label} ${isExpanding ? 'expanded' : 'collapsed'}`,
            'polite'
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
  }, [onViewChange, isMobile, announcementId]);

  const renderNavigationItem = (item: NavigationItem, depth = 0, flatIndex?: number) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isSelected = currentView === item.id;
    const isChildSelected = item.children?.some(child => child.id === currentView);
    const itemProps = flatIndex !== undefined ? getItemProps(flatIndex) : {};

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <motion.div
            {...(!item.disabled && {
              whileHover: { x: 4, transition: { duration: 0.15, ease: [0, 0, 0.2, 1] } },
              whileTap: { scale: 0.98, transition: { duration: 0.15, ease: [0, 0, 0.2, 1] } }
            })}
            style={{ borderRadius: 8, margin: '0 8px 4px 8px' }}
          >
            <ListItemButton
              {...itemProps}
              onClick={() => handleItemClick(item.id, hasChildren)}
              disabled={item.disabled || false}
              selected={Boolean(isSelected || isChildSelected)}
              sx={{
                minHeight: 48,
                pl: 2 + depth * 2,
                pr: 2,
                borderRadius: 1,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'action.hover',
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
          </motion.div>
          
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
        </ListItem>

        {hasChildren && (
          <Collapse 
            in={isExpanded} 
            timeout="auto" 
            unmountOnExit
            aria-label={`${item.label} submenu`}
          >
            <List 
              component="div" 
              disablePadding
              role="group"
              aria-labelledby={`${item.id}-label`}
            >
              {item.children?.map(child => renderNavigationItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
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
          component="h2"
          sx={{
            fontWeight: 700,
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <span role="img" aria-label="Python snake">🐍</span>
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
      <Box 
        sx={{ flex: 1, overflow: 'auto', py: 1 }}
        {...navigationContainerRef}
      >
        <List 
          component="nav" 
          role="menubar"
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
            const flatIndex = flatNavigationItems.findIndex(flatItem => flatItem.id === item.id);
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
          role="contentinfo"
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
              gap: 1,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
            }}
          >
            <span role="img" aria-label="Python snake" style={{ fontSize: '1.5em' }}>🐍</span>
            Python Code Analyzer
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
            keepMounted: true, // Better open performance on mobile
            'aria-labelledby': 'navigation-drawer-title',
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              backgroundImage: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer */}
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
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
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
    </Box>
  );
}