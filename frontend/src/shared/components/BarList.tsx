import type { ReactNode } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { formatCount } from '@shared/lib/format';

export interface BarItem {
  key: string;
  label: ReactNode;
  value: number;
  /** Shown in the hover tooltip, e.g. "used by 12 modules". */
  detail: string;
}

interface BarListProps {
  items: readonly BarItem[];
  /** Accessible name of the list, matching its visible heading. */
  label: string;
}

/**
 * Ranked horizontal bars for one measure. Bars are decorative: each row also
 * states its value as text, so the list reads the same without them.
 */
export function BarList({ items, label }: BarListProps) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <Box component="ol" aria-label={label} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {items.map((item) => (
        <Tooltip key={item.key} title={item.detail} placement="top-start" disableInteractive>
          <Box
            component="li"
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr) 3.5rem',
                sm: 'minmax(8rem, 14rem) 1fr 3.5rem',
              },
              alignItems: 'center',
              columnGap: 1.5,
              py: 0.5,
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Box
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </Box>
            <Box
              aria-hidden="true"
              sx={{
                display: { xs: 'none', sm: 'block' },
                height: 8,
                bgcolor: 'action.selected',
                borderRadius: '0 4px 4px 0',
              }}
            >
              <Box
                data-testid="bar"
                sx={{
                  height: '100%',
                  width: `${(item.value / max) * 100}%`,
                  minWidth: 2,
                  bgcolor: 'primary.main',
                  borderRadius: '0 4px 4px 0',
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
              {formatCount(item.value)}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}
