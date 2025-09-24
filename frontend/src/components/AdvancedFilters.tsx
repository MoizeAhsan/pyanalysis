/**
 * Advanced Filters Component for Enhanced Search
 */
import React, { useState, useCallback } from 'react';
import {
  Box,
  Chip,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Button,
  Stack,
  Paper,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import {
  Code as CodeIcon,
  Class,
  Functions,
  Folder,
  Description,
  Public,
  Clear
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { FILTER_PRESETS, type FilterPresetKey } from '@shared/utils/search';

interface AdvancedFiltersProps {
  elementType: string;
  activeFilters: Record<string, any>;
  onTypeChange: (type: string) => void;
  onFiltersChange: (filters: Record<string, any>) => void;
  onApplyPreset: (preset: FilterPresetKey) => void;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  elementType,
  activeFilters,
  onTypeChange,
  onFiltersChange,
  onApplyPreset
}) => {
  const theme = useTheme();
  const [localFilters, setLocalFilters] = useState(activeFilters);

  const handleTypeChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    const newType = event.target.value as string;
    onTypeChange(newType);
    setLocalFilters(prev => ({ ...prev, elementType: newType }));
  }, [onTypeChange]);

  const handleToggleFilter = useCallback((filterKey: string, value: any) => {
    const newFilters = { ...localFilters };
    
    if (newFilters[filterKey] === value) {
      delete newFilters[filterKey];
    } else {
      newFilters[filterKey] = value;
    }
    
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  }, [localFilters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    setLocalFilters({});
    onFiltersChange({});
    onTypeChange('');
  }, [onFiltersChange, onTypeChange]);

  const getActiveFilterCount = () => {
    return Object.keys(localFilters).filter(key => 
      key !== 'elementType' && localFilters[key] !== undefined
    ).length;
  };

  return (
    <Paper sx={{ 
      p: 2, 
      mt: 2,
      backgroundColor: alpha(theme.palette.background.default, 0.5),
      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
    }}>
      {/* Filter Presets */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          Quick Filters
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {Object.entries(FILTER_PRESETS).map(([key, preset]) => (
            <Tooltip key={key} title={preset.description}>
              <Chip
                label={preset.name}
                onClick={() => onApplyPreset(key as FilterPresetKey)}
                variant={elementType === (preset.filters as any).elementType ? 'filled' : 'outlined'}
                color="primary"
                size="small"
                sx={{
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: theme.shadows[2]
                  }
                }}
              />
            </Tooltip>
          ))}
        </Stack>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Element Type Filter */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          Element Type
        </Typography>
        <ToggleButtonGroup
          value={elementType}
          exclusive
          onChange={(_, newType) => newType !== null && handleTypeChange({ target: { value: newType } } as any)}
          size="small"
          sx={{ flexWrap: 'wrap', gap: 1 }}
        >
          <ToggleButton value="" sx={{ minWidth: 80 }}>
            <CodeIcon sx={{ mr: 1 }} />
            All
          </ToggleButton>
          <ToggleButton value="module" sx={{ minWidth: 80 }}>
            <Folder sx={{ mr: 1 }} />
            Modules
          </ToggleButton>
          <ToggleButton value="class" sx={{ minWidth: 80 }}>
            <Class sx={{ mr: 1 }} />
            Classes
          </ToggleButton>
          <ToggleButton value="function" sx={{ minWidth: 80 }}>
            <Functions sx={{ mr: 1 }} />
            Functions
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Content Filters */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          Content Filters
        </Typography>
        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={localFilters.hasDocstring || false}
                onChange={(e) => handleToggleFilter('hasDocstring', e.target.checked)}
                size="small"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Description fontSize="small" />
                <Typography variant="body2">Has Documentation</Typography>
              </Box>
            }
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={localFilters.isPublic || false}
                onChange={(e) => handleToggleFilter('isPublic', e.target.checked)}
                size="small"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Public fontSize="small" />
                <Typography variant="body2">Public API Only</Typography>
              </Box>
            }
          />
        </Stack>
      </Box>

      {/* Filter Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active
        </Typography>
        
        <Button
          startIcon={<Clear />}
          onClick={handleClearFilters}
          size="small"
          disabled={getActiveFilterCount() === 0 && !elementType}
        >
          Clear All
        </Button>
      </Box>
    </Paper>
  );
};