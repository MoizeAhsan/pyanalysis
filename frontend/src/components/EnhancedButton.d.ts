import { ButtonProps } from '@mui/material/Button';

interface EnhancedButtonProps extends ButtonProps {
  loading?: boolean;
  hoverEffect?: 'lift' | 'scale' | 'glow' | 'slide' | 'pulse';
  glowColor?: string;
}

declare const EnhancedButton: React.FC<EnhancedButtonProps>;
export default EnhancedButton;