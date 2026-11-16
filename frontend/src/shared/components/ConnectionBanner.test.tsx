import { act, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { server } from '@/test/server';
import { ConnectionBanner } from './ConnectionBanner';

describe('ConnectionBanner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows nothing while the backend is healthy', async () => {
    renderApp(<ConnectionBanner />);
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(screen.queryByText(/offline|Cannot reach/)).toBeNull();
  });

  it('says when the backend cannot be reached, and recovers', async () => {
    server.use(http.get('*/api/health', () => HttpResponse.error()));
    const { user } = renderApp(<ConnectionBanner />);
    expect(await screen.findByText(/Cannot reach the analyzer backend/)).toBeInTheDocument();

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry now' }));
    await vi.waitFor(() => expect(screen.queryByText(/Cannot reach/)).toBeNull());
  });

  it('follows the browser going offline and back online', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderApp(<ConnectionBanner />);
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(await screen.findByText(/You are offline/)).toBeInTheDocument();

    onLine.mockReturnValue(true);
    act(() => void window.dispatchEvent(new Event('online')));
    expect(screen.queryByText(/You are offline/)).toBeNull();
  });
});
