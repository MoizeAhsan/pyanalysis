/**
 * Enhanced TextField Component
 * Extends Material-UI TextField with additional features and consistent styling
 */

import { forwardRef } from 'react';
import {
  TextField as MuiTextField,
  TextFieldProps as MuiTextFieldProps,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Visibility, VisibilityOff, Clear } from '@mui/icons-material';
import { useState } from 'react';
import { spacingTokens } from '../../tokens';

export interface TextFieldProps extends Omit<MuiTextFieldProps, 'size'> {
  /** Input size */
  size?: 'small' | 'medium' | 'large';
  /** Show clear button when input has value */
  clearable?: boolean;
  /** Custom clear button tooltip */
  clearTooltip?: string;
  /** Show character count */
  showCharacterCount?: boolean;
  /** Maximum character count */
  maxLength?: number;
}

export const TextField = forwardRef<HTMLDivElement, TextFieldProps>(
  (
    {
      type = 'text',
      size = 'medium',
      clearable = false,
      clearTooltip = 'Clear',
      showCharacterCount = false,
      maxLength,
      value,
      onChange,
      InputProps,
      helperText,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputValue = value?.toString() || '';
    const characterCount = inputValue.length;

    const handleClear = () => {
      if (onChange) {
        const event = {
          target: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    const sizeStyles = {
      small: {
        '& .MuiInputBase-root': {
          minHeight: 32,
          fontSize: '0.875rem',
        },
      },
      medium: {
        '& .MuiInputBase-root': {
          minHeight: 40,
          fontSize: '1rem',
        },
      },
      large: {
        '& .MuiInputBase-root': {
          minHeight: 48,
          fontSize: '1.125rem',
        },
      },
    };

    // Build end adornment
    const endAdornments = [];
    
    if (clearable && inputValue) {
      endAdornments.push(
        <Tooltip key="clear" title={clearTooltip}>
          <IconButton
            size="small"
            onClick={handleClear}
            edge="end"
            sx={{ mr: isPassword ? 0 : 0.5 }}
          >
            <Clear fontSize="small" />
          </IconButton>
        </Tooltip>
      );
    }

    if (isPassword) {
      endAdornments.push(
        <Tooltip key="password" title={showPassword ? 'Hide password' : 'Show password'}>
          <IconButton
            size="small"
            onClick={togglePasswordVisibility}
            edge="end"
            sx={{ mr: 0.5 }}
          >
            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
          </IconButton>
        </Tooltip>
      );
    }

    const finalHelperText = showCharacterCount && maxLength ? (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{helperText}</span>
        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
          {characterCount}/{maxLength}
        </span>
      </div>
    ) : helperText;

    return (
      <MuiTextField
        ref={ref}
        type={isPassword ? (showPassword ? 'text' : 'password') : type}
        value={value}
        onChange={onChange}
        inputProps={{
          maxLength,
          ...props.inputProps,
        }}
        InputProps={{
          ...InputProps,
          endAdornment: endAdornments.length > 0 ? (
            <InputAdornment position="end">
              {endAdornments}
            </InputAdornment>
          ) : InputProps?.endAdornment,
        }}
        helperText={finalHelperText}
        sx={{
          ...sizeStyles[size],
          '& .MuiOutlinedInput-root': {
            borderRadius: `${spacingTokens.borderRadius.md}px`,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2,
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2,
              },
            },
          },
          // Focus styles for accessibility
          '& .MuiOutlinedInput-root.Mui-focused': {
            boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
          },
          '& .MuiOutlinedInput-root.Mui-error.Mui-focused': {
            boxShadow: '0 0 0 2px rgba(244, 67, 54, 0.2)',
          },
        }}
        {...props}
      />
    );
  }
);

TextField.displayName = 'TextField';