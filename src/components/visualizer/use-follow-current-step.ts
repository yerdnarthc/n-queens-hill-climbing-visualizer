/**
 * Pure-function helper for the analytics charts' "follow the current step"
 * auto-scroll. Extracted from the React effect so the math is easy to
 * unit-test without mounting ECharts.
 *
 * ## What this solves
 *
 * When a long simulation plays back, the current-step vertical marker is
 * drawn at `xAxis: currentStep` (in `chart-helpers.ts`). If the user has
 * zoomed the X-axis (or even just plays back a long run at the default
 * 0–100% zoom), the marker can scroll off the visible plot area as
 * playback advances. ECharts does NOT auto-scroll the dataZoom window to
 * keep a mark line in view — the user just sees the marker disappear.
 *
 * This function computes the dataZoom range the chart should be
 * programmatically scrolled to so the marker re-enters the visible
 * window. It only **shifts** the window (preserving the user's chosen
 * window width) — it never resizes or zooms in/out.
 *
 * ## Placement strategy (70% / 30%)
 *
 * When the marker crosses the right edge, we scroll so the marker sits
 * at ~70% of the new window. That keeps ~30% of the visible window
 * showing the steps the user just saw — they can still see the recent
 * trajectory context to the left of the marker.
 *
 * Symmetric for the left edge: marker at ~30%, ~70% context to the
 * right (the steps that are still ahead).
 *
 * These thresholds are not magic. Common alternatives are 80/20 (more
 * aggressive forward bias) or pure edge-alignment (less context, but
 * the marker is always at the leading edge). We picked 70/30 because
 * it reads as "the chart is following you but you can still see what
 * just happened" — same as a video-player's timeline scrubber.
 *
 * ## Inputs are percentages
 *
 * `start` and `end` are ECharts' dataZoom percent values (0–100), not
 * step indices. ECharts' `dispatchAction({ type: 'dataZoom', start, end })`
 * accepts the percent form and applies it directly to the slider entry,
 * which is what we want.
 */

export interface FollowStepInput {
  /**
   * The current playback step (the X-axis value of the marker we're
   * trying to keep on screen). Typically `snapshots[currentStep].step`,
   * which for the analytics charts equals `currentStep` itself because
   * the snapshots array is 1:1 with step numbers.
   */
  currentStep: number;
  /**
   * The lowest step value on the X-axis. For the analytics charts this
   * is `snapshots[0].step` (0 in the common case).
   */
  firstStep: number;
  /**
   * The highest step value on the X-axis. For the analytics charts this
   * is `snapshots[snapshots.length - 1].step`, i.e. `result.totalSteps`.
   */
  lastStep: number;
  /**
   * The CURRENT dataZoom window's left edge (percent, 0–100). Read
   * from the live ECharts instance via `chart.getOption().dataZoom[1].start`.
   */
  currentStart: number;
  /**
   * The CURRENT dataZoom window's right edge (percent, 0–100). Read
   * from the live ECharts instance via `chart.getOption().dataZoom[1].end`.
   */
  currentEnd: number;
}

export interface FollowStepResult {
  /**
   * The new left edge for the dataZoom window (percent, 0–100). Pass
   * directly into `dispatchAction({ type: 'dataZoom', start, end })`.
   */
  start: number;
  /** The new right edge for the dataZoom window (percent, 0–100). */
  end: number;
}

/**
 * Marker placement constants. Exposed as named constants (not magic
 * numbers inline) so tests can reference them and future tweaks
 * (e.g. 80/20 placement) are a one-line change.
 */

/** Where the marker sits in the new window when scrolling right (0–1). */
const TRAILING_FRACTION = 0.7;

/** Where the marker sits in the new window when scrolling left (0–1). */
const LEADING_FRACTION = 0.3;

/**
 * Computes the dataZoom range the chart should be scrolled to in order
 * to keep the current-step marker visible.
 *
 * Returns `null` when no scroll is needed. Callers can use that as a
 * short-circuit to skip the `dispatchAction` call entirely — important
 * because `dispatchAction` for `dataZoom` does fire the `datazoom`
 * event, which propagates up to the parent and can cause a render
 * storm if we re-dispatch on every frame.
 *
 * ## Edge cases
 *
 * - **Empty / single-step run** (`firstStep >= lastStep`): returns
 *   `null`. There's no meaningful "scroll" possible with zero or one
 *   data point on a category axis.
 *
 * - **Current step is outside the data range** (`currentStep <
 *   firstStep` or `currentStep > lastStep`): returns `null`. The engine
 *   is responsible for clamping `currentStep`; if it leaks an
 *   out-of-range value, scrolling won't help and we shouldn't fight it.
 *
 * - **Window is degenerate** (`currentEnd <= currentStart`): returns
 *   `null`. This can happen transiently during a slider drag, and
 *   trying to compute a window of width 0 produces NaN.
 *
 * - **Marker is at the exact edge** (`pct === currentEnd`): returns
 *   `null`. Strict `<` / `>` comparison means an exactly-at-edge marker
 *   is considered "still in view" and doesn't trigger a scroll. This
 *   matters at the very end of playback when the marker stops moving
 *   — we don't want a perpetual scroll-storm on the last step.
 */
export function computeFollowRange(input: FollowStepInput): FollowStepResult | null {
  const { currentStep, firstStep, lastStep, currentStart, currentEnd } = input;

  // Defensive: a non-positive range or a degenerate run has no useful
  // window to compute. Bail out cleanly rather than producing NaN.
  if (lastStep <= firstStep) return null;
  if (currentEnd <= currentStart) return null;
  if (currentStep < firstStep || currentStep > lastStep) return null;

  // Convert the current step to a percent of the full data range.
  // The dataZoom slider is on a 0–100 percent scale, and our xAxis
  // is a category axis where step N maps to index N (snapshots are
  // 1:1 with step numbers for both analytics charts).
  const range = lastStep - firstStep;
  const pct = ((currentStep - firstStep) / range) * 100;

  // Window width (in percent) is preserved across the scroll. This is
  // the key design choice: the user's chosen zoom level stays the
  // same, only the position shifts. See the file-level JSDoc for the
  // tradeoff vs. window-growth.
  const width = currentEnd - currentStart;

  // Decide direction. Using strict inequalities means an exactly-
  // at-edge marker is treated as "in view" — see the JSDoc.
  if (pct > currentEnd) {
    // Scrolling right: marker is past the right edge. Place the
    // marker at TRAILING_FRACTION (default 70%) of the new window so
    // ~30% of the window still shows the recent context to the left.
    const newEnd = Math.min(100, pct + width * (1 - TRAILING_FRACTION));
    const newStart = Math.max(0, newEnd - width);
    return { start: newStart, end: newEnd };
  }

  if (pct < currentStart) {
    // Scrolling left: marker is before the left edge. Place the marker
    // at LEADING_FRACTION (default 30%) of the new window so ~70% of
    // the window shows the steps still ahead.
    const newStart = Math.max(0, pct - width * LEADING_FRACTION);
    const newEnd = Math.min(100, newStart + width);
    return { start: newStart, end: newEnd };
  }

  // Marker is within the current window — no scroll needed.
  return null;
}
