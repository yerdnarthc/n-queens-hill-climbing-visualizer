import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { useUrlConfigSync } from '../useUrlConfigSync';
import { DEFAULT_CONFIG, createSimulationStore } from '../../store/simulation-store';
import type { SimulationState } from '../../store/simulation-store';
import type { StoreApi } from 'zustand/vanilla';

type Store = StoreApi<SimulationState>;

function Harness({ store }: { store: Store }) {
  useUrlConfigSync(store);
  return null;
}

describe('useUrlConfigSync', () => {
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
});
