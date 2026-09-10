import { createStore } from 'zustand/vanilla';

/**
 * Tour UI store — transient tour-driven visual flags (D-062).
 *
 * Separate from the simulation store on purpose: these flags describe
 * what the *tour* wants the board to look like, not the simulation
 * state. They never persist, never touch the URL, and always reset
 * when the tour closes or moves past their step.
 */
export interface TourUiState {
  /**
   * When true, conflicted queens render WITHOUT their red glow (badges
   * and rays are unaffected). The tour sets this during the chessboard
   * intro substep so the board opens calm, then clears it on the "Red
   * Glow Means Attacked" substep — the existing glyph crossfade
   * animates the reveal for free.
   */
  calmQueens: boolean;
  setCalmQueens: (calm: boolean) => void;
}

/** Factory — isolated instances for tests. */
export function createTourUiStore() {
  return createStore<TourUiState>()((set) => ({
    calmQueens: false,
    setCalmQueens: (calmQueens: boolean) => set({ calmQueens }),
  }));
}
