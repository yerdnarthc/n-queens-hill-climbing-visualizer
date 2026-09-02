import { test as base, expect, type Page } from '@playwright/test';

/**
 * E2E fixture — extends the default Playwright `test` with helpers that handle
 * the app's hydration quirks:
 *
 *   - The home page is wrapped in `<React.Suspense>` (URL state uses
 *     `useSearchParams`). After `goto`, the `<HomeContent>` branch must
 *     hydrate before any visual element is mounted.
 *   - `useUrlConfigSync` writes the URL with `throttleMs: 150`. Specs that
 *     assert against `page.url()` should poll rather than read once.
 *
 * Centralising the hydration wait here keeps the per-spec setup tiny.
 */
export const test = base.extend<{
  hydratedHome: Page;
  hydratedHowItWorks: Page;
}>({
  hydratedHome: async ({ page }, use) => {
    await page.goto('/');
    // The board grid is mounted by <HomeContent> post-hydration. Waiting for it
    // to be visible guarantees React has finished the first render pass and
    // the store has bootstrapped a result.
    await expect(page.getByTestId('chessboard-grid')).toBeVisible();
    await use(page);
  },
  hydratedHowItWorks: async ({ page }, use) => {
    await page.goto('/how-it-works');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await use(page);
  },
});

export { expect };
