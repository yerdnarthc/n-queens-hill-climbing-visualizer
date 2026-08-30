/**
 * Simulated Annealing.
 *
 * Proposes ONE random neighbor per iteration (uniform column, uniform
 * different row) and applies the Metropolis rule:
 *   - Δ ≤ 0  → accept (plateau moves honor the global sideways toggle)
 *   - Δ > 0  → accept with probability e^(−Δ / T)
 * The temperature decays geometrically after EVERY proposal — accepted or
 * not — so the returned `temperatureAfter` is the orchestrator's next T.
 *
 * The proposal loop runs internally until a move is accepted or T drops
 * below `saMinTemp`, at which point the strategy returns null ⇒ frozen.
 * (The loop is finite: T strictly decreases by factor `saCoolingRate`
 * each proposal, bounded below by saMinTemp > 0.)
 *
 * Exempt from the consecutive-sideways budget: annealing's plateau/warming
 * behavior is governed by temperature, not the shoulder-streak heuristic.
 */
import type { MoveSelection, Strategy, StrategyContext } from '../types';

export const simulatedAnnealingStrategy: Strategy = {
  id: 'simulated-annealing',
  selectMove(ctx: StrategyContext): MoveSelection | null {
    const { board, conflicts, rng, config, temperature } = ctx;
    const n = board.length;
    let temp = temperature;
    let proposals = 0;

    while (temp >= config.saMinTemp) {
      proposals++;
      const column = rng.int(n);
      // Uniform row among the n − 1 alternatives — one RNG call, never a no-op.
      const toRow = (board[column] + 1 + rng.int(n - 1)) % n;
      const delta = conflicts.moveDelta(column, toRow);

      const accept =
        delta < 0 ? true : delta === 0 ? config.allowSideways : rng.chance(Math.exp(-delta / temp));

      const tempBefore = temp;
      temp *= config.saCoolingRate;

      if (accept) {
        return {
          column,
          toRow,
          deltaConflicts: delta,
          evaluatedMoves: proposals,
          temperature: tempBefore,
          temperatureAfter: temp,
        };
      }
    }
    return null; // frozen below saMinTemp
  },
};
