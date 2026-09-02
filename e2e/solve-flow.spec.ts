import { test, expect } from './fixtures/test';

/**
 * Solve-flow — exercises the "press Play and watch hill climbing find a
 * solution" headline behaviour. The default config (N=8, seed=27,
 * steepest-ascent) solves in 5 steps at 2 steps/sec ⇒ roughly 2.5s of
 * playback. We allow generous timeouts because the driver is real time.
 */
test.describe('Solve flow — playback reaches 0 conflicts', () => {
  test('clicking Play drives the default run to a solved state', async ({ hydratedHome: page }) => {
    // Boost the speed so the test isn't bottlenecked by the default 2 steps/s.
    // 10× is the highest preset and still well within the driver's
    // setInterval budget on CI runners.
    await page.getByRole('button', { name: '10×' }).click();

    // Start playback.
    await page.getByRole('button', { name: /play/i }).first().click();

    // Wait for the run to finish. The Run Status badge flips to "Solved"
    // when conflicts reach 0; the attacking-pairs counter goes to 0. Allow
    // a generous timeout because the driver is real-time and CI can lag.
    await expect(page.getByText(/solved \(global opt\)/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('header').getByText('0', { exact: true }).first()).toBeVisible();

    // At the end of the run the driver auto-pauses (D-019): the Play button
    // is showing the Play icon again, not Pause.
    await expect(page.getByRole('button', { name: /play/i }).first()).toBeVisible();
  });

  test('the board border glows emerald once the puzzle is solved', async ({
    hydratedHome: page,
  }) => {
    await page.getByRole('button', { name: '20×' }).click();
    await page.getByRole('button', { name: /play/i }).first().click();

    // The outer chessboard container switches to an emerald border + ring
    // when conflicts = 0. We check for the inline class signature on the
    // parent of the grid (the .relative aspect-square wrapper).
    const solvedWrapper = page.locator('.border-emerald-500\\/80');
    await expect(solvedWrapper).toBeVisible({ timeout: 15_000 });
  });

  test('Best step indicator appears once a simulation has produced a result', async ({
    hydratedHome: page,
  }) => {
    // The default run has already produced a result by the time the page
    // hydrates (no need to play). Scrub to the end to confirm the best-step
    // legend line shows up.
    const jumpToEnd = page.getByRole('button', { name: /jump to end|end/i }).first();
    if (await jumpToEnd.isVisible()) {
      await jumpToEnd.click();
    }
    // Legend line includes "Best (step N)" once a result exists.
    await expect(page.getByText(/best \(step \d+\)/i)).toBeVisible({ timeout: 5_000 });
  });
});
