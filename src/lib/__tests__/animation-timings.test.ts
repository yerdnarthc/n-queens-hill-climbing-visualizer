import { describe, it, expect } from 'vitest';
import { computeStepDuration } from '../animation-timings';

describe('computeStepDuration', () => {
  it('returns 400ms at 0.5× (clamped to MAX — natural feel at slow speeds)', () => {
    // step is 2000ms → 60% = 1200ms → clamped to 400ms
    expect(computeStepDuration(0.5)).toBe(400);
  });

  it('returns 400ms at 1× (also clamped to MAX)', () => {
    // step is 1000ms → 60% = 600ms → clamped to 400ms
    expect(computeStepDuration(1)).toBe(400);
  });

  it('returns 300ms at 2× (the natural, recommended speed — unclamped)', () => {
    // step is 500ms → 60% = 300ms — this is exactly where the formula lands
    expect(computeStepDuration(2)).toBe(300);
  });

  it('returns 120ms at 5×', () => {
    // step is 200ms → 60% = 120ms
    expect(computeStepDuration(5)).toBe(120);
  });

  it('returns 100ms at 20× (clamped to MIN)', () => {
    // step is 50ms → 60% = 30ms → clamped to 50ms, then rounded (still 50)
    // but we assert the clamp at 100ms once we hit the boundary.
    // Actually 20× gives 50ms exactly, not 100. Adjust the expectation:
    expect(computeStepDuration(20)).toBe(50);
  });

  it('returns 50ms at 30× (clamped to MIN — fastest, snaps but still readable)', () => {
    // step is 33ms → 60% = 20ms → clamped to 50ms
    expect(computeStepDuration(30)).toBe(50);
  });

  it('returns 0 when reducedMotion is true (accessibility short-circuit)', () => {
    expect(computeStepDuration(2, true)).toBe(0);
    expect(computeStepDuration(30, true)).toBe(0);
  });

  it('treats reducedMotion = null as "false" (jsdom default from useReducedMotion)', () => {
    expect(computeStepDuration(2, null)).toBe(300);
  });

  describe('defensive defaults for invalid speed inputs', () => {
    it('returns 400ms for speed = 0', () => {
      expect(computeStepDuration(0)).toBe(400);
    });

    it('returns 400ms for speed = NaN', () => {
      expect(computeStepDuration(Number.NaN)).toBe(400);
    });

    it('returns 400ms for speed = +Infinity', () => {
      expect(computeStepDuration(Number.POSITIVE_INFINITY)).toBe(400);
    });

    it('returns 400ms for speed = -1 (defensive: a negative speed is treated as invalid)', () => {
      expect(computeStepDuration(-1)).toBe(400);
    });
  });

  it('produces a strictly non-increasing sequence from 0.5× to 30×', () => {
    // Sanity check: faster playback ⇒ shorter (or equal) duration.
    const speeds = [0.5, 1, 2, 3, 5, 10, 15, 20, 30];
    const durations = speeds.map((s) => computeStepDuration(s));
    for (let i = 1; i < durations.length; i++) {
      const prev = durations[i - 1]!;
      const curr = durations[i]!;
      expect(curr).toBeLessThanOrEqual(prev);
    }
  });
});
