import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Badge,
  Typography
} from '@mui/material';

/**
 * TabbedInterface component for organizing content into manageable sections
 * Supports badges, icons, and lazy loading of tab content
 */
const TabbedInterface = ({
  tabs = [],
  defaultTab = 0,
  variant = 'standard',
  orientation = 'horizontal',
  sx = {},
  tabsProps = {},
  contentSx = {},
  lazyLoad = true,
  ...paperProps
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loadedTabs, setLoadedTabs] = useState(new Set([defaultTab]));

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (lazyLoad) {
      setLoadedTabs(prev => new Set([...prev, newValue]));
    }
  };

  const renderTabLabel = (tab) => {
    const label = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {tab.icon && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {tab.icon}
          </Box>
        )}
        <Typography variant="body2" component="span">
          {tab.label}
        </Typography>
      </Box>
    );

    if (tab.badge !== null && tab.badge !== undefined) {
      return (
        <Badge
          badgeContent={tab.badge}
          color="primary"
          max={999}
        >
          {label}
        </Badge>
      );
    }

    return label;
  };

  if (tabs.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', ...sx }} {...paperProps}>
        <Typography variant="body2" color="text.secondary">
          No tabs available
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ ...sx }} {...paperProps}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant={variant}
          orientation={orientation}
          scrollButtons="auto"
          allowScrollButtonsMobile
          {...tabsProps}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.id || index}
              label={renderTabLabel(tab)}
              disabled={tab.disabled}
              sx={tab.sx}
            />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ p: 2, ...contentSx }}>
        {tabs.map((tab, index) => {
          const isActive = index === activeTab;
          const shouldRender = !lazyLoad || loadedTabs.has(index) || isActive;

          return (
            <Box
              key={tab.id || index}
              role="tabpanel"
              hidden={!isActive}
              sx={{
                display: isActive ? 'block' : 'none'
              }}
            >
              {shouldRender && (
                <>
                  {tab.content}
                </>
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default TabbedInterface;