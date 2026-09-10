'use client';

/**
 * Store entry — app-wide singleton + React binding.
 *
 * `simulation-store.ts` stays React-free (a vanilla `StoreApi` factory) so
 * headless tests and non-React code can use stores in isolation; THIS module
 * is the React boundary that instantiates the singleton and binds `useStore`.
 */
import { useStore } from 'zustand/react';
import { createSimulationStore, type SimulationState } from './simulation-store';
import { createTourUiStore, type TourUiState } from './tour-ui-store';

export * from './simulation-store';
export * from './tour-ui-store';

/** The app-wide simulation store (one instance per browser tab). */
export const simulationStore = createSimulationStore();

/** Subscribe to a slice of the simulation store with a selector. */
export function useSimulationStore<T>(selector: (state: SimulationState) => T): T {
  return useStore(simulationStore, selector);
}

/** The app-wide tour UI store (one instance per browser tab). */
export const tourUiStore = createTourUiStore();

/** Subscribe to a slice of the tour UI store with a selector. */
export function useTourUiStore<T>(selector: (state: TourUiState) => T): T {
  return useStore(tourUiStore, selector);
}
