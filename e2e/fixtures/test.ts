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
 *   - The first-visit onboarding tour (`OnboardingTour`) auto-opens on an
 *     empty localStorage — i.e. in EVERY fresh e2e context — and its fixed
 *     overlay would intercept all pointer events. Both fixtures suppress it
 *     via `addInitScript` (runs before page scripts on every navigation, so
 *     share URLs under test are untouched). Tour behavior itself is covered
 *     by `e2e/tour.spec.ts`, which deliberately skips these fixtures.
 *
 * Centralising the hydration wait here keeps the per-spec setup tiny.
 */
export const test = base.extend<{
  hydratedHome: Page;
  hydratedHowItWorks: Page;
}>({
  hydratedHome: async ({ page }, use) => {
    // Pretend this browser has seen the tour (see header comment).
    await page.addInitScript(() => {
      window.localStorage.setItem('nqueens-tour:v1', '1');
    });
    await page.goto('/');
    // The board grid is mounted by <HomeContent> post-hydration. Waiting for it
    // to be visible guarantees React has finished the first render pass and
    // the store has bootstrapped a result.
    await expect(page.getByTestId('chessboard-grid')).toBeVisible();
    await use(page);
  },
  hydratedHowItWorks: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('nqueens-tour:v1', '1');
    });
    await page.goto('/how-it-works');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await use(page);
  },
});

export { expect };
