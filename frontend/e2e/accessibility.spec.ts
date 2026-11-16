/**
 * Accessibility checks in a real browser. Unlike the jsdom scans in the unit
 * tests, these see computed styles, so colour contrast and focus visibility
 * are actually evaluated.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PROJECT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../backend/pyanalyzer',
);
const ROUTES = ['/', '/map', '/architecture', '/explore', '/search?q=analy', '/issues'];
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe.configure({ mode: 'serial' });

async function analyzed(page: Page): Promise<void> {
  const started = await page.request.post('/api/analysis', { data: { project_path: PROJECT } });
  expect(started.ok()).toBe(true);
  await expect
    .poll(async () => (await (await page.request.get('/api/analysis')).json()).state, {
      timeout: 30_000,
    })
    .toBe('completed');
}

async function settle(page: Page): Promise<void> {
  // Data views render after their queries resolve; wait for loading states to clear.
  await expect(page.getByText(/^Loading.*…$/)).toHaveCount(0, { timeout: 15_000 });
}

test.describe('accessibility', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await analyzed(page);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    // Leave the server as other suites expect it: no analysis.
    const page = await browser.newPage();
    await page.request.delete('/api/analysis');
    await page.close();
  });

  for (const scheme of ['light', 'dark'] as const) {
    for (const route of ROUTES) {
      test(`${route} has no WCAG 2.1 AA violations (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(route);
        await settle(page);
        const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
        const summary = results.violations.map((violation) => ({
          rule: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.slice(0, 3).map((node) => node.failureSummary),
        }));
        expect(summary).toEqual([]);
      });
    }
  }

  test('every route has landmarks and one top-level heading', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      await settle(page);
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('navigation').first()).toBeAttached();
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
    }
  });

  test('the skip link is the first stop and moves focus to the content', async ({ page }) => {
    await page.goto('/');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeAttached(); // the first render runs in a transition
    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('the app can be used with the keyboard alone', async ({ page }) => {
    await page.goto('/');
    await settle(page);

    // Tab to the navigation, then move through it with the arrow keys.
    let label = '';
    for (let step = 0; step < 20 && label !== 'Home'; step += 1) {
      await page.keyboard.press('Tab');
      label = (await page.evaluate(() => document.activeElement?.textContent ?? '')).trim();
    }
    expect(label).toBe('Home');
    for (let step = 0; step < 10 && label !== 'Code Explorer'; step += 1) {
      await page.keyboard.press('ArrowDown');
      label = (await page.evaluate(() => document.activeElement?.textContent ?? '')).trim();
    }
    expect(label).toBe('Code Explorer');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/explore/);
    await settle(page);

    // Filter the list by typing, then open the first element from the keyboard.
    await page.getByLabel('Filter by name').focus();
    await page.keyboard.type('AnalysisManager');
    const row = page.getByRole('button', { name: /AnalysisManager/ }).first();
    await expect(row).toBeVisible();
    await row.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/id=class/);
    await expect(page.getByRole('heading', { name: 'AnalysisManager' })).toBeVisible();

    // Focus indicators are drawn for keyboard users.
    const outline = await row.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe('none');

    // The shortcuts dialog opens with ?, traps focus, and Escape closes it.
    await page.locator('#main-content').focus();
    await page.keyboard.press('Shift+?');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(':focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('analysis progress is announced to assistive technology', async ({ page }) => {
    await page.request.delete('/api/analysis');
    await page.goto('/');
    await page.getByLabel('Project path').fill(PROJECT);
    await page.getByRole('button', { name: 'Analyze' }).click();
    // The progress region is a polite live region, so screen readers read updates.
    const live = page.locator('[aria-live="polite"][role="status"]').first();
    await expect(live).toBeAttached();
    await expect(page.getByRole('region', { name: 'Analysis summary' })).toBeVisible({
      timeout: 30_000,
    });
  });
});
