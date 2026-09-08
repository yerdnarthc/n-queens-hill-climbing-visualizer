/**
 * Queen attack-ray geometry — pure, framework-free helpers.
 *
 * A queen's "lines of sight" are the 8 rays a chess queen can SEE along:
 * 2 along its row (E/W), 2 along its column (N/S), 4 diagonals.
 * Every cell on a ray shares the row, column, or diagonal with the source
 * — exactly the line families the engine's `createConflicts` counts, so
 * "a queen on a ray = an attacking pair" is the ground truth (D-003).
 * This is the ONLY truth; we never call these "moves" (the engine only
 * moves within a column — D-049 discussion).
 *
 * Each ray is an ORDERED list of cells radiating OUTWARD from the source
 * (nearest first). That order is what the overlay uses to find the first
 * queen hit and to split the ray into a solid (before the first hit) and
 * a ghost trail (after it, solid as the user requested).
 */

export interface RayCell {
  col: number;
  row: number;
}

export interface AttackRay {
  /** Cells on this line beyond the source, in outward order. */
  cells: RayCell[];
}

/** 8 directions — order here is the animation cascade order. */
const DIRS: readonly { dc: number; dr: number }[] = [
  { dc: 0, dr: 1 }, // S — column, south (legal-move axis, first)
  { dc: 0, dr: -1 }, // N
  { dc: 1, dr: 0 }, // E — row
  { dc: -1, dr: 0 }, // W
  { dc: 1, dr: 1 }, // SE
  { dc: -1, dr: 1 }, // SW
  { dc: 1, dr: -1 }, // NE
  { dc: -1, dr: -1 }, // NW
] as const;

/**
 * 8 rays from `(col, row)` on an `n × n` board, each ordered outward.
 * Pure — no React, no board lookups.
 */
export function computeAttackRays(col: number, row: number, n: number): AttackRay[] {
  if (!Number.isInteger(col) || !Number.isInteger(row) || !Number.isInteger(n)) {
    throw new RangeError('computeAttackRays: col/row/n must be integers');
  }
  if (n < 1 || n > 64) throw new RangeError(`n must be in [1, 64], got ${n}`);
  if (col < 0 || col >= n || row < 0 || row >= n) {
    throw new RangeError(`source (${col},${row}) outside [0, ${n})`);
  }
  return DIRS.map(({ dc, dr }) => {
    const cells: RayCell[] = [];
    for (let c = col + dc, r = row + dr; c >= 0 && c < n && r >= 0 && r < n; c += dc, r += dr) {
      cells.push({ col: c, row: r });
    }
    return { cells };
  });
}

/**
 * For a single ray, classify which columns are hit and where the first
 * queen blocks it. Used by the overlay to split solid vs ghost.
 *
 * @param board - `board[col] = row` at the hovered snapshot.
 * @param source - the inspected queen's coordinates (not itself counted).
 * @param ray - one directional cell list from `computeAttackRays`.
 */
export function partitionRayByBoard(
  board: readonly number[],
  source: RayCell,
  ray: AttackRay,
): { hits: RayCell[]; firstHit: RayCell | null; ghostFrom: number } {
  // Index board rows for O(1) hit checks: col "col" has queen at (col, board[col]).
  const hits: RayCell[] = [];
  let firstHit: RayCell | null = null;
  let ghostFrom = ray.cells.length; // index where ghost opacity starts
  for (let i = 0; i < ray.cells.length; i++) {
    const cell = ray.cells[i]!;
    if (board[cell.col] === cell.row && !(cell.col === source.col && cell.row === source.row)) {
      hits.push(cell);
      if (firstHit === null) {
        firstHit = cell;
        ghostFrom = i + 1; // ghost = cells after the first queen hit
      }
    }
  }
  return { hits, firstHit, ghostFrom };
}
