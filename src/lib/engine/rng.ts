/**
 * Deterministic seeded RNG (mulberry32).
 *
 * Same seed ⇒ same stream — this is the ONLY source of randomness in the
 * engine, which is what makes whole runs reproducible and shareable.
 */

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** True with probability `p`. */
  chance(p: number): boolean;
  /** Uniform element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** Fisher–Yates shuffle; returns a NEW array (input untouched). */
  shuffle<T>(items: readonly T[]): T[];
}

/** mulberry32 — tiny, fast, well-distributed 32-bit PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);
  const int = (maxExclusive: number): number => {
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1) {
      throw new RangeError(`rng.int expects a positive integer, got ${maxExclusive}`);
    }
    return Math.floor(next() * maxExclusive);
  };
  return {
    next,
    int,
    chance: (p: number) => next() < p,
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new RangeError('rng.pick expects a non-empty array');
      return items[int(items.length)];
    },
    shuffle: <T>(items: readonly T[]): T[] => {
      const copy = items.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = int(i + 1);
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
      }
      return copy;
    },
  };
}
