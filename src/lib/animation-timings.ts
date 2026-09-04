/**
 * Animation timings — pure helpers for the visualizer's playback-driven motion.
 *
 * Lives outside any React/Framer-Motion import surface so it can be unit-tested
 * in isolation (the engine purity rule, generalized — see D-002 for the engine's
 * equivalent invariant).
 */

/**
 * Returns the move-transition duration in **milliseconds** for a queen flying
 * from one square to the next, given the current playback speed (steps/sec).
 *
 * The function targets ~60% of the per-step interval so the queen visibly
 * settles before the next step fires, with absolute clamps to keep the
 * animation readable at the extremes:
 *
 *   - 0.5× → step is 2000ms → 60% = 1200ms → clamped to MAX 400ms
 *   -  1× → step is 1000ms → 60% =  600ms → clamped to MAX 400ms
 *   -  2× → step is  500ms → 60% =  300ms (the natural, recommended speed)
 *   -  5× → step is  200ms → 60% =  120ms
 *   - 20× → step is   50ms → 60% =   30ms → clamped to MIN 50ms
 *   - 30× → step is   33ms → 60% =   20ms → clamped to MIN 50ms
 *
 * Returns **0** when `reducedMotion` is true so callers can collapse the
 * transition to instant (consistent with the existing `useReducedMotion`
 * branch in `QueenPiece` — D-032). Pass `null` to treat "unknown" the same
 * as "false" (jsdom returns `null` from `useReducedMotion` by default).
 */
export function computeStepDuration(speed: number, reducedMotion: boolean | null = false): number {
  if (reducedMotion) return 0;

  // Defensive defaults for non-finite or non-positive inputs — the playback
  // speed is always a positive number in practice, but treat NaN/Infinity/0
  // as "use the slowest natural feel" rather than a Math-error explosion.
  if (!Number.isFinite(speed) || speed <= 0) return 400;

  const ideal = (1000 / speed) * 0.6;
  return Math.round(Math.min(400, Math.max(50, ideal)));
}
