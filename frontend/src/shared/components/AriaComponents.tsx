/**
 * Enhanced ARIA components for better accessibility
 */

import { Box, BoxProps } from '@mui/material';
import { forwardRef, ReactNode } from 'react';

/**
 * Component for creating descriptive text that's only visible to screen readers
 */
interface ScreenReaderOnlyProps extends BoxProps {
  children: ReactNode;
  as?: 'span' | 'div' | 'p';
}

export const ScreenReaderOnly = forwardRef<HTMLElement, ScreenReaderOnlyProps>(
  function ScreenReaderOnly({ children, as = 'span', ...props }, ref) {
    return (
      <Box
        ref={ref}
        component={as}
        sx={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          ...props.sx,
        }}
        {...props}
      >
        {children}
      </Box>
    );
  }
);

/**
 * Visually hidden but focusable element (for skip links)
 */
export const VisuallyHiddenFocusable = forwardRef<HTMLElement, ScreenReaderOnlyProps>(
  function VisuallyHiddenFocusable({ children, as = 'span', sx, ...props }, ref) {
    return (
      <Box
        ref={ref}
        component={as}
        sx={{
          position: 'absolute',
          left: '-9999px',
          zIndex: 9999,
          '&:focus': {
            position: 'static',
            left: 'auto',
          },
          ...sx,
        }}
        {...props}
      >
        {children}
      </Box>
    );
  }
);

/**
 * ARIA description component - creates a hidden element that can be referenced
 */
interface AriaDescriptionProps {
  id: string;
  children: ReactNode;
}

export function AriaDescription({ id, children }: AriaDescriptionProps) {
  return (
    <Box
      id={id}
      component="div"
      sx={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  );
}

/**
 * Enhanced button with loading and error states for screen readers
 */
interface AccessibleButtonState {
  isLoading?: boolean;
  loadingText?: string;
  hasError?: boolean;
  errorText?: string;
  successText?: string;
  isDisabled?: boolean;
  disabledReason?: string;
}

interface AriaButtonStateProps {
  state: AccessibleButtonState;
  baseId: string;
}

export function AriaButtonState({ state, baseId }: AriaButtonStateProps) {
  const { isLoading, loadingText, hasError, errorText, successText, isDisabled, disabledReason } = state;

  return (
    <>
      {isLoading && (
        <AriaDescription id={`${baseId}-loading`}>
          {loadingText || 'Loading, please wait...'}
        </AriaDescription>
      )}
      {hasError && (
        <AriaDescription id={`${baseId}-error`}>
          {errorText || 'An error occurred'}
        </AriaDescription>
      )}
      {successText && (
        <AriaDescription id={`${baseId}-success`}>
          {successText}
        </AriaDescription>
      )}
      {isDisabled && disabledReason && (
        <AriaDescription id={`${baseId}-disabled`}>
          {disabledReason}
        </AriaDescription>
      )}
    </>
  );
}

/**
 * Progress announcer for multi-step processes
 */
interface ProgressAnnouncerProps {
  current: number;
  total: number;
  label?: string;
  description?: string;
}

export function ProgressAnnouncer({ current, total, label = 'Step', description }: ProgressAnnouncerProps) {
  const progressText = `${label} ${current} of ${total}${description ? `: ${description}` : ''}`;
  
  return (
    <ScreenReaderOnly 
      role="status" 
      aria-live="polite"
      aria-atomic="true"
    >
      {progressText}
    </ScreenReaderOnly>
  );
}

/**
 * Expanded/collapsed state announcer
 */
interface ExpandableStateProps {
  isExpanded: boolean;
  expandedText?: string;
  collapsedText?: string;
}

export function ExpandableStateAnnouncer({ 
  isExpanded, 
  expandedText = 'Expanded', 
  collapsedText = 'Collapsed' 
}: ExpandableStateProps) {
  return (
    <ScreenReaderOnly>
      {isExpanded ? expandedText : collapsedText}
    </ScreenReaderOnly>
  );
}

/**
 * Sort state announcer for tables and lists
 */
interface SortStateProps {
  sortDirection?: 'asc' | 'desc' | null;
  sortField?: string;
}

export function SortStateAnnouncer({ sortDirection, sortField }: SortStateProps) {
  if (!sortDirection || !sortField) return null;

  const sortText = `Sorted by ${sortField} in ${sortDirection === 'asc' ? 'ascending' : 'descending'} order`;
  
  return (
    <ScreenReaderOnly role="status" aria-live="polite">
      {sortText}
    </ScreenReaderOnly>
  );
}

/**
 * Selection announcer for multi-select components
 */
interface SelectionAnnouncerProps {
  selectedCount: number;
  totalCount: number;
  itemType?: string;
}

export function SelectionAnnouncer({ 
  selectedCount, 
  totalCount, 
  itemType = 'items' 
}: SelectionAnnouncerProps) {
  const selectionText = `${selectedCount} of ${totalCount} ${itemType} selected`;
  
  return (
    <ScreenReaderOnly role="status" aria-live="polite">
      {selectionText}
    </ScreenReaderOnly>
  );
}

/**
 * Error boundary announcer
 */
interface ErrorAnnouncerProps {
  hasError: boolean;
  errorMessage?: string;
}

export function ErrorAnnouncer({ hasError, errorMessage }: ErrorAnnouncerProps) {
  if (!hasError) return null;

  return (
    <ScreenReaderOnly role="alert" aria-live="assertive">
      {errorMessage || 'An error has occurred. Please try again.'}
    </ScreenReaderOnly>
  );
}

/**
 * Form validation announcer
 */
interface ValidationAnnouncerProps {
  errors: string[];
  fieldName?: string;
}

export function ValidationAnnouncer({ errors, fieldName }: ValidationAnnouncerProps) {
  if (errors.length === 0) return null;

  const errorText = errors.length === 1 
    ? `${fieldName ? `${fieldName}: ` : ''}${errors[0]}`
    : `${fieldName ? `${fieldName} has ` : ''}${errors.length} validation errors: ${errors.join(', ')}`;

  return (
    <ScreenReaderOnly role="alert" aria-live="assertive">
      {errorText}
    </ScreenReaderOnly>
  );
}