import { describe, it, expect } from 'vitest';
import { computeAttackRays, partitionRayByBoard } from '../attack-rays';

describe('computeAttackRays', () => {
  it('produces 8 rays, outward-ordered, defends bounds', () => {
    const rays = computeAttackRays(2, 2, 4);
    expect(rays.length).toBe(8);
    expect(() => computeAttackRays(9, 0, 8)).toThrow(RangeError);
    // Corner: (0,0) has 3 populated rays (S, E, SE).
    const corner = computeAttackRays(0, 0, 4);
    expect(corner.filter((r) => r.cells.length > 0).length).toBe(3);
  });

  it('covers full-length rays for every direction', () => {
    const n = 8;
    const mid = computeAttackRays(3, 3, n);
    // Every ray stays in-bounds; the outward walk never wraps.
    for (const ray of mid)
      for (const c of ray.cells) {
        expect(c.col).toBeGreaterThanOrEqual(0);
        expect(c.row).toBeGreaterThanOrEqual(0);
        expect(c.col).toBeLessThan(n);
        expect(c.row).toBeLessThan(n);
      }
    // N/S rays together span n-1 cells through the column (excludes source).
    const colRays = mid.filter((r) => r.cells.every((c) => c.col === 3));
    expect(colRays.flatMap((r) => r.cells).length).toBe(n - 1);
  });
});

describe('partitionRayByBoard', () => {
  it('splits solid vs ghost at the first hit, hits are ordered', () => {
    // rows[col] = row : queens on a diagonal 0,0 → 3,3
    const board = [0, 1, 2, 3];
    const source = { col: 0, row: 0 };
    const ray = computeAttackRays(0, 0, 4).find(
      (r) => r.cells[0]?.col === 1 && r.cells[0]?.row === 1,
    )!;
    const { hits, firstHit, ghostFrom } = partitionRayByBoard(board, source, ray);
    expect(hits.length).toBe(3);
    expect(firstHit).toEqual({ col: 1, row: 1 });
    // Ghost starts after the first queen hit (cells after index 0).
    expect(ghostFrom).toBe(1);
  });

  it('returns empty hits for an empty ray', () => {
    const board = [0, 0, 0, 0];
    const source = { col: 1, row: 1 };
    const ray = computeAttackRays(1, 1, 4)[1]!; // N from an edge may be short
    expect(partitionRayByBoard(board, source, ray).hits).toBeDefined();
  });
});
