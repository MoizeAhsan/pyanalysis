import React from 'react';
import {
  // Code elements
  Folder,
  FolderOpen,
  Description,
  Class,
  Functions,
  Code,
  DataObject,
  
  // Actions
  Search,
  Clear,
  Refresh,
  PlayArrow,
  Stop,
  Settings,
  Download,
  Upload,
  Share,
  
  // Navigation
  ArrowBack,
  ArrowForward,
  ExpandMore,
  ExpandLess,
  ChevronLeft,
  ChevronRight,
  
  // Status
  CheckCircle,
  Error,
  Warning,
  Info,
  HelpOutline,
  
  // UI Elements
  Close,
  Menu,
  MoreVert,
  FilterList,
  Sort,
  ViewList,
  ViewModule,
  GridView,
  
  // Analysis specific
  AccountTree,
  BubbleChart,
  Hub,
  Timeline,
  Analytics,
  Insights,
  
  // File types
  PictureAsPdf,
  Image,
  VideoFile,
  AudioFile,
  
} from '@mui/icons-material';

/**
 * Centralized icon system for consistent iconography throughout the app
 */
export const Icons = {
  // Code Elements
  module: Folder,
  moduleOpen: FolderOpen,
  file: Description,
  class: Class,
  function: Functions,
  method: Functions,
  variable: DataObject,
  code: Code,
  
  // Actions
  search: Search,
  clear: Clear,
  refresh: Refresh,
  analyze: PlayArrow,
  stop: Stop,
  settings: Settings,
  download: Download,
  upload: Upload,
  share: Share,
  
  // Navigation
  back: ArrowBack,
  forward: ArrowForward,
  expand: ExpandMore,
  collapse: ExpandLess,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  
  // Status
  success: CheckCircle,
  error: Error,
  warning: Warning,
  info: Info,
  help: HelpOutline,
  
  // UI Elements
  close: Close,
  menu: Menu,
  more: MoreVert,
  filter: FilterList,
  sort: Sort,
  listView: ViewList,
  moduleView: ViewModule,
  gridView: GridView,
  
  // Analysis Views
  mindMap: AccountTree,
  forceGraph: BubbleChart,
  network: Hub,
  timeline: Timeline,
  analytics: Analytics,
  insights: Insights,
  
  // File Types
  pdf: PictureAsPdf,
  image: Image,
  video: VideoFile,
  audio: AudioFile,
};

/**
 * Get icon component by element type
 */
export const getElementIcon = (elementType, variant = 'default') => {
  const type = elementType?.toLowerCase();
  
  switch (type) {
    case 'module':
    case 'package':
      return variant === 'open' ? Icons.moduleOpen : Icons.module;
    case 'class':
      return Icons.class;
    case 'function':
    case 'method':
      return Icons.function;
    case 'variable':
    case 'attribute':
      return Icons.variable;
    case 'file':
      return Icons.file;
    default:
      return Icons.code;
  }
};

/**
 * Get icon color by element type
 */
export const getElementColor = (elementType, theme) => {
  const type = elementType?.toLowerCase();
  
  switch (type) {
    case 'module':
    case 'package':
      return theme.palette.primary.main;
    case 'class':
      return theme.palette.secondary.main;
    case 'function':
    case 'method':
      return theme.palette.warning.main;
    case 'variable':
    case 'attribute':
      return theme.palette.info.main;
    default:
      return theme.palette.text.secondary;
  }
};

/**
 * Get status icon and color
 */
export const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'success':
    case 'completed':
    case 'done':
      return { icon: Icons.success, color: 'success' };
    case 'error':
    case 'failed':
    case 'failure':
      return { icon: Icons.error, color: 'error' };
    case 'warning':
    case 'caution':
      return { icon: Icons.warning, color: 'warning' };
    case 'info':
    case 'information':
      return { icon: Icons.info, color: 'info' };
    default:
      return { icon: Icons.help, color: 'default' };
  }
};

/**
 * Enhanced Icon component with consistent styling
 */
export const EnhancedIcon = ({
  icon: IconComponent,
  size = 'medium',
  color = 'inherit',
  className = '',
  sx = {},
  hover = false,
  ...props
}) => {
  const sizeMap = {
    small: '1rem',
    medium: '1.5rem',
    large: '2rem',
    xlarge: '2.5rem',
  };

  const enhancedSx = {
    fontSize: typeof size === 'string' ? sizeMap[size] || size : size,
    color: color,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    ...(hover && {
      '&:hover': {
        transform: 'scale(1.1)',
        opacity: 0.8,
      },
    }),
    ...sx,
  };

  return (
    <IconComponent
      className={`enhanced-icon ${className}`}
      sx={enhancedSx}
      {...props}
    />
  );
};

/**
 * Icon with badge component
 */
export const IconWithBadge = ({
  icon: IconComponent,
  badge,
  badgeColor = 'error',
  size = 'medium',
  ...props
}) => {
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <EnhancedIcon icon={IconComponent} size={size} {...props} />
      {badge && (
        <div
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            backgroundColor: badgeColor === 'error' ? '#f44336' : 
                           badgeColor === 'warning' ? '#ff9800' :
                           badgeColor === 'success' ? '#4caf50' : '#2196f3',
            color: 'white',
            borderRadius: '50%',
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 'bold',
          }}
        >
          {badge}
        </div>
      )}
    </div>
  );
};

/**
 * Animated icon component
 */
export const AnimatedIcon = ({
  icon: IconComponent,
  animation = 'none',
  duration = '1s',
  ...props
}) => {
  const animations = {
    spin: {
      animation: `spin ${duration} linear infinite`,
      '@keyframes spin': {
        from: { transform: 'rotate(0deg)' },
        to: { transform: 'rotate(360deg)' },
      },
    },
    pulse: {
      animation: `pulse ${duration} ease-in-out infinite`,
      '@keyframes pulse': {
        '0%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.1)' },
        '100%': { transform: 'scale(1)' },
      },
    },
    bounce: {
      animation: `bounce ${duration} ease-in-out infinite`,
      '@keyframes bounce': {
        '0%, 20%, 60%, 100%': { transform: 'translateY(0)' },
        '40%': { transform: 'translateY(-10px)' },
        '80%': { transform: 'translateY(-5px)' },
      },
    },
  };

  return (
    <EnhancedIcon
      icon={IconComponent}
      sx={animations[animation] || {}}
      {...props}
    />
  );
};

export default Icons;