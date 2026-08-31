'use client';

/**
 * useSimulationDriver — the app's playback heartbeat (Phase 2).
 *
 * Owns the ONLY timer in the app (D-020): the store stays headless, while a
 * `setInterval` here ticks `stepForward` every `1000 / speed` ms. The store's
 * auto-pause-at-end makes the interval self-terminating, so the driver never
 * needs to know run lengths. The interval is recreated when `isPlaying` or
 * `speed` changes; unmounting clears it.
 *
 * On mount it also ensures an initial run exists, so any page that mounts the
 * driver always has data to render. The visualizer page mounts it exactly
 * once; tests may pass an isolated store (the app uses the default singleton).
 */
import { useEffect } from 'react';
import { useStore } from 'zustand/react';
import type { StoreApi } from 'zustand/vanilla';
import { simulationStore } from '@/store';
import type { SimulationState } from '@/store/simulation-store';

export function useSimulationDriver(store: StoreApi<SimulationState> = simulationStore): void {
  const isPlaying = useStore(store, (s) => s.isPlaying);
  const speed = useStore(store, (s) => s.speed);
  const hasResult = useStore(store, (s) => s.result !== null);

  // Ensure an initial run exists (idempotent — nothing ever resets to null).
  useEffect(() => {
    if (store.getState().result === null) store.getState().run();
  }, [store]);

  useEffect(() => {
    if (!isPlaying || !hasResult) return;
    const id = setInterval(() => store.getState().stepForward(), 1000 / speed);
    return () => clearInterval(id);
  }, [isPlaying, speed, hasResult, store]);
}
