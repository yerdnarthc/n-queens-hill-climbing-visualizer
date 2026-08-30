import { describe, expect, it } from 'vitest';
import { createConflicts, countConflictsBruteForce } from '../conflicts';
import { createRng } from '../rng';

/** Classic 8-queens solution — verified independently below. */
const SOLUTION8 = [0, 4, 7, 5, 2, 6, 1, 3];

describe('known-board conflict counts', () => {
  // Independent validity proof for the fixture: a solution must have
  // distinct rows, distinct "/" diagonals (r+c), distinct "\" diagonals (r−c).
  it('SOLUTION8 is a genuine 8-queens solution (independent property check)', () => {
    expect(new Set(SOLUTION8).size).toBe(8);
    expect(new Set(SOLUTION8.map((r, c) => r + c)).size).toBe(8);
    expect(new Set(SOLUTION8.map((r, c) => r - c)).size).toBe(8);
  });

  it('counts 0 conflicts on a known 8-queens solution (both evaluators)', () => {
    expect(countConflictsBruteForce(SOLUTION8)).toBe(0);
    expect(createConflicts(SOLUTION8).getTotal()).toBe(0);
  });

  it('counts C(8,2) = 28 conflicts on the all-diagonal board', () => {
    const rows = [0, 1, 2, 3, 4, 5, 6, 7]; // every pair shares the main diagonal
    expect(countConflictsBruteForce(rows)).toBe(28);
    expect(createConflicts(rows).getTotal()).toBe(28);
  });

  it('counts 1 conflict on the shoulder fixture [1,2,0,3]', () => {
    expect(countConflictsBruteForce([1, 2, 0, 3])).toBe(1);
    expect(createConflicts([1, 2, 0, 3]).getTotal()).toBe(1);
  });

  it('counts all-in-one-row boards as C(n,2)', () => {
    const n = 12;
    const rows = Array.from({ length: n }, () => 5); // every column's queen on row 5
    expect(createConflicts(rows).getTotal()).toBe((n * (n - 1)) / 2);
  });
});

describe('queenConflicts', () => {
  it('attributes conflicts to exactly the attacking columns', () => {
    const c = createConflicts([1, 2, 0, 3]); // conflict pair: col0–col1
    expect(c.queenConflicts(0)).toBe(1);
    expect(c.queenConflicts(1)).toBe(1);
    expect(c.queenConflicts(2)).toBe(0);
    expect(c.queenConflicts(3)).toBe(0);
  });

  it('a queen on a triple diagonal sees 2 conflicts on both diagonals', () => {
    // queens at (0,0),(1,1),(2,2) all share the main "\" diagonal; the filler
    // queens at rows 7/5 avoid it (a uniform row-r filler would land (r,r) on it)
    const c = createConflicts([0, 1, 2, 7, 7, 7, 7, 5]);
    expect(c.queenConflicts(0)).toBe(2);
    expect(c.queenConflicts(1)).toBe(2);
    expect(c.queenConflicts(2)).toBe(2);
  });
});

describe('incremental evaluator vs brute-force oracle (fuzz)', () => {
  it('agrees with the oracle on random boards across sizes 4–16', () => {
    const rng = createRng(123456);
    for (let trial = 0; trial < 120; trial++) {
      const n = 4 + rng.int(13); // 4..16
      const rows = Array.from({ length: n }, () => rng.int(n));
      expect(createConflicts(rows).getTotal()).toBe(countConflictsBruteForce(rows));
    }
  });

  it('moveDelta predicts every applyMove result exactly, over long random move chains', () => {
    const rng = createRng(987654);
    for (let trial = 0; trial < 40; trial++) {
      const n = 4 + rng.int(13);
      const rows = Array.from({ length: n }, () => rng.int(n));
      const c = createConflicts(rows);
      for (let move = 0; move < 30; move++) {
        const column = rng.int(n);
        const toRow = rng.int(n);
        const before = c.getTotal();
        const predicted = c.moveDelta(column, toRow);
        const after = c.applyMove(column, toRow);
        expect(after).toBe(before + predicted);
        expect(after).toBe(countConflictsBruteForce(c.getRows().slice()));
      }
    }
  });

  it('moveDelta/applyMove are no-ops when toRow equals the current row', () => {
    const c = createConflicts([1, 2, 0, 3]);
    const before = c.getRows().slice();
    expect(c.moveDelta(1, 2)).toBe(0);
    expect(c.applyMove(1, 2)).toBe(1);
    expect(c.getRows().slice()).toEqual(before);
  });
});

describe('validation', () => {
  it('rejects empty boards and out-of-range rows', () => {
    expect(() => createConflicts([])).toThrow(RangeError);
    expect(() => createConflicts([0, 9])).toThrow(RangeError);
    expect(() => createConflicts([0, -1])).toThrow(RangeError);
    expect(() => createConflicts([0, 0.5])).toThrow(RangeError);
  });

  it('rejects out-of-range columns/rows on every operation', () => {
    const c = createConflicts([1, 2, 0, 3]);
    expect(() => c.queenConflicts(-1)).toThrow(RangeError);
    expect(() => c.queenConflicts(4)).toThrow(RangeError);
    expect(() => c.moveDelta(0, 4)).toThrow(RangeError);
    expect(() => c.moveDelta(4, 0)).toThrow(RangeError);
    expect(() => c.applyMove(0, -1)).toThrow(RangeError);
    expect(() => c.applyMove(4, 0)).toThrow(RangeError);
  });

  it('getRows exposes a live view; callers must copy (documented contract)', () => {
    const c = createConflicts([1, 2, 0, 3]);
    const copy = c.getRows().slice();
    c.applyMove(0, 0);
    expect(c.getRows().slice()).not.toEqual(copy);
  });
});
