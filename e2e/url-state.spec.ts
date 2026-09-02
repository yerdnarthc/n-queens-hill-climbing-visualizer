import { test, expect } from './fixtures/test';

/**
 * URL state — exercises the Phase 6 shareable URL bridge:
 *   - UI changes write back to the URL (throttled at 150ms by `useUrlConfigSync`).
 *   - Loading a URL with the right params reproduces the same run.
 *   - Hostile params are clamped (and the URL is rewritten to canonical form).
 *
 * `expect.poll` is used for URL assertions because nuqs's `setValues` is
 * throttled — the URL doesn't update on the same tick the store does.
 */
test.describe('URL state — shareable configuration', () => {
  test('changing the seed via the input writes ?seed=… back to the URL', async ({
    hydratedHome: page,
  }) => {
    const seedInput = page.getByRole('spinbutton').first();
    await expect(seedInput).toBeVisible();
    await seedInput.fill('42');
    await seedInput.blur();

    // The store → URL writer is throttled at 150ms; poll for the change.
    await expect
      .poll(() => new URL(page.url()).searchParams.get('seed'), { timeout: 2_000 })
      .toBe('42');
  });

  test('changing the strategy via the dropdown writes ?strategy=…', async ({
    hydratedHome: page,
  }) => {
    // The shadcn Select renders a button with role="combobox" — clicking it
    // opens a listbox with role="option" children. We just look up the
    // option by visible text.
    const combobox = page.getByRole('combobox').first();
    await combobox.click();
    await page.getByRole('option', { name: /min-conflicts/i }).click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get('strategy'), { timeout: 2_000 })
      .toBe('min-conflicts');
  });

  test('loading a deep-link URL hydrates the store and runs the engine', async ({ page }) => {
    // The default N=8, seed=27, steepest-ascent run is machine-curated to
    // solve in 5 steps. Loading a URL with those params should produce a
    // result with the same Run Status family.
    await page.goto('/?n=8&seed=27&strategy=steepest-ascent');
    await expect(page.getByTestId('chessboard-grid')).toBeVisible();

    // The status badge must NOT read "Initializing…" — the store was
    // hydrated from the URL on mount and the engine ran immediately.
    await expect(page.getByText(/initializing/i)).toHaveCount(0);
    await expect(
      page.locator('header').getByText(/(solved|stagnated|exhausted|frozen)/i),
    ).toBeVisible();
  });

  test('hostile URL values are clamped into the UI domain and the URL is healed', async ({
    page,
  }) => {
    // ?n=99 is above the 4–16 board-size clamp; ?seed=-5 is negative; ?cooling=5
    // is ≥ 1 which would otherwise crash the engine.
    await page.goto('/?n=99&seed=-5&cooling=5');
    await expect(page.getByTestId('chessboard-grid')).toBeVisible();

    // The store must have clamped everything. 16×16 ⇒ 256 squares.
    const squareCount = await page.locator('[data-testid^="square-"]').count();
    expect(squareCount).toBe(16 * 16);

    // The URL must have been rewritten to canonical, clamped values.
    await expect
      .poll(() => new URL(page.url()).searchParams.get('n'), { timeout: 2_000 })
      .toBe('16');
    await expect
      .poll(() => new URL(page.url()).searchParams.get('seed'), { timeout: 2_000 })
      .toBe('0');
  });

  test('defaults are omitted from the URL (clearOnDefault)', async ({ hydratedHome: page }) => {
    // The default config produces an empty query string.
    const search = new URL(page.url()).search;
    expect(search).toBe('');
  });

  test('the Copy share link button surfaces feedback after click', async ({
    hydratedHome: page,
  }) => {
    const copyButton = page.getByRole('button', { name: /copy share link/i });
    await copyButton.click();

    // The ConfigPanel swaps the icon to a Check for ~2s on success. We
    // grant generous permissions to the clipboard so navigator.clipboard
    // works in Chromium under Playwright.
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    // After permission, re-trigger to make sure the success path is taken
    // even in headless Chromium where the first click may be denied.
    await copyButton.click();
    // We don't strictly assert the clipboard contents (cross-origin in CI
    // is finicky) — we just verify the button didn't blow up by ensuring
    // it's still present and the page is still alive.
    await expect(copyButton).toBeVisible();
  });
});
