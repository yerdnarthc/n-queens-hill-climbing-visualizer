import { test, expect } from './fixtures/test';

/**
 * Smoke — the bare minimum that proves the app boots and every Phase 0–6
 * surface renders. If this fails, the more detailed specs are noise; the
 * bundle never reached a usable state.
 */
test.describe('Smoke — app boots', () => {
  test('home page renders board, stats, config, analytics, and footer link', async ({
    hydratedHome: page,
  }) => {
    // Board — 8×8 default config ⇒ 64 squares.
    await expect(page.getByTestId('chessboard-grid')).toBeVisible();
    await expect(page.getByTestId('square-0-0')).toBeVisible();
    await expect(page.getByTestId('square-7-7')).toBeVisible();
    const squareCount = await page.locator('[data-testid^="square-"]').count();
    expect(squareCount).toBe(64);

    // Stats header — status badge, step counter, conflict counter all wired.
    await expect(page.getByText(/run status/i)).toBeVisible();
    await expect(page.getByText(/timeline cursor/i)).toBeVisible();
    await expect(page.getByText(/attacking pairs/i)).toBeVisible();

    // Config panel — default N=8, seed 27, steepest-ascent visible.
    await expect(page.getByText('Configuration')).toBeVisible();
    await expect(page.getByText(/N = 8 Queens/i)).toBeVisible();
    await expect(page.getByText(/steepest-ascent/i).first()).toBeVisible();

    // Analytics panel — Convergence tab is the default; the ECharts canvas
    // renders (we don't pixel-test it).
    await expect(page.getByTestId('analytics-panel')).toBeVisible();
    await expect(page.getByRole('tab', { name: /convergence/i })).toBeVisible();
    await expect(page.getByTestId('convergence-echarts')).toBeVisible();

    // Footer link to the educational page. Scoped to <footer> to avoid
    // matching the SiteNav link (which shares the same accessible name).
    await expect(page.locator('footer').getByRole('link', { name: /how it works/i })).toBeVisible();
  });

  test('the engine has already produced a result on first paint', async ({
    hydratedHome: page,
  }) => {
    // The "Run Status" badge should NOT read "Initializing…" — the driver
    // bootstraps a run in its mount effect (default N=8, seed=27,
    // steepest-ascent). The exact terminal status varies by run length, but it
    // is one of the three resolved states.
    const statusBadge = page.locator('header').getByText(/(solved|stagnated|exhausted|frozen)/i);
    await expect(statusBadge).toBeVisible();
    await expect(page.getByText(/initializing/i)).toHaveCount(0);
  });

  test('the site nav persists above every page', async ({ hydratedHome: page }) => {
    const nav = page.locator('nav').first();
    await expect(nav.getByRole('link', { name: /visualizer/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /how it works/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /toggle theme/i })).toBeVisible();
  });
});
