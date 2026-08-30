import { describe, expect, it } from 'vitest';
import { runSimulation } from '../simulation';
import type { Snapshot } from '../types';

/**
 * Fixture (oracle-verified): [1,2,0,3] has exactly one conflict and NO
 * improving neighbour — its unique shoulder c1→r3 leads to [1,3,0,3], whose
 * unique improvement c3→r2 solves the board. Exact expectations below were
 * machine-harvested from the engine, not hand-derived.
 */
const SHOULDER_START = [1, 2, 0, 3];

const snapBoards = (snaps: Snapshot[]) => snaps.map((s) => s.board);

describe('runSimulation — shoulder-to-solve walk', () => {
  const result = runSimulation({
    boardSize: 4,
    seed: 1,
    strategy: 'steepest-ascent',
    initialRows: SHOULDER_START,
  });

  it('emits initial + one shoulder + one improving snapshot, then solves', () => {
    expect(result.status).toBe('solved');
    expect(result.solved).toBe(true);
    expect(result.snapshots).toHaveLength(3);
    expect(snapBoards(result.snapshots)).toEqual([
      [1, 2, 0, 3],
      [1, 3, 0, 3],
      [1, 3, 0, 2],
    ]);
    expect(result.snapshots.map((s) => s.phase)).toEqual(['initial', 'shoulder', 'improving']);
    expect(result.snapshots.map((s) => s.conflicts)).toEqual([1, 1, 0]);
  });

  it('records full move details including evaluated-move cost', () => {
    expect(result.snapshots[1]!.move).toEqual({
      column: 1,
      fromRow: 2,
      toRow: 3,
      deltaConflicts: 0,
      evaluatedMoves: 12,
    });
    expect(result.snapshots[2]!.move).toEqual({
      column: 3,
      fromRow: 3,
      toRow: 2,
      deltaConflicts: -1,
      evaluatedMoves: 12,
    });
  });

  it('accumulates counters and tracks the best board seen', () => {
    expect(result.totalSteps).toBe(2);
    expect(result.totalIterations).toBe(2);
    expect(result.totalEvaluatedMoves).toBe(24);
    expect(result.restarts).toBe(0);
    expect(result.bestConflicts).toBe(0);
    expect(result.bestStep).toBe(2);
    expect(result.finalBoard).toEqual([1, 3, 0, 2]);
    expect(result.finalConflicts).toBe(0);
  });

  it('honours iterationInRestart bookkeeping', () => {
    expect(result.snapshots.map((s) => s.iterationInRestart)).toEqual([0, 1, 2]);
  });

  it('honours initialRows without mutating the caller array', () => {
    const rows = [...SHOULDER_START];
    const r = runSimulation({
      boardSize: 4,
      seed: 7,
      strategy: 'steepest-ascent',
      initialRows: rows,
    });
    rows[0] = 3;
    expect(r.snapshots[0]!.board).toEqual(SHOULDER_START);
    expect(r.finalBoard).not.toBe(rows);
  });

  it('snapshot boards are independent copies (mutating one changes nothing else)', () => {
    const r = runSimulation({
      boardSize: 4,
      seed: 1,
      strategy: 'steepest-ascent',
      initialRows: SHOULDER_START,
    });
    r.snapshots[1]!.board[0] = 9;
    expect(r.snapshots[2]!.board[0]).toBe(1);
    expect(r.finalBoard[0]).toBe(1);
  });
});

describe('runSimulation — stagnation without sideways moves', () => {
  it('stops immediately on the shoulder board with zero steps', () => {
    const result = runSimulation({
      boardSize: 4,
      seed: 1,
      strategy: 'steepest-ascent',
      allowSideways: false,
      initialRows: SHOULDER_START,
    });
    expect(result.status).toBe('stagnated');
    expect(result.solved).toBe(false);
    expect(result.totalSteps).toBe(0);
    expect(result.totalIterations).toBe(0);
    expect(result.totalEvaluatedMoves).toBe(0);
    expect(result.snapshots).toHaveLength(1);
    expect(result.bestConflicts).toBe(1);
    expect(result.bestStep).toBe(0);
    expect(result.finalBoard).toEqual(SHOULDER_START);
  });
});

describe('runSimulation — random restarts (n=8, steepest-ascent, seed 1)', () => {
  const base = { boardSize: 8, seed: 1, strategy: 'steepest-ascent' as const };

  it('solves via restarts: exactly 4 restarts, verified snapshot shape', () => {
    const r = runSimulation({ ...base, allowRestarts: true, maxRestarts: 10 });
    expect(r.status).toBe('solved');
    expect(r.solved).toBe(true);
    expect(r.restarts).toBe(4);
    expect(r.totalSteps).toBe(426);
    expect(r.totalIterations).toBe(422);
    expect(r.totalEvaluatedMoves).toBe(23632);
    expect(r.finalConflicts).toBe(0);
    expect(r.bestConflicts).toBe(0);
    expect(r.bestStep).toBe(426);
    expect(r.finalBoard).toEqual([5, 3, 1, 7, 4, 6, 0, 2]);

    // Restart snapshots: fresh board, counters reset, restartCount incremented.
    const restarts = r.snapshots.filter((s) => s.phase === 'restart');
    expect(restarts).toHaveLength(4);
    expect(restarts.map((s) => s.restartCount)).toEqual([1, 2, 3, 4]);
    expect(restarts.every((s) => s.iterationInRestart === 0 && s.move === null)).toBe(true);
    // Boards differ across restarts (fresh randomness from the shared stream).
    expect(restarts[0]!.board).toEqual([3, 7, 3, 3, 1, 3, 1, 1]);
    expect(restarts[1]!.board).toEqual([3, 0, 3, 6, 2, 1, 0, 3]);
    expect(restarts[2]!.board).toEqual([4, 6, 2, 1, 5, 4, 6, 1]);
    expect(restarts[3]!.board).toEqual([5, 3, 6, 7, 1, 6, 1, 2]);
  });

  it('without restart budget the same seed stagnates at 1 conflict after the shoulder walk', () => {
    const r = runSimulation({ ...base, allowRestarts: true, maxRestarts: 0 });
    expect(r.status).toBe('stagnated');
    expect(r.restarts).toBe(0);
    expect(r.totalSteps).toBe(105);
    expect(r.totalIterations).toBe(105);
    expect(r.totalEvaluatedMoves).toBe(5880);
    expect(r.finalConflicts).toBe(1);
    expect(r.bestConflicts).toBe(1);
    expect(r.bestStep).toBe(5);
    expect(r.snapshots).toHaveLength(106);
    expect(r.snapshots[105]!.phase).toBe('shoulder');
    expect(r.finalBoard).toEqual([3, 0, 4, 7, 0, 6, 1, 5]);
  });
});

describe('runSimulation — simulated annealing run-level behaviour', () => {
  it('reports frozen when temperature bottoms out (n=8, seed 2)', () => {
    const r = runSimulation({ boardSize: 8, seed: 2, strategy: 'simulated-annealing' });
    expect(r.status).toBe('frozen');
    expect(r.solved).toBe(false);
    expect(r.totalSteps).toBe(229);
    expect(r.bestConflicts).toBe(1);
  });

  it('SA snapshots carry temperature; non-SA snapshots carry null', () => {
    const r = runSimulation({ boardSize: 8, seed: 2, strategy: 'simulated-annealing' });
    expect(r.snapshots[0]!.temperature).toBe(8); // initial: saInitialTemp defaults to boardSize
    const moved = r.snapshots.filter(
      (s) => s.phase === 'improving' || s.phase === 'worsening' || s.phase === 'shoulder',
    );
    moved.slice(0, 3).forEach((s) => expect(s.temperature).not.toBeNull());
    const steep = runSimulation({ boardSize: 8, seed: 2, strategy: 'steepest-ascent' });
    steep.snapshots.forEach((s) => expect(s.temperature).toBeNull());
  });
});

describe('runSimulation — determinism', () => {
  const input = { boardSize: 8, seed: 12, strategy: 'min-conflicts' as const };

  it('same seed + config ⇒ bit-identical results (snapshot histories deep-equal)', () => {
    const a = runSimulation(input);
    const b = runSimulation(input);
    expect(a).toEqual(b);
    expect(a.snapshots).toEqual(b.snapshots);
  });

  it('different seed ⇒ different initial board (mulberry32 stream actually used)', () => {
    const a = runSimulation(input);
    const b = runSimulation({ ...input, seed: 13 });
    expect(a.snapshots[0]!.board).not.toEqual(b.snapshots[0]!.board);
  });
});

describe('runSimulation — budgets', () => {
  it('exhausts at maxTotalSteps: history truncated to the hard cap', () => {
    const r = runSimulation({
      boardSize: 8,
      seed: 1,
      strategy: 'steepest-ascent',
      maxTotalSteps: 10,
    });
    expect(r.status).toBe('exhausted');
    expect(r.snapshots).toHaveLength(11); // initial + 10 steps
    expect(r.totalSteps).toBe(10);
    expect(r.solved).toBe(false);
  });

  it('exhausts at maxIterationsPerRestart when no restarts are available', () => {
    const r = runSimulation({
      boardSize: 8,
      seed: 1,
      strategy: 'steepest-ascent',
      maxIterationsPerRestart: 7,
    });
    expect(r.status).toBe('exhausted');
    expect(r.snapshots).toHaveLength(8);
    expect(r.snapshots[7]!.iterationInRestart).toBe(7);
  });

  it('per-restart budget with restarts enabled hops to a fresh board and keeps going', () => {
    const r = runSimulation({
      boardSize: 8,
      seed: 1,
      strategy: 'steepest-ascent',
      maxIterationsPerRestart: 7,
      allowRestarts: true,
      maxRestarts: 10,
    });
    expect(r.restarts).toBeGreaterThan(0);
    expect(r.snapshots.filter((s) => s.phase === 'restart')).toHaveLength(r.restarts);
    r.snapshots.forEach((s) => expect(s.iterationInRestart).toBeLessThanOrEqual(7));
  });

  it('restarts alone count toward maxTotalSteps (restart + move snapshots share the cap)', () => {
    const r = runSimulation({
      boardSize: 8,
      seed: 1,
      strategy: 'steepest-ascent',
      maxIterationsPerRestart: 7,
      allowRestarts: true,
      maxRestarts: 10,
      maxTotalSteps: 20,
    });
    expect(r.status).toBe('exhausted');
    expect(r.snapshots).toHaveLength(21);
    expect(r.totalSteps).toBe(20);
  });
});

describe('runSimulation — edge cases', () => {
  it('n=1 is trivially solved with a single initial snapshot', () => {
    const r = runSimulation({ boardSize: 1, seed: 1, strategy: 'steepest-ascent' });
    expect(r.status).toBe('solved');
    expect(r.snapshots).toHaveLength(1);
    expect(r.snapshots[0]).toEqual({
      step: 0,
      board: [0],
      conflicts: 0,
      phase: 'initial',
      move: null,
      iterationInRestart: 0,
      restartCount: 0,
      temperature: null,
    });
    expect(r.totalSteps).toBe(0);
  });

  it('an already-solved initialRows board emits only the initial snapshot', () => {
    const r = runSimulation({
      boardSize: 4,
      seed: 1,
      strategy: 'steepest-ascent',
      initialRows: [1, 3, 0, 2],
    });
    expect(r.status).toBe('solved');
    expect(r.snapshots).toHaveLength(1);
    expect(r.totalSteps).toBe(0);
    expect(r.bestConflicts).toBe(0);
    expect(r.bestStep).toBe(0);
  });

  it('honours initialRows over RNG-derived boards', () => {
    const r = runSimulation({
      boardSize: 8,
      seed: 99,
      strategy: 'steepest-ascent',
      initialRows: [0, 4, 7, 5, 2, 6, 1, 3],
    });
    expect(r.status).toBe('solved');
    expect(r.snapshots).toHaveLength(1);
  });

  it('invalid initialRows (wrong length / out-of-range) are rejected', () => {
    expect(() =>
      runSimulation({ boardSize: 4, seed: 1, strategy: 'steepest-ascent', initialRows: [0, 1, 2] }),
    ).toThrow(/length/);
    expect(() =>
      runSimulation({
        boardSize: 4,
        seed: 1,
        strategy: 'steepest-ascent',
        initialRows: [0, 1, 2, 9],
      }),
    ).toThrow(/outside/);
  });
});
