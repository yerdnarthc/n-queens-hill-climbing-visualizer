import { describe, expect, it } from 'vitest';
import { EngineConfigError, resolveConfig } from '../config';
import type { EngineConfigInput } from '../types';

const base = { boardSize: 8, seed: 1, strategy: 'steepest-ascent' } as const;

describe('resolveConfig', () => {
  it('fills in the documented defaults', () => {
    const c = resolveConfig(base);
    expect(c).toMatchObject({
      boardSize: 8,
      seed: 1,
      strategy: 'steepest-ascent',
      allowSideways: true,
      maxConsecutiveSideways: 100,
      allowRestarts: false,
      maxRestarts: 10,
      maxIterationsPerRestart: 1000,
      maxTotalSteps: 10000,
      saInitialTemp: 8, // defaults to boardSize
      saCoolingRate: 0.99,
      saMinTemp: 0.01,
    });
    expect(c.initialRows).toBeUndefined();
  });

  it('honours explicit overrides', () => {
    const c = resolveConfig({
      ...base,
      allowSideways: false,
      maxConsecutiveSideways: 5,
      allowRestarts: true,
      maxRestarts: 2,
      maxTotalSteps: 500,
      saInitialTemp: 20,
      saCoolingRate: 0.95,
      saMinTemp: 0.5,
      initialRows: [0, 4, 7, 5, 2, 6, 1, 3],
    });
    expect(c.allowSideways).toBe(false);
    expect(c.maxConsecutiveSideways).toBe(5);
    expect(c.allowRestarts).toBe(true);
    expect(c.maxRestarts).toBe(2);
    expect(c.maxTotalSteps).toBe(500);
    expect(c.saInitialTemp).toBe(20);
    expect(c.saCoolingRate).toBe(0.95);
    expect(c.saMinTemp).toBe(0.5);
    expect(c.initialRows).toEqual([0, 4, 7, 5, 2, 6, 1, 3]);
  });

  it('copies initialRows so later external mutation cannot leak in', () => {
    const rows = [1, 2, 0, 3];
    const c = resolveConfig({ ...base, boardSize: 4, initialRows: rows });
    rows[0] = 99;
    expect(c.initialRows).toEqual([1, 2, 0, 3]);
  });

  it('rejects invalid core fields', () => {
    // Cast: several entries are intentionally type-invalid at runtime.
    const bad = [
      { ...base, boardSize: 0 },
      { ...base, boardSize: 65 },
      { ...base, boardSize: 4.5 },
      { ...base, seed: -1 },
      { ...base, seed: 4294967296 },
      { ...base, seed: 1.5 },
      { ...base, strategy: 'bogus' },
    ] as unknown as EngineConfigInput[];
    for (const input of bad) {
      expect(() => resolveConfig(input)).toThrow(EngineConfigError);
    }
  });

  it('rejects invalid policy knobs', () => {
    const bad = [
      { ...base, maxConsecutiveSideways: -1 },
      { ...base, maxConsecutiveSideways: 1.5 },
      { ...base, maxRestarts: -2 },
      { ...base, maxIterationsPerRestart: 0.5 },
      { ...base, maxTotalSteps: -5 },
      { ...base, allowSideways: 'yes' },
      { ...base, allowRestarts: 1 },
      { ...base, saInitialTemp: 0 },
      { ...base, saCoolingRate: 0 },
      { ...base, saCoolingRate: 1 },
      { ...base, saMinTemp: 0 }, // 0 floor would loop forever under geometric cooling
    ] as unknown as EngineConfigInput[];
    for (const input of bad) {
      expect(() => resolveConfig(input)).toThrow(EngineConfigError);
    }
  });

  it('rejects malformed initialRows', () => {
    expect(() => resolveConfig({ ...base, boardSize: 4, initialRows: [0, 1] })).toThrow(
      EngineConfigError,
    );
    expect(() => resolveConfig({ ...base, boardSize: 4, initialRows: [0, 1, 9, 3] })).toThrow(
      EngineConfigError,
    );
    expect(() => resolveConfig({ ...base, boardSize: 4, initialRows: [0, 1, -1, 3] })).toThrow(
      EngineConfigError,
    );
    expect(() => resolveConfig({ ...base, boardSize: 4, initialRows: [0, 1, 0.5, 3] })).toThrow(
      EngineConfigError,
    );
  });
});
