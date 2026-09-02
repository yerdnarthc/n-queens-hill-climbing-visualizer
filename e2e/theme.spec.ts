import { test, expect } from './fixtures/test';

/**
 * Theme — verifies the persistent global theme toggle (relocated from the
 * stats header to the SiteNav in Phase 5). The `next-themes` key it writes is
 * `theme` (and we don't pin that exactly — it's an implementation detail).
 */
test.describe('Theme — global toggle persists', () => {
  test('default theme is dark (Midnight Lab first-paint)', async ({ hydratedHome: page }) => {
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass ?? '').toContain('dark');
  });

  test('clicking the toggle flips the html class to light', async ({ hydratedHome: page }) => {
    const toggle = page.getByRole('button', { name: /toggle theme/i });
    await toggle.click();

    // next-themes writes the class in a post-render effect — give it a tick.
    await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 2_000 });
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass ?? '').not.toContain('dark');
  });

  test('the choice survives a page reload', async ({ hydratedHome: page }) => {
    // Switch to light.
    await page.getByRole('button', { name: /toggle theme/i }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Reload and re-hydrate.
    await page.reload();
    await expect(page.getByTestId('chessboard-grid')).toBeVisible();

    // Should still be light.
    await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 2_000 });
  });

  test('flipping back to dark removes the light class', async ({ hydratedHome: page }) => {
    const toggle = page.getByRole('button', { name: /toggle theme/i });
    await toggle.click(); // -> light
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await toggle.click(); // -> dark
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
