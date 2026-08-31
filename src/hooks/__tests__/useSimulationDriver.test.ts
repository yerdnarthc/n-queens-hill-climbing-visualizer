import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSimulationDriver } from '../useSimulationDriver';
import { createSimulationStore } from '../../store/simulation-store';

/**
 * Timer semantics (fixtures are machine-harvested — see simulation-store tests):
 *   default speed 2 sps → one step per 500 ms; speed 10 → one per 100 ms.
 *   seed 27 run: 5 steps; seed 25 run: 2 steps; N=4 seed 16: 0 steps.
 */
describe('useSimulationDriver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mount = () => {
    const store = createSimulationStore();
    const hook = renderHook(() => useSimulationDriver(store));
    return { store, ...hook };
  };

  /** Advance fake time and flush the resulting React updates. */
  const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  it('bootstraps the initial run on mount (paused, cursor 0)', () => {
    const { store } = mount();
    const s = store.getState();
    expect(s.result).not.toBeNull();
    expect(s.result!.totalSteps).toBe(5);
    expect(s.isPlaying).toBe(false);
    expect(s.currentStep).toBe(0);
  });

  it('preserves an existing run — mounting never clobbers results', () => {
    const store = createSimulationStore();
    store.getState().run();
    const before = store.getState().result;
    renderHook(() => useSimulationDriver(store));
    expect(store.getState().result).toBe(before);
  });

  it('does not step while paused, however much time passes', () => {
    const { store } = mount();
    tick(10_000);
    expect(store.getState().currentStep).toBe(0);
  });

  it('steps once per interval at the default speed (2 sps → 500 ms)', () => {
    const { store } = mount();
    act(() => store.getState().play());
    tick(500);
    expect(store.getState().currentStep).toBe(1);
    tick(500);
    expect(store.getState().currentStep).toBe(2);
    tick(250); // half an interval — must NOT tick
    expect(store.getState().currentStep).toBe(2);
  });

  it('plays through the run and auto-pauses at the end', () => {
    const { store } = mount();
    act(() => store.getState().play());
    tick(3000); // 5 steps at 500 ms + the finishing tick
    const s = store.getState();
    expect(s.currentStep).toBe(5);
    expect(s.isPlaying).toBe(false);
  });

  it('stops stepping after pause()', () => {
    const { store } = mount();
    act(() => store.getState().play());
    tick(500);
    act(() => store.getState().pause());
    tick(5000);
    expect(store.getState().currentStep).toBe(1);
  });

  it('applies speed changes to the live interval (10 sps → 100 ms)', () => {
    const { store } = mount();
    act(() => {
      store.getState().setSpeed(10);
      store.getState().play();
    });
    tick(100);
    expect(store.getState().currentStep).toBe(1);
    tick(300); // three fast ticks
    expect(store.getState().currentStep).toBe(4);
  });

  it('clears the interval on unmount — no ticking afterwards', () => {
    const { store, unmount } = mount();
    act(() => store.getState().play());
    tick(500);
    unmount();
    tick(5000); // would blow past the end if the interval survived
    const s = store.getState();
    expect(s.currentStep).toBe(1); // frozen where unmount left it
    expect(s.isPlaying).toBe(true); // store is the source of truth, untouched
  });

  it('drives an isolated store, not the singleton (seed 25: 2-step run)', () => {
    const store = createSimulationStore();
    store.getState().setConfig({ seed: 25 });
    renderHook(() => useSimulationDriver(store));
    act(() => store.getState().play());
    tick(1500); // 2 steps + the finishing tick
    const s = store.getState();
    expect(s.currentStep).toBe(2);
    expect(s.isPlaying).toBe(false);
  });

  it('keeps playing across a config-change rerun, from the new step 0', () => {
    const { store } = mount();
    act(() => store.getState().play());
    tick(1000); // → step 2 of the seed-27 run
    expect(store.getState().currentStep).toBe(2);
    act(() => store.getState().setConfig({ seed: 25 })); // auto-rerun
    const mid = store.getState();
    expect(mid.isPlaying).toBe(true); // rerun preserved playback
    expect(mid.currentStep).toBe(0); // restarted at the top
    tick(1500); // 3 ticks: 2 reach the end of the seed-25 run, the 3rd auto-pauses
    const s = store.getState();
    expect(s.currentStep).toBe(2);
    expect(s.isPlaying).toBe(false);
  });

  it('auto-pauses on the first tick of a zero-step run', () => {
    const store = createSimulationStore();
    store.getState().setConfig({ boardSize: 4, seed: 16 }); // 0 steps
    renderHook(() => useSimulationDriver(store));
    act(() => store.getState().play());
    tick(500);
    const s = store.getState();
    expect(s.currentStep).toBe(0);
    expect(s.isPlaying).toBe(false);
  });
});
