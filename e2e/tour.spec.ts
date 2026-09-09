import { test, expect } from '@playwright/test';

/**
 * Onboarding-tour specs — the ONLY specs that run with a genuinely fresh
 * localStorage. Every other spec uses the `hydratedHome` fixture, which
 * suppresses the first-visit tour via `addInitScript` (see
 * `e2e/fixtures/test.ts`), so the fixed overlay never intercepts their
 * pointer events.
 *
 * No animation-timing assertions here: step handoffs use a ~180 ms
 * exit→enter (`mode="wait"`), and `expect` polling absorbs that.
 */
test.describe('onboarding tour', () => {
  test('first visit shows the spotlight tour at step 1', async ({ page }) => {
    await page.goto('/visualizer');
    const dialog = page.getByTestId('onboarding-tour');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Step 1 of');
    await expect(dialog).toContainText('Board size');
  });

  test('Next advances; closing persists across reload', async ({ page }) => {
    await page.goto('/visualizer');
    const dialog = page.getByTestId('onboarding-tour');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Next' }).click();
    await expect(dialog).toContainText('Step 2 of');
    await expect(dialog).toContainText('Hill-climbing variant');

    await dialog.getByRole('button', { name: 'Skip tour' }).click();
    await expect(dialog).toBeHidden();

    // localStorage persistence: a reload must NOT re-trigger the tour.
    await page.reload();
    await expect(page.getByTestId('chessboard-grid')).toBeVisible();
    await expect(page.getByTestId('onboarding-tour')).toBeHidden({ timeout: 1000 });
  });

  test('the footer Replay tour button reopens the tour on demand', async ({ page }) => {
    await page.goto('/visualizer');
    const dialog = page.getByTestId('onboarding-tour');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Skip tour' }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'Replay tour' }).click();
    await expect(page.getByTestId('onboarding-tour')).toBeVisible();
    await expect(page.getByTestId('onboarding-tour')).toContainText('Step 1 of');
  });
});
