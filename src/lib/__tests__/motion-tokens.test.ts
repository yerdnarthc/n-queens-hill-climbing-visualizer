import { describe, it, expect } from 'vitest';
import { easeForTravel } from '../motion-tokens';

/**
 * Contract test for the distance-scaled settle easing:
 *
 *  - short hops (≤ 1 square) keep the full 20% overshoot
 *  - long flights (≥ 6 squares) settle cleanly (4th bezier value = 1.0)
 *  - the overshoot fades monotonically in between — no sudden jumps
 *  - garbage input degrades to the short-hop curve, never NaN
 */

describe('easeForTravel', () => {
  it('returns the full overshoot curve for short hops', () => {
    expect(easeForTravel(0)).toEqual([0.2, 0.9, 0.3, 1.2]);
    expect(easeForTravel(1)).toEqual([0.2, 0.9, 0.3, 1.2]);
  });

  it('returns a clean settle (no overshoot) for long flights', () => {
    expect(easeForTravel(6)).toEqual([0.2, 0.9, 0.3, 1.0]);
    expect(easeForTravel(15)).toEqual([0.2, 0.9, 0.3, 1.0]);
  });

  it('fades the overshoot monotonically between 1 and 6 squares', () => {
    const samples = [0, 0.5, 1, 2, 3, 4, 5, 6, 8, 12].map((d) => easeForTravel(d)[3]);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThanOrEqual(samples[i - 1]);
    }
    // Mid-fade is strictly between the extremes.
    expect(easeForTravel(3.5)[3]).toBeGreaterThan(1.0);
    expect(easeForTravel(3.5)[3]).toBeLessThan(1.2);
  });

  it('degrades garbage input to the short-hop curve', () => {
    expect(easeForTravel(NaN)).toEqual([0.2, 0.9, 0.3, 1.2]);
    expect(easeForTravel(-3)).toEqual([0.2, 0.9, 0.3, 1.2]);
    expect(easeForTravel(Infinity)).toEqual([0.2, 0.9, 0.3, 1.2]);
  });
});
