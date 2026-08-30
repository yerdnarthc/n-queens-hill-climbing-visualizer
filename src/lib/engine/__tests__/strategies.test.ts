import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../config';
import { createConflicts } from '../conflicts';
import { createRng } from '../rng';
import type { Rng } from '../rng';
import { firstChoiceStrategy } from '../strategies/first-choice';
import { minConflictsStrategy } from '../strategies/min-conflicts';
import { simulatedAnnealingStrategy } from '../strategies/simulated-annealing';
import { steepestAscentStrategy } from '../strategies/steepest-ascent';
import { stochasticStrategy } from '../strategies/stochastic';
import type { EngineConfigInput, StrategyContext } from '../types';

/**
 * Deterministic fake RNG — returns scripted values in order so strategy
 * tests assert exact choices without depending on mulberry32 streams.
 * `shuffle` is called with a marker; a missing marker reuses identity order.
 */
function fakeRng(script: Array<number | 'shuffle'>): Rng & { calls: string[] } {
  const calls: string[] = [];
  const rng: Rng = {
    next: () => {
      calls.push('next');
      const v = script.shift();
      return typeof v === 'number' ? v : 0;
    },
    int: (max) => {
      calls.push(`int:${max}`);
      const v = script.shift();
      if (typeof v !== 'number') throw new Error(`fakeRng ran out of script at int(${max})`);
      if (v < 0 || v >= max) throw new Error(`scripted value ${v} out of range for int(${max})`);
      return v;
    },
    chance: (p) => {
      calls.push(`chance:${p}`);
      const v = script.shift();
      if (typeof v !== 'number') throw new Error(`fakeRng ran out of script at chance(${p})`);
      return v < p;
    },
    pick: (items) => {
      calls.push('pick');
      const v = script.shift();
      if (typeof v !== 'number' || v < 0 || v >= items.length) {
        throw new Error(`fakeRng: scripted pick index ${String(v)} out of range`);
      }
      return items[v]!;
    },
    shuffle: (items) => {
      calls.push('shuffle');
      const v = script.shift();
      if (v !== 'shuffle' && typeof v === 'number') script.unshift(v);
      return items.slice(); // identity order (script-driven determinism)
    },
  };
  return Object.assign(rng, { calls });
}

const config = (overrides: Partial<EngineConfigInput> = {}) =>
  resolveConfig({ boardSize: 4, seed: 1, strategy: 'steepest-ascent', ...overrides });

const ctx = (
  rows: number[],
  cfg = config(),
  rng: Rng = fakeRng([]),
  extras: Partial<StrategyContext> = {},
): StrategyContext => ({
  board: rows,
  conflicts: createConflicts(rows),
  rng,
  config: cfg,
  sidewaysStreak: 0,
  temperature: cfg.saInitialTemp,
  ...extras,
});

/**
 * VERIFIED FIXTURES (machine-checked via the brute-force oracle):
 *   SHOULDER [1,2,0,3]: total=1; all 12 neighbors Δ≥0; UNIQUE shoulder c1→r3.
 *   FOLLOWUP [1,3,0,3]: total=1; UNIQUE improving c3→r2 (Δ−1); shoulders c1→r2, c3→r0.
 */
const SHOULDER = [1, 2, 0, 3];
const FOLLOWUP = [1, 3, 0, 3];
const SOLVED4 = [1, 3, 0, 2];

describe('steepest-ascent', () => {
  it('takes the unique best move: improving over shoulder when both exist', () => {
    const sel = steepestAscentStrategy.selectMove(ctx(FOLLOWUP));
    expect(sel).toEqual({ column: 3, toRow: 2, deltaConflicts: -1, evaluatedMoves: 12 });
  });

  it('falls back to the unique shoulder move when no improvement exists', () => {
    const sel = steepestAscentStrategy.selectMove(ctx(SHOULDER));
    expect(sel).toEqual({ column: 1, toRow: 3, deltaConflicts: 0, evaluatedMoves: 12 });
  });

  it('refuses the shoulder and stagnates when sideways is disabled', () => {
    expect(
      steepestAscentStrategy.selectMove(ctx(SHOULDER, config({ allowSideways: false }))),
    ).toBeNull();
  });

  it('refuses shoulders once the consecutive-sideways budget is spent', () => {
    const sel = steepestAscentStrategy.selectMove(
      ctx(SHOULDER, config({ maxConsecutiveSideways: 3 }), fakeRng([]), { sidewaysStreak: 3 }),
    );
    expect(sel).toBeNull();
  });

  it('accepts shoulders while the streak budget remains', () => {
    const sel = steepestAscentStrategy.selectMove(
      ctx(SHOULDER, config({ maxConsecutiveSideways: 4 }), fakeRng([]), { sidewaysStreak: 3 }),
    );
    expect(sel).not.toBeNull();
    expect(sel!.deltaConflicts).toBe(0);
  });

  it('returns null on a solved board (only Δ>0 neighbors)', () => {
    expect(steepestAscentStrategy.selectMove(ctx(SOLVED4))).toBeNull();
  });

  it('is a pure function of the board — zero RNG draws, deterministic ties', () => {
    const rng = fakeRng([]);
    const a = steepestAscentStrategy.selectMove(ctx(FOLLOWUP, config(), rng));
    expect(rng.calls).toEqual([]);
    const b = steepestAscentStrategy.selectMove(ctx(FOLLOWUP));
    expect(a).toEqual(b);
  });

  it('evaluates exactly n×(n−1) neighbors', () => {
    const sel = steepestAscentStrategy.selectMove(ctx(SHOULDER));
    expect(sel!.evaluatedMoves).toBe(12);
  });
});

describe('first-choice', () => {
  it('takes the first acceptable neighbour in scripted order (identity shuffles)', () => {
    // SHOULDER scan with identity orders: col0 rows 0,2,3 → Δ +1,+1,+1 all
    // refused; col1 rows 0(+1),1(+2),3(0·shoulder) → accepted at Δ0.
    // 4 shuffles consumed: one column order + one row order per visited column.
    const rng = fakeRng(['shuffle', 'shuffle', 'shuffle', 'shuffle']);
    const sel = firstChoiceStrategy.selectMove(ctx(SHOULDER, config(), rng));
    expect(sel).toEqual({ column: 1, toRow: 3, deltaConflicts: 0, evaluatedMoves: 6 });
  });

  it('skips shoulders when sideways is disabled, continues scanning, and stagnates when nothing improves', () => {
    // SHOULDER has NO improving neighbor at all → full scan, no acceptance.
    const rng = fakeRng(Array(8).fill('shuffle'));
    expect(
      firstChoiceStrategy.selectMove(ctx(SHOULDER, config({ allowSideways: false }), rng)),
    ).toBeNull();
  });

  it('skips shoulders when sideways is disabled and keeps scanning to the improvement', () => {
    // FOLLOWUP with identity orders, sideways OFF: col0, col1 (shoulder refused),
    // col2 all refused, col3 rows 0(Δ0 refused),1(+2 refused),2(−1 accept) → 12 evals.
    const rng = fakeRng(Array(8).fill('shuffle'));
    const sel = firstChoiceStrategy.selectMove(
      ctx(FOLLOWUP, config({ allowSideways: false }), rng),
    );
    expect(sel).toEqual({ column: 3, toRow: 2, deltaConflicts: -1, evaluatedMoves: 12 });
  });

  it('honours the consecutive-sideways budget (budget spent → keeps scanning for improvements only)', () => {
    // SHOULDER with sideways budget exhausted → no improving move → null.
    const rng = fakeRng(Array(8).fill('shuffle'));
    const sel = firstChoiceStrategy.selectMove(
      ctx(SHOULDER, config({ maxConsecutiveSideways: 2 }), rng, { sidewaysStreak: 2 }),
    );
    expect(sel).toBeNull();
  });
});

describe('stochastic', () => {
  it('picks among moves tied at the minimum level (here the unique shoulder)', () => {
    const sel = stochasticStrategy.selectMove(ctx(SHOULDER, config(), fakeRng([0])));
    expect(sel).toEqual({ column: 1, toRow: 3, deltaConflicts: 0, evaluatedMoves: 12 });
  });

  it('picks the unique improving move when one exists', () => {
    const sel = stochasticStrategy.selectMove(ctx(FOLLOWUP, config(), fakeRng([0])));
    expect(sel).toEqual({ column: 3, toRow: 2, deltaConflicts: -1, evaluatedMoves: 12 });
  });

  it('refuses everything when sideways is off and only shoulders exist', () => {
    expect(
      stochasticStrategy.selectMove(ctx(SHOULDER, config({ allowSideways: false }), fakeRng([0]))),
    ).toBeNull();
  });

  it('respects the consecutive-sideways budget', () => {
    const sel = stochasticStrategy.selectMove(
      ctx(SHOULDER, config({ maxConsecutiveSideways: 2 }), fakeRng([0]), { sidewaysStreak: 2 }),
    );
    expect(sel).toBeNull();
  });

  it('always lands inside the minimum-level tie set across many rng draws', () => {
    // FOLLOWUP: min level Δ−1 is achieved uniquely (c3→r2), so every draw picks it.
    const rng = createRng(42);
    for (let i = 0; i < 50; i++) {
      const sel = stochasticStrategy.selectMove(ctx(FOLLOWUP, config(), rng));
      expect(sel).toEqual({ column: 3, toRow: 2, deltaConflicts: -1, evaluatedMoves: 12 });
    }
  });

  it('consumes exactly one rng draw — the uniform pick among tied minimum moves', () => {
    const rng = fakeRng([0]);
    stochasticStrategy.selectMove(ctx(SHOULDER, config(), rng));
    expect(rng.calls).toEqual(['pick']);
  });
});

describe('min-conflicts', () => {
  it('moves the chosen conflicted queen to its best row (unique improving)', () => {
    // FOLLOWUP conflicted columns {c1,c3}; script picks index 1 → c3, best row 2 (Δ−1).
    const sel = minConflictsStrategy.selectMove(ctx(FOLLOWUP, config(), fakeRng([1, 0])));
    expect(sel).toEqual({ column: 3, toRow: 2, deltaConflicts: -1, evaluatedMoves: 3 });
  });

  it('takes a shoulder within the column when that is the column-best', () => {
    // FOLLOWUP script picks index 0 → c1; best row for c1 is r2 (Δ0).
    const sel = minConflictsStrategy.selectMove(ctx(FOLLOWUP, config(), fakeRng([0, 0])));
    expect(sel).toEqual({ column: 1, toRow: 2, deltaConflicts: 0, evaluatedMoves: 3 });
  });

  it('may find no acceptable move for the chosen queen while another queen has one (inherent scope)', () => {
    // SHOULDER conflicted {c0,c1}; c0's best is Δ+1 → null, even though c1 has a shoulder.
    const sel = minConflictsStrategy.selectMove(ctx(SHOULDER, config(), fakeRng([0])));
    expect(sel).toBeNull();
  });

  it('refuses shoulders for the chosen queen when sideways is disabled', () => {
    // SHOULDER pick index 1 → c1, best Δ0 refused.
    const sel = minConflictsStrategy.selectMove(
      ctx(SHOULDER, config({ allowSideways: false }), fakeRng([1, 0])),
    );
    expect(sel).toBeNull();
  });

  it('never selects a non-conflicted column', () => {
    // FOLLOWUP conflicted {c1,c3}: script both indices; both must be in the set.
    const s0 = minConflictsStrategy.selectMove(ctx(FOLLOWUP, config(), fakeRng([0, 0])));
    const s1 = minConflictsStrategy.selectMove(ctx(FOLLOWUP, config(), fakeRng([1, 0])));
    expect([1, 3]).toContain(s0!.column);
    expect([1, 3]).toContain(s1!.column);
  });

  it('returns null on a solved board (no conflicted columns)', () => {
    expect(minConflictsStrategy.selectMove(ctx(SOLVED4, config(), fakeRng([0])))).toBeNull();
  });
});

describe('simulated-annealing', () => {
  const saCfg = () =>
    config({
      strategy: 'simulated-annealing',
      saInitialTemp: 10,
      saCoolingRate: 0.9,
      saMinTemp: 0.5,
    });

  it('accepts improving proposals without an acceptance draw', () => {
    const rng = fakeRng([3, 2]); // col 3, offset 2 → row 2 (Δ−1)
    const sel = simulatedAnnealingStrategy.selectMove(ctx(FOLLOWUP, saCfg(), rng));
    expect(sel).toMatchObject({
      column: 3,
      toRow: 2,
      deltaConflicts: -1,
      evaluatedMoves: 1,
      temperature: 10,
      temperatureAfter: 9,
    });
    expect(rng.calls).toEqual(['int:4', 'int:3']); // no chance() for Δ<0
  });

  it('accepts plateau proposals per the sideways toggle', () => {
    const on = simulatedAnnealingStrategy.selectMove(ctx(FOLLOWUP, saCfg(), fakeRng([3, 0])));
    expect(on).toMatchObject({ column: 3, toRow: 0, deltaConflicts: 0 });
    // OFF: every Δ0 proposal is refused with NO chance() draw, so the strategy
    // re-proposes the same move until T = 10·0.9^k decays below 0.5 ⇒ frozen.
    const script: Array<number | 'shuffle'> = [];
    for (let k = 0; k < 29; k++) script.push(3, 0); // (col 3, row offset 0 → row 0, Δ0)
    const off = simulatedAnnealingStrategy.selectMove(
      ctx(FOLLOWUP, { ...saCfg(), allowSideways: false }, fakeRng(script)),
    );
    expect(off).toBeNull();
  });

  it('accepts worsening proposals by the Metropolis rule e^(−Δ/T)', () => {
    const rng = fakeRng([1, 0, 0.5]); // col 1 → row 0, Δ+1; e^(−1/10) ≈ 0.8187 ≥ 0.5 → accept
    const sel = simulatedAnnealingStrategy.selectMove(ctx(FOLLOWUP, saCfg(), rng));
    expect(sel).toMatchObject({ column: 1, toRow: 0, deltaConflicts: 1 });
    expect(rng.calls[2]).toBe(`chance:${Math.exp(-1 / 10)}`);
  });

  it('rejects worsening proposals that lose the Metropolis coin and keeps cooling until freeze', () => {
    // 29 proposals of c1→r0 (Δ+1), each with scripted chance 0.99 ≥ e^(−1/T) → all
    // rejected; T=10·0.9^k ≥ 0.5 holds through k=28 → frozen at the 29th proposal.
    const script: Array<number | 'shuffle'> = [];
    for (let k = 0; k < 29; k++) script.push(1, 0, 0.99);
    const rng = fakeRng(script);
    const sel = simulatedAnnealingStrategy.selectMove(ctx(FOLLOWUP, saCfg(), rng));
    expect(sel).toBeNull();
    expect(rng.calls.filter((c) => c.startsWith('chance')).length).toBe(29);
  });

  it('counts every proposal in evaluatedMoves, including rejected ones', () => {
    const rng = fakeRng([1, 0, 0.99, 3, 2]); // reject Δ+1, then accept Δ−1
    const sel = simulatedAnnealingStrategy.selectMove(ctx(FOLLOWUP, saCfg(), rng));
    expect(sel!.evaluatedMoves).toBe(2);
    expect(sel!.temperature).toBeCloseTo(9, 10); // T had decayed once before acceptance
    expect(sel!.temperatureAfter).toBeCloseTo(8.1, 10);
  });

  it('never proposes staying in place (toRow ≠ current row for every proposal)', () => {
    const rng = createRng(42);
    let board = FOLLOWUP;
    const cfg = saCfg();
    for (let i = 0; i < 500; i++) {
      const c = createConflicts(board);
      const sel = simulatedAnnealingStrategy.selectMove(
        ctx(board, cfg, rng, { temperature: cfg.saInitialTemp }),
      );
      if (sel === null) break; // frozen
      expect(sel.toRow).not.toBe(board[sel.column]);
      c.applyMove(sel.column, sel.toRow);
      board = c.getRows().slice();
      if (c.getTotal() === 0) break;
    }
  });
});
