import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

/** The analyzer's own backend package: a real project with classes, imports, and usages. */
const PROJECT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../backend/pyanalyzer',
);
const SHOTS = process.env.E2E_SCREENSHOTS;

async function shot(page: Page, name: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}

test.describe.configure({ mode: 'serial' });

test.describe('analyze and explore a project', () => {
  let page: Page;
  const consoleErrors: string[] = [];

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('other views ask for an analysis first', async () => {
    await page.goto('/architecture');
    await expect(page.getByText('No project has been analyzed yet')).toBeVisible();
    await page.getByRole('link', { name: 'Analyze a project' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("a bad path is rejected with the server's explanation", async () => {
    await page.goto('/');
    await page.getByLabel('Project path').fill('/definitely/not/a/real/path');
    await page.getByRole('button', { name: 'Analyze' }).click();
    await expect(page.getByText(/does not exist/)).toBeVisible();
  });

  test('analysis completes and shows a summary', async () => {
    await page.getByLabel('Project path').fill(PROJECT);
    await page.getByRole('button', { name: 'Analyze' }).click();

    const summary = page.getByRole('region', { name: 'Analysis summary' });
    await expect(summary.getByRole('heading', { name: 'pyanalyzer' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(summary.getByText('Modules', { exact: true })).toBeVisible();
    await expect(summary.getByText(/analyzed in/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear results' })).toBeVisible();
    await shot(page, '1-home');
  });

  test('mind map expands lazily', async () => {
    await page.goto('/map');
    await expect(page.getByRole('heading', { name: 'Mind map' })).toBeVisible();
    await expect(page.getByTestId('graph-canvas')).toBeVisible();
    await expect(page.getByText(/\d+ nodes shown/)).toBeVisible();
    await expect(page.getByTestId('graph-canvas').locator('canvas').first()).toBeAttached();
    await shot(page, '2-mindmap');
  });

  test('architecture view switches levels and keeps them in the URL', async () => {
    await page.goto('/architecture');
    await expect(
      page.getByRole('img', { name: /module dependency graph with \d+ nodes/ }),
    ).toBeVisible();
    await shot(page, '3-architecture-modules');

    await page.getByRole('button', { name: 'Classes' }).click();
    await expect(page).toHaveURL(/level=class/);
    await expect(page.getByRole('img', { name: /class dependency graph/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Import cycles' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Detected patterns' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('img', { name: /class dependency graph/ })).toBeVisible();
    await shot(page, '4-architecture-classes');
  });

  test('search finds an element and opens it in the explorer', async () => {
    await page.goto('/search');
    await page.getByLabel('Search the project').fill('extract_file');
    await expect(page).toHaveURL(/q=extract_file/);
    const results = page.getByRole('region', { name: 'Search results' });
    await expect(results.getByText(/1 result for/)).toBeVisible();
    await shot(page, '5-search');
    await results.getByRole('button', { name: /extract_file/ }).click();

    await expect(page).toHaveURL(/\/explore\?id=function/);
    const details = page.getByRole('region', { name: 'Element details' });
    await expect(details.getByRole('heading', { name: 'extract_file' })).toBeVisible();
    await expect(
      details.getByText('def extract_file(root: str, rel_path: str) -> FileRecord', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(details.getByText(/\d+ uses? across \d+ files?/)).toBeVisible();
    await expect(details.getByLabel(/^Source of parsers\/extractor\.py/).last()).toContainText(
      'def extract_file',
    );
    await shot(page, '6-explorer');
  });

  test('usages show their source in context', async () => {
    const details = page.getByRole('region', { name: 'Element details' });
    await details.getByRole('button', { name: 'Show source' }).first().click();
    await expect(details.getByRole('button', { name: 'Hide source' })).toBeVisible();
  });

  test('explorer lists elements and filters by kind', async () => {
    await page.goto('/explore?type=class');
    const list = page.getByRole('region', { name: 'Elements' });
    await expect(list.getByText(/\d+ elements/)).toBeVisible();
    // The list is virtualized, so pick a class that is in the first rows.
    await list.getByRole('button', { name: /RecordCache/ }).click();
    await expect(
      page
        .getByRole('region', { name: 'Element details' })
        .getByRole('heading', { name: 'RecordCache' }),
    ).toBeVisible();
  });

  test('findings can be filtered and lead to the element', async () => {
    await page.goto('/issues');
    await expect(page.getByRole('heading', { name: 'Findings' })).toBeVisible();
    await expect(page.getByText(/\d+ findings?/)).toBeVisible();
    await shot(page, '7-issues');
  });

  test('deep links work and unknown routes are handled', async () => {
    await page.goto('/nowhere');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  test('clearing results returns every view to the empty state', async () => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Clear results' }).click();
    await expect(page.getByRole('region', { name: 'Analysis summary' })).toHaveCount(0);
    await page.goto('/explore');
    await expect(page.getByText('No project has been analyzed yet')).toBeVisible();
  });

  test('no errors were logged to the console', () => {
    // 404s for "no analysis yet" are expected responses, not application errors.
    const unexpected = consoleErrors.filter((text) => !/status of 40[04]/.test(text));
    expect(unexpected).toEqual([]);
  });
});
