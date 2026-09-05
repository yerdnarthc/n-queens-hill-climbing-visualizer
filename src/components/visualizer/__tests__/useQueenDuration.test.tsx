import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQueenDurationMs } from '../useQueenDuration';
import { simulationStore } from '@/store';
import { QUEEN_STEPPER_MS } from '@/lib/motion-tokens';

/**
 * Contract test for the playback-gated duration rule (must-implement):
 *
 *  - PLAYING  → speed-aware `computeStepDuration(speed)` (50…400 ms)
 *  - PAUSED (stepping / scrubbing / arrow keys) → fixed `QUEEN_STEPPER_MS`
 *    no matter how high the configured speed is (30× stepping must NOT
 *    blink at 50 ms)
 *  - reduced motion is covered by `computeStepDuration` returning 0 and by
 *    callers skipping pulses; jsdom reports no reduced-motion preference
 *    (matchMedia mock ⇒ matches: false), so the hook takes the
 *    non-reduced branches here.
 */

describe('useQueenDurationMs', () => {
  beforeEach(() => {
    act(() => {
      simulationStore.getState().pause();
      simulationStore.getState().setSpeed(2);
    });
  });

  afterEach(() => {
    act(() => {
      simulationStore.getState().pause();
    });
    vi.unstubAllGlobals();
  });

  it('returns the fixed stepper duration while paused, regardless of speed', () => {
    // Even at the maximum 30×, single-stepping must stay readable —
    // the speed-aware formula would give 50 ms (a blink).
    act(() => {
      simulationStore.getState().setSpeed(30);
    });
    const { result } = renderHook(() => useQueenDurationMs(30));
    expect(simulationStore.getState().isPlaying).toBe(false);
    expect(result.current).toBe(QUEEN_STEPPER_MS);
  });

  it('returns the speed-aware duration while playing', () => {
    act(() => {
      simulationStore.getState().setSpeed(2);
      simulationStore.getState().play();
    });
    const { result } = renderHook(() => useQueenDurationMs(2));
    // computeStepDuration(2) = 60% of the 500 ms step interval = 300 ms.
    expect(result.current).toBe(300);
  });

  it('clamps to the speed-aware minimum while playing at 30x', () => {
    act(() => {
      simulationStore.getState().setSpeed(30);
      simulationStore.getState().play();
    });
    const { result } = renderHook(() => useQueenDurationMs(30));
    expect(result.current).toBe(50);
  });

  it('reacts when playback toggles from playing to paused mid-hook', () => {
    act(() => {
      simulationStore.getState().setSpeed(5);
      simulationStore.getState().play();
    });
    const { result, rerender } = renderHook(() => useQueenDurationMs(5));
    // 5× → 60% of 200 ms = 120 ms while playing…
    expect(result.current).toBe(120);

    act(() => {
      simulationStore.getState().pause();
    });
    rerender();
    // …but the fixed stepper duration the moment the user pauses to step.
    expect(result.current).toBe(QUEEN_STEPPER_MS);
  });
});
