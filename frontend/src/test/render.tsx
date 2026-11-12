import type { ReactElement } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@design-system/providers/ThemeProvider';
import { createQueryClient } from '@shared/api/queries';
import { NotificationProvider } from '@shared/components/NotificationSystem';

interface Options {
  /** Initial URL, e.g. "/explore?type=class". */
  route?: string;
}

/** Exposes the router's current location to assertions. */
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

/** Render with every provider the app uses, a fresh query cache, and a memory router. */
export function renderApp(
  ui: ReactElement,
  { route = '/' }: Options = {},
): RenderResult & { user: UserEvent } {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } });
  const result = render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <NotificationProvider>
          <MemoryRouter initialEntries={[route]}>
            {ui}
            <LocationProbe />
          </MemoryRouter>
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return { ...result, user: userEvent.setup() };
}
