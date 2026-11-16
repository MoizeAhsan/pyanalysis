import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import type { ElementSummary } from '@shared/api/types';
import { ElementTypeChip } from '@shared/components/ElementTypeChip';
import { Highlight } from '@shared/components/Highlight';
import { plural } from '@shared/lib/format';

interface ElementRowProps {
  element: ElementSummary;
  selected?: boolean | undefined;
  onSelect: (id: string) => void;
  /** Extra line under the name, e.g. why a search matched. */
  note?: string | undefined;
  /** Search text to mark in the name, path, and note. */
  highlight?: string | undefined;
}

export const ELEMENT_ROW_HEIGHT = 76;

/** One element in a list: type, name, location, and how often it is used. */
export function ElementRow({
  element,
  selected = false,
  onSelect,
  note,
  highlight,
}: ElementRowProps) {
  return (
    <ButtonBase
      onClick={() => onSelect(element.id)}
      aria-current={selected ? 'true' : undefined}
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        px: 2,
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: selected ? 'action.selected' : 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
        '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: -2 },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <ElementTypeChip type={element.type} isMethod={element.is_method} />
        <Typography noWrap sx={{ fontWeight: 500, minWidth: 0 }} title={element.qualified_name}>
          <Highlight text={element.qualified_name} query={highlight} />
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          {plural(element.usage_count, 'use')}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" noWrap title={element.file_path}>
        <Highlight text={element.file_path} query={highlight} />:{element.line}
      </Typography>
      <Typography variant="body2" color="text.secondary" noWrap>
        {note ? <Highlight text={note} query={highlight} /> : (element.summary ?? ' ')}
      </Typography>
    </ButtonBase>
  );
}
