/**
 * Validation utilities for the application
 */

// Path validation
export function isValidPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  
  // Basic path validation - not empty and doesn't contain invalid characters
  const invalidChars = /[<>:"|?*]/;
  return path.trim().length > 0 && !invalidChars.test(path);
}

export function isAbsolutePath(path: string): boolean {
  // Check for absolute paths on different platforms
  return /^([a-zA-Z]:\\|\/|~\/)/.test(path);
}

export function isPythonFile(filename: string): boolean {
  return /\.py$/i.test(filename);
}

export function isPythonProject(path: string): boolean {
  // Basic heuristic - could be enhanced with actual file system checks
  return path.includes('.py') || path.includes('requirements.txt') || path.includes('setup.py');
}

// Data validation
export function isValidAnalysisData(data: unknown): data is { project_name: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'project_name' in data &&
    typeof (data as { project_name: unknown }).project_name === 'string'
  );
}

// URL validation
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Email validation (basic)
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Number validation
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && !isNaN(value);
}

export function isValidPort(port: unknown): port is number {
  return typeof port === 'number' && port >= 1 && port <= 65535;
}

// String validation
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function hasMinLength(str: string, minLength: number): boolean {
  return str.length >= minLength;
}

export function hasMaxLength(str: string, maxLength: number): boolean {
  return str.length <= maxLength;
}

// Array validation
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

// Object validation
export function hasRequiredKeys<T extends Record<string, unknown>>(
  obj: unknown,
  keys: (keyof T)[]
): obj is T {
  if (typeof obj !== 'object' || obj === null) return false;
  
  return keys.every(key => key in obj);
}

// Form validation helpers
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateProjectPath(path: string): ValidationResult {
  const errors: string[] = [];
  
  if (!isNonEmptyString(path)) {
    errors.push('Path is required');
  } else {
    if (!isValidPath(path)) {
      errors.push('Path contains invalid characters');
    }
    if (!isAbsolutePath(path)) {
      errors.push('Path must be absolute');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateSearchQuery(query: string): ValidationResult {
  const errors: string[] = [];
  
  if (!isNonEmptyString(query)) {
    errors.push('Search query cannot be empty');
  } else {
    if (!hasMinLength(query, 2)) {
      errors.push('Search query must be at least 2 characters');
    }
    if (!hasMaxLength(query, 100)) {
      errors.push('Search query must be less than 100 characters');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}