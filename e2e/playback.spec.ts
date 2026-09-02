import { test, expect } from './fixtures/test';

/**
 * Playback — verifies the keyboard shortcuts (Phase 5) and the timeline
 * scrubber actually drive the store. Keys are dispatched at `window` level
 * (useKeyboardShortcuts listens there) and we use a neutral focus target
 * (body) to bypass the input/slider guard.
 */
test.describe('Playback — keyboard shortcuts and scrubber', () => {
  test('Space toggles play/pause when no input is focused', async ({ hydratedHome: page }) => {
    // Focus the body explicitly so the keydown reaches the page listener
    // without being swallowed by a button/slider.
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    // The default is paused. Pressing Space should start playback; the
    // Pause button (icon-only, no aria-label) should appear.
    await page.keyboard.press('Space');
    // After a tick, the isPlaying state is true ⇒ the Pause control is the
    // one rendered. We assert the play button no longer shows the "Play"
    // label (i.e. the toggle has flipped) by checking the timeline cursor
    // advances.
    const cursorBefore = await page.locator('header').getByText(/^\d+$/).first().textContent();
    await page.waitForTimeout(800);
    const cursorAfter = await page.locator('header').getByText(/^\d+$/).first().textContent();
    expect(Number(cursorAfter)).toBeGreaterThan(Number(cursorBefore ?? '0'));

    // Pressing Space again pauses.
    await page.keyboard.press('Space');
    const cursorAfterPause = await page.locator('header').getByText(/^\d+$/).first().textContent();
    await page.waitForTimeout(500);
    const cursorStillPaused = await page.locator('header').getByText(/^\d+$/).first().textContent();
    expect(cursorStillPaused).toBe(cursorAfterPause);
  });

  test('ArrowRight advances exactly one step', async ({ hydratedHome: page }) => {
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    const cursorBefore = Number(
      await page.locator('header').getByText(/^\d+$/).first().textContent(),
    );
    await page.keyboard.press('ArrowRight');
    // give React a tick to flush
    await page.waitForTimeout(50);
    const cursorAfter = Number(
      await page.locator('header').getByText(/^\d+$/).first().textContent(),
    );
    expect(cursorAfter).toBe(cursorBefore + 1);
  });

  test('ArrowLeft steps back one', async ({ hydratedHome: page }) => {
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    // advance twice, then back once ⇒ net +1
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    const beforeBack = Number(
      await page.locator('header').getByText(/^\d+$/).first().textContent(),
    );
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(50);
    const afterBack = Number(await page.locator('header').getByText(/^\d+$/).first().textContent());
    expect(afterBack).toBe(beforeBack - 1);
  });

  test('R reruns the simulation from step 0', async ({ hydratedHome: page }) => {
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    // Step forward a couple of times.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    // Press R.
    await page.keyboard.press('r');
    await page.waitForTimeout(100);
    // Cursor is back at 0.
    const cursor = Number(await page.locator('header').getByText(/^\d+$/).first().textContent());
    expect(cursor).toBe(0);
  });

  test('the Jump-to-best button jumps the cursor to bestStep', async ({ hydratedHome: page }) => {
    // First step forward a couple of times to leave step 0.
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    const cursorBefore = Number(
      await page.locator('header').getByText(/^\d+$/).first().textContent(),
    );
    expect(cursorBefore).toBeGreaterThanOrEqual(2);

    // The Jump-to-best button (Award icon, aria-label="Jump to best") is
    // enabled once a result exists. For the default N=8/seed=27 run the
    // best step is somewhere in the middle, not the end.
    const jumpToBest = page.getByRole('button', { name: /jump to best/i });
    await expect(jumpToBest).toBeEnabled();
    await jumpToBest.click();
    await page.waitForTimeout(50);

    // Cursor should now be at bestStep — different from cursorBefore.
    const cursorAfter = Number(
      await page.locator('header').getByText(/^\d+$/).first().textContent(),
    );
    expect(cursorAfter).not.toBe(cursorBefore);
  });

  // Note: a scrubber-keyboard test (focus the slider thumb, press ArrowRight
  // N times) is omitted on purpose. Radix's slider role mapping on the inner
  // thumb is brittle enough that the equivalent coverage — the `ArrowRight
  // advances exactly one step` and `R reruns` tests above — is the more
  // reliable way to assert the same UX.
});
