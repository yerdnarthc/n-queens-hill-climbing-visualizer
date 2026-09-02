/**
 * Shared, framework-free strategy & policy metadata (Phase 5).
 *
 * Extracted from `config-panel.tsx` (which previously owned `STRATEGY_INFO`) so
 * both the config panel and the `/how-it-works` page render from ONE source of
 * truth. Type-only import from the pure engine — zero React/framework deps, so
 * it is safe to consume from any module and is unit-testable in isolation.
 */
import type { StrategyId } from '@/lib/engine';

export interface StrategyInfo {
  name: string;
  /** Plain-language description of how the strategy picks a move. */
  description: string;
}

/** Display metadata keyed by strategy id (order follows `STRATEGY_IDS`). */
export const STRATEGY_INFO: Record<StrategyId, StrategyInfo> = {
  'steepest-ascent': {
    name: 'Steepest-Ascent',
    description:
      'Evaluates all N·(N-1) neighbor moves and picks the one yielding the greatest conflict reduction.',
  },
  'first-choice': {
    name: 'First-Choice',
    description:
      'Generates random neighbor moves one by one and accepts the first move that improves conflicts.',
  },
  stochastic: {
    name: 'Stochastic',
    description:
      'Identifies all improving moves and chooses among them with probability proportional to the improvement steepness.',
  },
  'min-conflicts': {
    name: 'Min-Conflicts',
    description:
      'Selects a queen involved in a conflict at random, then moves it to the row with the fewest attacking queens.',
  },
  'simulated-annealing': {
    name: 'Simulated Annealing',
    description:
      'Always accepts improving moves, and accepts worsening moves with probability e^(-Δ/T) while cooling temperature geometrically.',
  },
};

/** Orchestrator policies shared by every strategy (see docs/DECISIONS.md D-006). */
export const POLICY_INFO = [
  {
    name: 'Sideways Moves',
    tag: 'Plateau Traversal',
    description:
      'Lets the search keep walking across flat “shoulder” regions (Δ = 0) instead of stopping at the first plateau, up to a consecutive-move budget (default 100, per AIMA).',
  },
  {
    name: 'Random Restarts',
    tag: 'Escaping Local Maxima',
    description:
      'When the search gets stuck on a local maximum, it abandons the current board and starts fresh from a new random placement — giving it another chance to find the global optimum.',
  },
] as const;
