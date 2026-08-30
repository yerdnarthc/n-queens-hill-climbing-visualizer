import { describe, expect, it } from 'vitest';
import { createRng, mulberry32 } from '../rng';

describe('mulberry32', () => {
  it('produces identical sequences for identical seeds', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('emits floats strictly within [0, 1)', () => {
    const next = mulberry32(999);
    for (let i = 0; i < 10000; i++) {
      const v = next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('accepts any uint32 seed (wraps negative/large inputs via >>> 0)', () => {
    expect(() => mulberry32(-1)).not.toThrow();
    expect(() => mulberry32(4294967295)).not.toThrow();
    expect(mulberry32(-1)()).toBe(mulberry32(4294967295)());
  });
});

describe('createRng', () => {
  it('int() stays within [0, maxExclusive) across many draws', () => {
    const rng = createRng(42);
    for (let i = 0; i < 10000; i++) {
      const v = rng.int(16);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(16);
    }
  });

  it('int() rejects invalid ranges', () => {
    const rng = createRng(1);
    expect(() => rng.int(0)).toThrow(RangeError);
    expect(() => rng.int(-3)).toThrow(RangeError);
    expect(() => rng.int(2.5)).toThrow(RangeError);
  });

  it('chance(0) never fires and chance(1) always fires', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('chance(p) fires at a plausible rate', () => {
    const rng = createRng(3);
    let hits = 0;
    for (let i = 0; i < 20000; i++) if (rng.chance(0.25)) hits++;
    expect(hits).toBeGreaterThan(4000); // ~5000 ± noise, generous bounds
    expect(hits).toBeLessThan(6000);
  });

  it('pick() returns a member of the array and rejects empty arrays', () => {
    const rng = createRng(5);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i++) expect(items).toContain(rng.pick(items));
    expect(() => rng.pick([])).toThrow(RangeError);
  });

  it('shuffle() returns a permutation without mutating the input', () => {
    const rng = createRng(11);
    const input = [0, 1, 2, 3, 4, 5, 6, 7];
    const snapshot = input.slice();
    const out = rng.shuffle(input);
    expect(input).toEqual(snapshot); // untouched
    expect(out).not.toBe(input); // new array
    expect(out.slice().sort((a, b) => a - b)).toEqual(snapshot); // permutation
  });

  it('is deterministic for a fixed seed', () => {
    const consume = (seed: number) => {
      const rng = createRng(seed);
      return [
        rng.int(16),
        rng.chance(0.5),
        rng.pick([1, 2, 3]),
        rng.shuffle([1, 2, 3, 4]).join(','),
      ];
    };
    expect(consume(777)).toEqual(consume(777));
    expect(consume(777)).not.toEqual(consume(778));
  });
});
