/**
 * Stochastic hill climbing (random walk among best neighbors).
 *
 * Evaluates every neighbor, keeps the minimum-conflict level, then picks a
 * move UNIFORMLY AT RANDOM among all moves achieving it. Escapes
 * deterministic cycling at the cost of more steps, and makes the variant
 * a fair comparison subject in the analytics charts.
 *
 * Acceptance floor: strictly improving, or plateau while sideways moves
 * are allowed and the streak budget remains.
 */
import type { MoveSelection, Strategy, StrategyContext } from '../types';

interface Candidate {
  column: number;
  toRow: number;
  delta: number;
}

export const stochasticStrategy: Strategy = {
  id: 'stochastic',
  selectMove(ctx: StrategyContext): MoveSelection | null {
    const { board, conflicts, rng, config, sidewaysStreak } = ctx;
    const n = board.length;
    const sidewaysAllowed = config.allowSideways && sidewaysStreak < config.maxConsecutiveSideways;

    const candidates: Candidate[] = [];
    for (let column = 0; column < n; column++) {
      for (let row = 0; row < n; row++) {
        if (row === board[column]) continue;
        candidates.push({ column, toRow: row, delta: conflicts.moveDelta(column, row) });
      }
    }

    const evaluatedMoves = candidates.length;
    if (candidates.length === 0) return null;

    let minDelta = Infinity;
    for (const c of candidates) minDelta = Math.min(minDelta, c.delta);

    if (minDelta > 0) return null;
    if (minDelta === 0 && !sidewaysAllowed) return null;

    const best = candidates.filter((c) => c.delta === minDelta);
    const chosen = rng.pick(best);
    return {
      column: chosen.column,
      toRow: chosen.toRow,
      deltaConflicts: chosen.delta,
      evaluatedMoves,
    };
  },
};
