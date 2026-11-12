import { defineConfig, devices } from '@playwright/test';

const PORT = 8766;

/**
 * End-to-end tests run against the real backend serving the production build
 * (`npm run build` first). The backend gets a throwaway cache directory.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    actionTimeout: 10_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `../backend/.venv/bin/pyanalyzer serve --no-browser --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: { PYANALYZER_CACHE_DIR: 'e2e/.cache', PYANALYZER_WORKERS: '2' },
  },
});
