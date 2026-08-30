/**
 * Incremental N-Queens conflict evaluator.
 *
 * Maintains occupancy counts for rows and both diagonal families so that:
 *   - total conflicts          → O(1)
 *   - per-queen conflicts      → O(1)
 *   - hypothetical-move delta  → O(1)   (the `moveDelta` workhorse)
 *   - applying a move          → O(1)
 * …replacing the legacy O(n⁴) per-step re-evaluation.
 *
 * A queen at (column c, row r) attacks another iff they share a row or a
 * diagonal. Because there is exactly one queen per column, a queen's
 * row-line and diagonal-line partners are disjoint — counts never
 * double-count a pair.
 *
 * The state OWNS the board (`getRows`) and is the single source of truth:
 * all mutations must go through `applyMove`, keeping counts always in sync.
 */

export interface ConflictsState {
  readonly size: number;
  /** Live board view — read-only by contract; copy for snapshots. */
  getRows(): readonly number[];
  /** Total attacking queen pairs. */
  getTotal(): number;
  /** Queens attacking the queen in `column` (row + both diagonals). */
  queenConflicts(column: number): number;
  /** Conflicts change if the queen in `column` moved to `toRow` (0 if unchanged). */
  moveDelta(column: number, toRow: number): number;
  /** Perform the move; returns the new total. No-op if `toRow` is the current row. */
  applyMove(column: number, toRow: number): number;
}

export function createConflicts(rows: readonly number[]): ConflictsState {
  const n = rows.length;
  if (n < 1) throw new RangeError('board must have at least one column');
  for (let c = 0; c < n; c++) {
    const r = rows[c];
    if (!Number.isInteger(r) || r < 0 || r >= n) {
      throw new RangeError(`rows[${c}] = ${r} is outside [0, ${n})`);
    }
  }

  const board = rows.slice();
  const rowCount = new Int32Array(n);
  const diagUp = new Int32Array(2 * n - 1); // r + c            ("/" anti-diagonals)
  const diagDown = new Int32Array(2 * n - 1); // r − c + n − 1 ("\" diagonals)
  let total = 0;

  // total is maintained as Σ C(count, 2) across all lines:
  // adding a queen to a line with `c` occupants creates `c` new pairs,
  // removing one destroys `c − 1` pairs.
  const add = (counts: Int32Array, i: number): void => {
    total += counts[i];
    counts[i]++;
  };
  const remove = (counts: Int32Array, i: number): void => {
    counts[i]--;
    total -= counts[i];
  };

  for (let c = 0; c < n; c++) {
    const r = board[c];
    add(rowCount, r);
    add(diagUp, r + c);
    add(diagDown, r - c + n - 1);
  }

  const validateColumn = (column: number): void => {
    if (!Number.isInteger(column) || column < 0 || column >= n) {
      throw new RangeError(`column ${column} is outside [0, ${n})`);
    }
  };
  const validateRow = (row: number): void => {
    if (!Number.isInteger(row) || row < 0 || row >= n) {
      throw new RangeError(`row ${row} is outside [0, ${n})`);
    }
  };

  return {
    size: n,
    getRows: () => board,
    getTotal: () => total,
    queenConflicts(column) {
      validateColumn(column);
      const r = board[column];
      return rowCount[r] - 1 + diagUp[r + column] - 1 + diagDown[r - column + n - 1] - 1;
    },
    moveDelta(column, toRow) {
      validateColumn(column);
      validateRow(toRow);
      const fromRow = board[column];
      if (toRow === fromRow) return 0;
      // Pairs destroyed: the other queens on the moving queen's current lines.
      const removed =
        rowCount[fromRow] -
        1 +
        diagUp[fromRow + column] -
        1 +
        diagDown[fromRow - column + n - 1] -
        1;
      // Pairs created: occupants already on the destination lines. The moving
      // queen's old lines never coincide with the destination lines (toRow ≠
      // fromRow ⇒ different row, and same column ⇒ different diagonals).
      const added = rowCount[toRow] + diagUp[toRow + column] + diagDown[toRow - column + n - 1];
      return added - removed;
    },
    applyMove(column, toRow) {
      validateColumn(column);
      validateRow(toRow);
      const fromRow = board[column];
      if (toRow === fromRow) return total;
      remove(rowCount, fromRow);
      remove(diagUp, fromRow + column);
      remove(diagDown, fromRow - column + n - 1);
      add(rowCount, toRow);
      add(diagUp, toRow + column);
      add(diagDown, toRow - column + n - 1);
      board[column] = toRow;
      return total;
    },
  };
}

/**
 * O(n²) pair-scan conflict counter — the ground-truth oracle.
 * Assumes the one-queen-per-column representation.
 */
export function countConflictsBruteForce(rows: readonly number[]): number {
  const n = rows.length;
  if (n < 1) throw new RangeError('board must have at least one column');
  let count = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (rows[i] === rows[j] || Math.abs(i - j) === Math.abs(rows[i] - rows[j])) count++;
    }
  }
  return count;
}
