/**
 * Min-Conflicts (AIMA ch. 6.4 / Russell's local-search classic).
 *
 * Picks one RANDOM CONFLICTED queen, then moves it to the row within its
 * own column that minimizes conflicts (ties broken uniformly at random).
 * Unlike the textbook variant, this implementation never accepts a
 * worsening move, which preserves the hill-climbing termination invariants
 * the rest of the engine (and the landscape charts) rely on.
 *
 * Note: when the randomly chosen queen has no acceptable move, the step
 * yields "stuck" — another queen might still have one. That is inherent
 * to min-conflicts' single-variable scope; random restarts compensate.
 */
import type { MoveSelection, Strategy, StrategyContext } from '../types';

export const minConflictsStrategy: Strategy = {
  id: 'min-conflicts',
  selectMove(ctx: StrategyContext): MoveSelection | null {
    const { board, conflicts, rng, config, sidewaysStreak } = ctx;
    const n = board.length;
    const sidewaysAllowed = config.allowSideways && sidewaysStreak < config.maxConsecutiveSideways;

    const conflictedColumns: number[] = [];
    for (let column = 0; column < n; column++) {
      if (conflicts.queenConflicts(column) > 0) conflictedColumns.push(column);
    }
    if (conflictedColumns.length === 0) return null; // solved — orchestrator guards this too

    const column = rng.pick(conflictedColumns);
    let minDelta = Infinity;
    let bestRows: number[] = [];
    let evaluatedMoves = 0;

    for (let row = 0; row < n; row++) {
      if (row === board[column]) continue;
      evaluatedMoves++;
      const delta = conflicts.moveDelta(column, row);
      if (delta < minDelta) {
        minDelta = delta;
        bestRows = [row];
      } else if (delta === minDelta) {
        bestRows.push(row);
      }
    }

    // n === 1 boards are solved before strategies run, so bestRows is never empty here.
    if (minDelta < 0 || (minDelta === 0 && sidewaysAllowed)) {
      return {
        column,
        toRow: rng.pick(bestRows),
        deltaConflicts: minDelta,
        evaluatedMoves,
      };
    }
    return null;
  },
};
