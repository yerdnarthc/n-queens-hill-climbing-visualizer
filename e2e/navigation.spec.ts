import { test, expect } from './fixtures/test';

/**
 * Navigation — the SiteNav (Phase 5) has two links and a footer link on the
 * home page that all navigate between the visualizer and the static
 * /how-it-works guide. Active link styling uses the `bg-primary/10` class.
 */
test.describe('Navigation — site nav and footer', () => {
  test('Visualizer link is active on the home page', async ({ hydratedHome: page }) => {
    const link = page.locator('nav').getByRole('link', { name: /visualizer/i });
    await expect(link).toHaveClass(/bg-primary\/10/);
  });

  test('clicking How It Works navigates and activates the link', async ({ hydratedHome: page }) => {
    await page
      .locator('nav')
      .getByRole('link', { name: /how it works/i })
      .click();
    await expect(page).toHaveURL(/\/how-it-works$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Active state should now be on the How It Works link.
    await expect(page.locator('nav').getByRole('link', { name: /how it works/i })).toHaveClass(
      /bg-primary\/10/,
    );
  });

  test('the footer link on the home page navigates to /how-it-works', async ({
    hydratedHome: page,
  }) => {
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: /how it works/i })).toBeVisible();
    await footer.getByRole('link', { name: /how it works/i }).click();
    await expect(page).toHaveURL(/\/how-it-works$/);
  });

  test('How It Works renders the educational guide and a CTA back to the visualizer', async ({
    hydratedHowItWorks: page,
  }) => {
    await expect(
      page.getByRole('heading', { name: /how hill climbing solves the n-queens puzzle/i }),
    ).toBeVisible();
    // "Open the Visualizer" CTA link is rendered by the static page.
    await expect(page.getByRole('link', { name: /open the visualizer/i })).toBeVisible();
  });

  test('the Open Visualizer CTA returns to the home page', async ({ hydratedHowItWorks: page }) => {
    await page.getByRole('link', { name: /open the visualizer/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('chessboard-grid')).toBeVisible();
  });
});
