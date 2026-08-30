/**
 * First-Choice hill climbing.
 *
 * Generates neighbors in RNG order (shuffled columns, shuffled rows) and
 * takes the FIRST acceptable one — an improving move, or a plateau move
 * while sideways moves are allowed. Skips full-board evaluation, which is
 * the whole point of the variant (cheap steps, more of them).
 */
import type { MoveSelection, Strategy, StrategyContext } from '../types';

export const firstChoiceStrategy: Strategy = {
  id: 'first-choice',
  selectMove(ctx: StrategyContext): MoveSelection | null {
    const { board, conflicts, rng, config, sidewaysStreak } = ctx;
    const n = board.length;
    const sidewaysAllowed = config.allowSideways && sidewaysStreak < config.maxConsecutiveSideways;

    const columnOrder = rng.shuffle(Array.from({ length: n }, (_, i) => i));
    let evaluatedMoves = 0;

    for (const column of columnOrder) {
      const rowOrder = rng.shuffle(Array.from({ length: n }, (_, i) => i));
      for (const row of rowOrder) {
        if (row === board[column]) continue;
        evaluatedMoves++;
        const delta = conflicts.moveDelta(column, row);
        if (delta < 0 || (delta === 0 && sidewaysAllowed)) {
          return { column, toRow: row, deltaConflicts: delta, evaluatedMoves };
        }
      }
    }
    return null;
  },
};
