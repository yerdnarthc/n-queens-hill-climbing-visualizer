import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { useUrlConfigSync } from '../useUrlConfigSync';
import { DEFAULT_CONFIG, createSimulationStore } from '../../store/simulation-store';
import type { SimulationState } from '../../store/simulation-store';
import type { StoreApi } from 'zustand/vanilla';
import {
  clearVisualizerState,
  loadVisualizerState,
  saveVisualizerState,
} from '../../lib/config-persistence';

type Store = StoreApi<SimulationState>;

function Harness({ store }: { store: Store }) {
  useUrlConfigSync(store);
  return null;
}

describe('useUrlConfigSync', () => {
  // The bridge now reads localStorage on mount — every test starts with
  // a clean slate so stored state never leaks between cases.
  beforeEach(() => {
    clearVisualizerState();
  });

  it('hydrates the store from URL params on mount (and runs the engine)', () => {
    const store = createSimulationStore();
    render(<Harness store={store} />, {
      wrapper: withNuqsTestingAdapter({
        searchParams: '?n=12&seed=99&strategy=min-conflicts',
      }),
    });
    const s = store.getState();
    expect(s.config.boardSize).toBe(12);
    expect(s.config.seed).toBe(99);
    expect(s.config.strategy).toBe('min-conflicts');
    expect(s.result).not.toBeNull(); // hydrated config already executed
  });

  it('falls back to the default config when the URL has no params', () => {
    const store = createSimulationStore();
    render(<Harness store={store} />, {
      wrapper: withNuqsTestingAdapter({ searchParams: '' }),
    });
    expect(store.getState().config).toEqual(DEFAULT_CONFIG);
  });

  it('clamps hostile URL values instead of throwing', () => {
    const store = createSimulationStore();
    render(<Harness store={store} />, {
      wrapper: withNuqsTestingAdapter({ searchParams: '?n=99&seed=-5&strategy=bogus&cooling=5' }),
    });
    const s = store.getState();
    expect(s.config.boardSize).toBe(16);
    expect(s.config.seed).toBe(0);
    expect(s.config.strategy).toBe('steepest-ascent');
    expect(s.config.saCoolingRate).toBe(0.999); // engine would throw on ≥ 1
    expect(s.result).not.toBeNull();
  });

  it('writes store config changes back to the URL (history: replace)', async () => {
    const onUrlUpdate = vi.fn();
    const store = createSimulationStore();
    render(<Harness store={store} />, {
      wrapper: withNuqsTestingAdapter({ searchParams: '', onUrlUpdate, hasMemory: true }),
    });
    await act(async () => {
      store.getState().setConfig({ seed: 42, boardSize: 12 });
    });
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const params = onUrlUpdate.mock.calls.at(-1)![0].searchParams as URLSearchParams;
    expect(params.get('seed')).toBe('42');
    expect(params.get('n')).toBe('12');
  });

  it('omits defaults from the URL (clearOnDefault)', async () => {
    const onUrlUpdate = vi.fn();
    const store = createSimulationStore();
    render(<Harness store={store} />, {
      wrapper: withNuqsTestingAdapter({ searchParams: '?seed=42', onUrlUpdate, hasMemory: true }),
    });
    // Hydration keeps seed 42; moving back to the default seed clears the param.
    await act(async () => {
      store.getState().setConfig({ seed: DEFAULT_CONFIG.seed });
    });
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const params = onUrlUpdate.mock.calls.at(-1)![0].searchParams as URLSearchParams;
    expect(params.get('seed')).toBeNull();
  });

  it('does not touch the URL when the config never changes', () => {
    const onUrlUpdate = vi.fn();
    const store = createSimulationStore();
    render(<Harness store={store} />, {
      wrapper: withNuqsTestingAdapter({ searchParams: '', onUrlUpdate }),
    });
    expect(onUrlUpdate).not.toHaveBeenCalled();
  });

  it('heals a hostile URL to the canonical clamped form on mount (single write)', async () => {
    const onUrlUpdate = vi.fn();
    const store = createSimulationStore();
    render(<Harness store={store} />, {
      wrapper: withNuqsTestingAdapter({
        searchParams: '?n=99&seed=-5&cooling=5',
        onUrlUpdate,
        hasMemory: true,
      }),
    });
    // The clamped config wins in the store…
    const s = store.getState();
    expect(s.config.boardSize).toBe(16);
    expect(s.config.seed).toBe(0);
    expect(s.config.saCoolingRate).toBe(0.999);
    // …and the URL is rewritten to the canonical form in one converging write.
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1));
    const params = onUrlUpdate.mock.calls.at(-1)![0].searchParams as URLSearchParams;
    expect(params.get('n')).toBe('16');
    expect(params.get('seed')).toBe('0');
    expect(params.get('cooling')).toBe('0.999');
    // No echo: the healing write settles (a loop would keep calling the spy).
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(onUrlUpdate).toHaveBeenCalledTimes(1);
  });

  it('restores the persisted config + speed on mount when the URL is bare', async () => {
    // The back-navigation/reload path: no params in the URL, but a
    // previous session persisted board 12 / seed 99 / 10x.
    saveVisualizerState(
      {
        boardSize: 12,
        seed: 99,
        strategy: 'min-conflicts',
        allowSideways: false,
        maxConsecutiveSideways: 50,
        allowRestarts: true,
        maxRestarts: 5,
        saCoolingRate: 0.95,
      },
      10,
    );
    const onUrlUpdate = vi.fn();
    const store = createSimulationStore();
    render(<Harness store={store} />, {
      wrapper: withNuqsTestingAdapter({ searchParams: '', onUrlUpdate, hasMemory: true }),
    });
    const s = store.getState();
    expect(s.config.boardSize).toBe(12);
    expect(s.config.seed).toBe(99);
    expect(s.config.strategy).toBe('min-conflicts');
    expect(s.speed).toBe(10);
    expect(s.result).not.toBeNull(); // restored config already executed
    // The bare URL is healed to the restored config (no more silent
    // reset-to-base on return navigation).
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const params = onUrlUpdate.mock.calls.at(-1)![0].searchParams as URLSearchParams;
    expect(params.get('n')).toBe('12');
    expect(params.get('seed')).toBe('99');
  });

  it('explicit URL params win over persisted state (share links stay authoritative)', () => {
    saveVisualizerState(
      {
        boardSize: 12,
        seed: 99,
        strategy: 'min-conflicts',
        allowSideways: false,
        maxConsecutiveSideways: 50,
        allowRestarts: true,
        maxRestarts: 5,
        saCoolingRate: 0.95,
      },
      10,
    );
    const store = createSimulationStore();
    render(<Harness store={store} />, {
      wrapper: withNuqsTestingAdapter({ searchParams: '?n=14&seed=7' }),
    });
    const s = store.getState();
    expect(s.config.boardSize).toBe(14);
    expect(s.config.seed).toBe(7);
    // The URL winner is written back through to storage.
    expect(loadVisualizerState()?.config.boardSize).toBe(14);
  });

  it('writes config and speed changes through to storage', async () => {
    const store = createSimulationStore();
    render(<Harness store={store} />, {
      wrapper: withNuqsTestingAdapter({ searchParams: '', hasMemory: true }),
    });
    await act(async () => {
      store.getState().setConfig({ seed: 42, boardSize: 12 });
    });
    await act(async () => {
      store.getState().setSpeed(10);
    });
    const stored = loadVisualizerState();
    expect(stored?.config.seed).toBe(42);
    expect(stored?.config.boardSize).toBe(12);
    expect(stored?.speed).toBe(10);
  });

  it('stays convergent across rapid successive config changes (scrubbing)', async () => {
    const onUrlUpdate = vi.fn();
    const store = createSimulationStore();
    render(<Harness store={store} />, {
      wrapper: withNuqsTestingAdapter({ searchParams: '', onUrlUpdate, hasMemory: true }),
    });
    // Simulate a slider scrub: a burst of setConfig calls, one per pointer move.
    for (const streak of [50, 100, 150, 200, 120, 80]) {
      await act(async () => {
        store.getState().setConfig({ maxConsecutiveSideways: streak });
      });
    }
    expect(store.getState().config.maxConsecutiveSideways).toBe(80);
    await waitFor(() => {
      const params = onUrlUpdate.mock.calls.at(-1)?.[0].searchParams as URLSearchParams;
      expect(params?.get('streak')).toBe('80');
    });
    // The bridge converges — after the final write, no echo updates follow.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    const params = onUrlUpdate.mock.calls.at(-1)![0].searchParams as URLSearchParams;
    expect(params.get('streak')).toBe('80');
    // One write per scrubbed value, bounded — never an unbounded echo loop.
    expect(onUrlUpdate.mock.calls.length).toBeLessThanOrEqual(8);
  });
});
