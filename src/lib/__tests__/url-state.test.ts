import { describe, expect, it } from 'vitest';
import {
  clampCooling,
  configToUrlValues,
  parseConfigFromSearch,
  sameUrlConfig,
  sameUrlValues,
  serializeConfigToSearch,
} from '../url-state';
import { DEFAULT_CONFIG } from '@/store/simulation-store';
import type { SimulationConfig } from '@/store/simulation-store';

/** Fully-populated config (all policy knobs non-default) for round-trip tests. */
const FULL_CONFIG: SimulationConfig = {
  boardSize: 12,
  seed: 42,
  strategy: 'min-conflicts',
  allowSideways: false,
  maxConsecutiveSideways: 50,
  allowRestarts: true,
  maxRestarts: 5,
  saCoolingRate: 0.95,
};

describe('url-state — serializer', () => {
  it('serializes a non-default config into every param', () => {
    expect(serializeConfigToSearch(FULL_CONFIG)).toBe(
      'n=12&seed=42&strategy=min-conflicts&sideways=false&streak=50&restarts=true&maxRestarts=5&cooling=0.95',
    );
  });

  it('omits every param that equals its default (clearOnDefault → short URLs)', () => {
    expect(serializeConfigToSearch(DEFAULT_CONFIG)).toBe('');
  });

  it('only emits the params that deviate from defaults', () => {
    expect(serializeConfigToSearch({ ...DEFAULT_CONFIG, seed: 7 })).toBe('seed=7');
    expect(serializeConfigToSearch({ ...DEFAULT_CONFIG, strategy: 'simulated-annealing' })).toBe(
      'strategy=simulated-annealing',
    );
  });
});

describe('url-state — parser (total, never throws)', () => {
  it('returns the full default config for an empty query string', () => {
    expect(parseConfigFromSearch('')).toEqual({
      boardSize: 8,
      seed: 27,
      strategy: 'steepest-ascent',
      allowSideways: true,
      maxConsecutiveSideways: 100,
      allowRestarts: false,
      maxRestarts: 10,
      saCoolingRate: 0.99,
    });
  });

  it('round-trips a non-default config exactly', () => {
    const search = serializeConfigToSearch(FULL_CONFIG);
    expect(parseConfigFromSearch(search)).toEqual(FULL_CONFIG);
  });

  it('clamps out-of-range values into the UI domain', () => {
    const cfg = parseConfigFromSearch(
      '?n=99&seed=-5&strategy=not-a-strategy&streak=-3&maxRestarts=999&cooling=5',
    );
    expect(cfg.boardSize).toBe(16); // UI clamp 4–16
    expect(cfg.seed).toBe(0); // uint32 domain
    expect(cfg.strategy).toBe('steepest-ascent'); // unknown enum → default
    expect(cfg.maxConsecutiveSideways).toBe(1);
    expect(cfg.maxRestarts).toBe(50);
    expect(cfg.saCoolingRate).toBe(0.999); // engine throws on cooling ≥ 1 — must clamp
  });

  it('falls back to defaults for malformed values instead of throwing', () => {
    const cfg = parseConfigFromSearch('?n=abc&seed=3.7&strategy=&cooling=notanumber');
    expect(cfg.boardSize).toBe(8);
    expect(cfg.seed).toBe(3); // nuqs' integer parser truncates decimals — still valid uint32
    expect(cfg.strategy).toBe('steepest-ascent');
    expect(cfg.saCoolingRate).toBe(0.99);
  });

  it('parses a leading "?" and bare search strings identically', () => {
    expect(parseConfigFromSearch('?seed=5')).toEqual(parseConfigFromSearch('seed=5'));
  });
});

describe('url-state — helpers', () => {
  it('clampCooling clamps into the UI slider domain and rounds to 3 decimals', () => {
    expect(clampCooling(0.9856)).toBe(0.986);
    expect(clampCooling(0.5)).toBe(0.8);
    expect(clampCooling(2)).toBe(0.999);
    expect(clampCooling(Number.NaN)).toBe(0.99);
  });

  it('sameUrlConfig treats missing policy knobs as their defaults', () => {
    expect(sameUrlConfig(DEFAULT_CONFIG, { ...DEFAULT_CONFIG })).toBe(true);
    expect(sameUrlConfig(DEFAULT_CONFIG, { ...DEFAULT_CONFIG, seed: 1 })).toBe(false);
    expect(
      sameUrlConfig(
        { ...DEFAULT_CONFIG, allowSideways: true },
        { ...DEFAULT_CONFIG, allowSideways: false },
      ),
    ).toBe(false);
  });

  it('sameUrlValues compares raw URL value records field-by-field', () => {
    const values = configToUrlValues(FULL_CONFIG);
    expect(sameUrlValues(values, { ...values })).toBe(true);
    expect(sameUrlValues(values, { ...values, n: 16 })).toBe(false);
    expect(sameUrlValues(values, { ...values, cooling: 0.951 })).toBe(false);
    expect(sameUrlValues(values, { ...values, strategy: 'steepest-ascent' })).toBe(false);
  });
});
