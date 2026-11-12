import { Chip } from '@mui/material';
import {
  AccountTree,
  Class as ClassIcon,
  Folder,
  Functions,
  InsertDriveFile,
} from '@mui/icons-material';
import type { ReactElement } from 'react';

type ChipColor = 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning';

interface Appearance {
  label: string;
  color: ChipColor;
  icon: ReactElement;
}

const APPEARANCE: Record<string, Appearance> = {
  directory: { label: 'Directory', color: 'default', icon: <Folder /> },
  package: { label: 'Package', color: 'default', icon: <AccountTree /> },
  module: { label: 'Module', color: 'primary', icon: <InsertDriveFile /> },
  class: { label: 'Class', color: 'secondary', icon: <ClassIcon /> },
  function: { label: 'Function', color: 'success', icon: <Functions /> },
  method: { label: 'Method', color: 'info', icon: <Functions /> },
};

const UNKNOWN: Appearance = { label: 'Element', color: 'default', icon: <InsertDriveFile /> };

interface ElementTypeChipProps {
  type: string;
  isMethod?: boolean;
}

/** Consistent label, colour, and icon for each kind of element. */
export function ElementTypeChip({ type, isMethod = false }: ElementTypeChipProps) {
  const appearance = APPEARANCE[isMethod ? 'method' : type] ?? UNKNOWN;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={appearance.color}
      icon={appearance.icon}
      label={appearance.label}
      sx={{ flexShrink: 0 }}
    />
  );
}
