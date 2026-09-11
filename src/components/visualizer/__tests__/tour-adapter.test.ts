import { describe, it, expect } from 'vitest';
import { flattenTourSteps } from '../tour-adapter';
import { ONBOARDING_TOUR_STEPS } from '../tour-steps';

/** Resolver that pretends every selector matches (full-content census). */
const matchAll = (selectors: string[]) => selectors[0] ?? null;

describe('flattenTourSteps', () => {
  it('flattens the full content to one beat per substep (35 on the steepest path)', () => {
    const beats = flattenTourSteps(ONBOARDING_TOUR_STEPS, {
      dropSubstepIds: new Set(['cooling']),
      resolve: matchAll,
    });
    // 10 chessboard + 5 timeline + 9 config + 4 analytics + 4 stats + 1 csv + 2 share.
    expect(beats).toHaveLength(35);
  });

  it('carries grouping metadata for the "Step X of 7" badge (never the flat index)', () => {
    const beats = flattenTourSteps(ONBOARDING_TOUR_STEPS, {
      dropSubstepIds: new Set(['cooling']),
      resolve: matchAll,
    });
    // First chessboard beat: top 1 of 7, sub 1 of 10.
    expect(beats[0]).toMatchObject({
      groupId: 'chessboard',
      topIndex: 0,
      topTotal: 7,
      subIndex: 0,
      subTotal: 10,
    });
    // First timeline beat: top 2 of 7.
    const timeline = beats.find((b) => b.groupId === 'timeline');
    expect(timeline).toMatchObject({ topIndex: 1, topTotal: 7, subIndex: 0 });
    // Sendoff: top 7 of 7, last flat beat.
    const last = beats[beats.length - 1];
    expect(last).toMatchObject({ groupId: 'share', topIndex: 6, topTotal: 7 });
    expect(last?.title).toBe('Happy hill-climbing!');
  });

  it('falls back to the step title when a substep has none', () => {
    const beats = flattenTourSteps(ONBOARDING_TOUR_STEPS, { resolve: matchAll });
    const intro = beats.find((b) => b.key === 'chessboard:intro');
    expect(intro?.title).toBe('The chessboard');
  });

  it('resolves selector chains first-match-wins and drops unresolvable beats', () => {
    const beats = flattenTourSteps(ONBOARDING_TOUR_STEPS, {
      // Only the stats-header fallback "exists".
      resolve: (selectors) =>
        selectors.includes('[data-testid="stats-header"]') ? '[data-testid="stats-header"]' : null,
    });
    // Every surviving beat resolved to the one "existing" selector…
    expect(beats.length).toBeGreaterThan(0);
    for (const beat of beats) {
      expect(beat.selector).toBe('[data-testid="stats-header"]');
    }
    // …and whole groups with no resolvable beat vanish (no chessboard group).
    expect(beats.some((b) => b.groupId === 'chessboard')).toBe(false);
  });

  it('drops the SA-only cooling beat on the forced path', () => {
    const beats = flattenTourSteps(ONBOARDING_TOUR_STEPS, {
      dropSubstepIds: new Set(['cooling']),
      resolve: matchAll,
    });
    expect(beats.some((b) => b.key === 'config:cooling')).toBe(false);
    expect(beats.filter((b) => b.groupId === 'config')).toHaveLength(9);
  });

  it('keeps stable unique keys across the walk', () => {
    const beats = flattenTourSteps(ONBOARDING_TOUR_STEPS, {
      dropSubstepIds: new Set(['cooling']),
      resolve: matchAll,
    });
    const keys = beats.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
