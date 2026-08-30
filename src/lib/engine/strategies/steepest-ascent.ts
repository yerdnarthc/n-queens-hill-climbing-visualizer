/**
 * Steepest-Ascent hill climbing (AIMA fig. 4.2 style, minus random restarts).
 *
 * Evaluates EVERY neighbor (all rows of all columns), then takes a
 * minimum-conflict move. Ties break to the first minimum found in a fixed
 * column-major scan order, so runs are fully deterministic even without
 * the RNG.
 *
 * Accepts the best move iff it strictly improves, or is a plateau move
 * (Δ = 0) while sideways moves are allowed and the streak budget remains.
 */
import type { MoveSelection, Strategy, StrategyContext } from '../types';

export const steepestAscentStrategy: Strategy = {
  id: 'steepest-ascent',
  selectMove(ctx: StrategyContext): MoveSelection | null {
    const { board, conflicts, config, sidewaysStreak } = ctx;
    const n = board.length;
    const sidewaysAllowed = config.allowSideways && sidewaysStreak < config.maxConsecutiveSideways;

    let best: MoveSelection | null = null;
    let evaluatedMoves = 0;

    for (let column = 0; column < n; column++) {
      for (let row = 0; row < n; row++) {
        if (row === board[column]) continue;
        evaluatedMoves++;
        const delta = conflicts.moveDelta(column, row);
        if (delta < 0 && (best === null || delta < best.deltaConflicts)) {
          // Strict `<` ⇒ first minimum in scan order wins ties.
          best = { column, toRow: row, deltaConflicts: delta, evaluatedMoves: 0 };
        } else if (delta === 0 && best === null && sidewaysAllowed) {
          // Plateau placeholder; replaced instantly if any improvement exists.
          best = { column, toRow: row, deltaConflicts: 0, evaluatedMoves: 0 };
        }
      }
    }

    if (best === null) return null;
    return { ...best, evaluatedMoves };
  },
};
