import { describe, it, expect } from 'vitest';
import { computeFollowRange } from '../use-follow-current-step';

/**
 * Unit tests for `computeFollowRange` — the pure-function math that
 * drives the analytics charts' "follow the current step" auto-scroll.
 * The function is a pure (input → output) helper; the ChartWrapper
 * effect that uses it is exercised by `chart-wrapper.test.tsx`.
 */
describe('computeFollowRange', () => {
  describe('returns null (no scroll needed)', () => {
    it('when the marker is inside the current window', () => {
      expect(
        computeFollowRange({
          currentStep: 50,
          firstStep: 0,
          lastStep: 100,
          currentStart: 0,
          currentEnd: 100,
        }),
      ).toBeNull();
    });

    it('when the marker is exactly at the right edge (no infinite-loop trigger)', () => {
      // pct === currentEnd must be treated as "in view" so the
      // steady-state at the end of playback doesn't keep firing
      // dispatchAction.
      expect(
        computeFollowRange({
          currentStep: 100,
          firstStep: 0,
          lastStep: 100,
          currentStart: 0,
          currentEnd: 100,
        }),
      ).toBeNull();
    });

    it('when the marker is exactly at the left edge', () => {
      expect(
        computeFollowRange({
          currentStep: 0,
          firstStep: 0,
          lastStep: 100,
          currentStart: 0,
          currentEnd: 100,
        }),
      ).toBeNull();
    });

    it('when the marker is exactly at a custom window right edge', () => {
      expect(
        computeFollowRange({
          currentStep: 70,
          firstStep: 0,
          lastStep: 100,
          currentStart: 30,
          currentEnd: 70,
        }),
      ).toBeNull();
    });

    it('for an empty / single-step run (firstStep === lastStep)', () => {
      expect(
        computeFollowRange({
          currentStep: 0,
          firstStep: 0,
          lastStep: 0,
          currentStart: 0,
          currentEnd: 100,
        }),
      ).toBeNull();
    });

    it('for a degenerate run (firstStep > lastStep)', () => {
      expect(
        computeFollowRange({
          currentStep: 0,
          firstStep: 50,
          lastStep: 10,
          currentStart: 0,
          currentEnd: 100,
        }),
      ).toBeNull();
    });

    it('for a degenerate window (currentEnd === currentStart)', () => {
      expect(
        computeFollowRange({
          currentStep: 50,
          firstStep: 0,
          lastStep: 100,
          currentStart: 50,
          currentEnd: 50,
        }),
      ).toBeNull();
    });

    it('for an inverted window (currentEnd < currentStart)', () => {
      expect(
        computeFollowRange({
          currentStep: 50,
          firstStep: 0,
          lastStep: 100,
          currentStart: 80,
          currentEnd: 20,
        }),
      ).toBeNull();
    });

    it('when currentStep is below firstStep (engine bug guard)', () => {
      expect(
        computeFollowRange({
          currentStep: -5,
          firstStep: 0,
          lastStep: 100,
          currentStart: 0,
          currentEnd: 100,
        }),
      ).toBeNull();
    });

    it('when currentStep is above lastStep (engine bug guard)', () => {
      expect(
        computeFollowRange({
          currentStep: 200,
          firstStep: 0,
          lastStep: 100,
          currentStart: 0,
          currentEnd: 100,
        }),
      ).toBeNull();
    });
  });

  describe('scrolls right (marker past right edge)', () => {
    it('places the marker at 70% of the new window when no clamping is needed', () => {
      // Window 0–60, marker at step 80 of 0–100 (pct=80 > 60).
      // width=60. newEnd = min(100, 80 + 60*0.3) = 98.
      // newStart = max(0, 98 - 60) = 38.
      // (80 - 38) / 60 = 0.7 ✓
      const result = computeFollowRange({
        currentStep: 80,
        firstStep: 0,
        lastStep: 100,
        currentStart: 0,
        currentEnd: 60,
      });
      expect(result).toEqual({ start: 38, end: 98 });
      const markerPctOfNewWindow = ((80 - 38) / (98 - 38)) * 100;
      expect(markerPctOfNewWindow).toBeCloseTo(70, 5);
    });

    it('clamps the new end to 100 when the natural position would exceed the data range', () => {
      // Window 0–80, marker at step 85. width=80.
      // newEnd = min(100, 85 + 80*0.3) = min(100, 109) = 100.
      // newStart = max(0, 100 - 80) = 20. Width preserved.
      const result = computeFollowRange({
        currentStep: 85,
        firstStep: 0,
        lastStep: 100,
        currentStart: 0,
        currentEnd: 80,
      });
      expect(result).toEqual({ start: 20, end: 100 });
    });

    it('preserves window width across the scroll', () => {
      // Window 20–70 (width 50). Marker at step 90.
      // newEnd = min(100, 90 + 50*0.3) = 100. newStart = 50.
      const result = computeFollowRange({
        currentStep: 90,
        firstStep: 0,
        lastStep: 100,
        currentStart: 20,
        currentEnd: 70,
      });
      expect(result).not.toBeNull();
      expect(result!.end - result!.start).toBe(50);
    });

    it('handles a small window near the right edge', () => {
      // Window 0–4, marker at step 5. width=4.
      // newEnd = min(100, 5 + 4*0.3) = 6.2. newStart = 2.2.
      const result = computeFollowRange({
        currentStep: 5,
        firstStep: 0,
        lastStep: 100,
        currentStart: 0,
        currentEnd: 4,
      });
      expect(result).toEqual({ start: 2.2, end: 6.2 });
    });
  });

  describe('scrolls left (marker before left edge)', () => {
    it('places the marker at 30% of the new window when no clamping is needed', () => {
      // Window 30–80 (width 50). Marker at step 20. pct=20 < 30.
      // newStart = max(0, 20 - 50*0.3) = 5.
      // newEnd = min(100, 5 + 50) = 55.
      // (20 - 5) / 50 = 0.3 ✓
      const result = computeFollowRange({
        currentStep: 20,
        firstStep: 0,
        lastStep: 100,
        currentStart: 30,
        currentEnd: 80,
      });
      expect(result).toEqual({ start: 5, end: 55 });
      const markerPctOfNewWindow = ((20 - 5) / (55 - 5)) * 100;
      expect(markerPctOfNewWindow).toBeCloseTo(30, 5);
    });

    it('clamps the new start to 0 when the natural position would go below 0', () => {
      // Window 20–100 (width 80). Marker at step 10. pct=10 < 20.
      // newStart = max(0, 10 - 80*0.3) = max(0, -14) = 0.
      // newEnd = min(100, 0 + 80) = 80.
      const result = computeFollowRange({
        currentStep: 10,
        firstStep: 0,
        lastStep: 100,
        currentStart: 20,
        currentEnd: 100,
      });
      expect(result).toEqual({ start: 0, end: 80 });
    });

    it('preserves window width across the scroll', () => {
      // Window 50–100 (width 50). Marker at step 20.
      // newStart = max(0, 20 - 50*0.3) = 5. newEnd = 55.
      const result = computeFollowRange({
        currentStep: 20,
        firstStep: 0,
        lastStep: 100,
        currentStart: 50,
        currentEnd: 100,
      });
      expect(result).not.toBeNull();
      expect(result!.end - result!.start).toBe(50);
    });

    it('handles a small window near the left edge', () => {
      // Window 1–5 (width 4). Marker at step 0. pct=0 < 1.
      // newStart = max(0, 0 - 4*0.3) = 0. newEnd = 4.
      const result = computeFollowRange({
        currentStep: 0,
        firstStep: 0,
        lastStep: 100,
        currentStart: 1,
        currentEnd: 5,
      });
      expect(result).toEqual({ start: 0, end: 4 });
    });
  });

  describe('non-zero firstStep (engine offset)', () => {
    it('computes percent correctly when firstStep is non-zero', () => {
      // Hypothetical engine starting at step 100. step 150, range
      // 100–200 → pct=50. Window 0–100, marker in view.
      expect(
        computeFollowRange({
          currentStep: 150,
          firstStep: 100,
          lastStep: 200,
          currentStart: 0,
          currentEnd: 100,
        }),
      ).toBeNull();
    });

    it('scrolls right when marker is past the right edge of a non-zero-origin range', () => {
      // Range 100–200, window 0–30 (percent). Step 180 → pct=80.
      // width=30. newEnd = min(100, 80 + 30*0.3) = 89.
      // newStart = max(0, 89 - 30) = 59.
      const result = computeFollowRange({
        currentStep: 180,
        firstStep: 100,
        lastStep: 200,
        currentStart: 0,
        currentEnd: 30,
      });
      expect(result).toEqual({ start: 59, end: 89 });
    });
  });

  describe('cumulative scroll behavior (simulating playback)', () => {
    it('repeatedly scrolling right tracks a moving marker and preserves window width', () => {
      // Simulate: start with window 0–50, marker advances 60, 70, 80, 90, 95.
      // The function should keep the marker visible (either by returning
      // a new window when the marker crosses the right edge, or null
      // when the marker is still in the current window) and never
      // return a window that loses the marker.
      let window = { start: 0, end: 50 };
      const width = 50;
      const steps = [60, 70, 80, 90, 95];

      for (const step of steps) {
        const result = computeFollowRange({
          currentStep: step,
          firstStep: 0,
          lastStep: 100,
          currentStart: window.start,
          currentEnd: window.end,
        });
        if (result !== null) {
          // Width preserved across the scroll.
          expect(result.end - result.start).toBe(width);
          // Marker is in view.
          expect(step).toBeGreaterThanOrEqual(result.start);
          expect(step).toBeLessThanOrEqual(result.end);
          window = result;
        } else {
          // Marker is already in view — verify that's actually the case
          // (i.e. the function isn't returning null incorrectly).
          expect(step).toBeGreaterThanOrEqual(window.start);
          expect(step).toBeLessThanOrEqual(window.end);
        }
      }
    });

    it('a steady-state marker at the very end does not oscillate', () => {
      // Critical infinite-loop guard: if the function returned a new
      // range when pct === end, every render of an "ended" simulation
      // would re-dispatch and re-render forever.
      const inputs = {
        currentStep: 100,
        firstStep: 0,
        lastStep: 100,
        currentStart: 0,
        currentEnd: 100,
      };
      expect(computeFollowRange(inputs)).toBeNull();
      expect(computeFollowRange(inputs)).toBeNull();
      expect(computeFollowRange(inputs)).toBeNull();
    });
  });
});
