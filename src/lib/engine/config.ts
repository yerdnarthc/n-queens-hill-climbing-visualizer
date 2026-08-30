/**
 * Engine configuration: defaults + validation.
 *
 * All policy knobs are optional in `EngineConfigInput` and resolved here so
 * the rest of the engine can rely on fully-concrete numbers.
 */
import { STRATEGY_IDS, type EngineConfig, type EngineConfigInput } from './types';

export class EngineConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineConfigError';
  }
}

/** Fills in defaults and validates every field. Throws `EngineConfigError`. */
export function resolveConfig(input: EngineConfigInput): EngineConfig {
  const { boardSize, seed, strategy } = input;

  if (!Number.isInteger(boardSize) || boardSize < 1 || boardSize > 64) {
    throw new EngineConfigError(`boardSize must be an integer in [1, 64], got ${boardSize}`);
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
    throw new EngineConfigError(`seed must be an integer in [0, 2^32), got ${seed}`);
  }
  if (!STRATEGY_IDS.includes(strategy)) {
    throw new EngineConfigError(`unknown strategy "${strategy}"`);
  }
  for (const key of ['allowSideways', 'allowRestarts'] as const) {
    const value = input[key];
    if (value !== undefined && typeof value !== 'boolean') {
      throw new EngineConfigError(`${key} must be a boolean, got ${String(value)}`);
    }
  }

  const config: EngineConfig = {
    boardSize,
    seed,
    strategy,
    allowSideways: input.allowSideways ?? true,
    maxConsecutiveSideways: input.maxConsecutiveSideways ?? 100,
    allowRestarts: input.allowRestarts ?? false,
    maxRestarts: input.maxRestarts ?? 10,
    maxIterationsPerRestart: input.maxIterationsPerRestart ?? 1000,
    maxTotalSteps: input.maxTotalSteps ?? 10000,
    saInitialTemp: input.saInitialTemp ?? boardSize,
    saCoolingRate: input.saCoolingRate ?? 0.99,
    saMinTemp: input.saMinTemp ?? 0.01,
  };

  const assertInt = (value: number, min: number, name: string): void => {
    if (!Number.isInteger(value) || value < min) {
      throw new EngineConfigError(`${name} must be an integer ≥ ${min}, got ${value}`);
    }
  };
  assertInt(config.maxConsecutiveSideways, 0, 'maxConsecutiveSideways');
  assertInt(config.maxRestarts, 0, 'maxRestarts');
  assertInt(config.maxIterationsPerRestart, 0, 'maxIterationsPerRestart');
  assertInt(config.maxTotalSteps, 0, 'maxTotalSteps');

  if (!Number.isFinite(config.saInitialTemp) || config.saInitialTemp <= 0) {
    throw new EngineConfigError(`saInitialTemp must be > 0, got ${config.saInitialTemp}`);
  }
  if (config.saCoolingRate <= 0 || config.saCoolingRate >= 1) {
    throw new EngineConfigError(
      `saCoolingRate must be in (0, 1) exclusive, got ${config.saCoolingRate}`,
    );
  }
  if (!Number.isFinite(config.saMinTemp) || config.saMinTemp <= 0) {
    // A floor of 0 would never freeze (t *= cooling underflows to exactly 0 → 0 >= 0 loops forever).
    throw new EngineConfigError(`saMinTemp must be > 0, got ${config.saMinTemp}`);
  }

  if (input.initialRows !== undefined) {
    if (input.initialRows.length !== boardSize) {
      throw new EngineConfigError(
        `initialRows length ${input.initialRows.length} does not match boardSize ${boardSize}`,
      );
    }
    input.initialRows.forEach((row, i) => {
      if (!Number.isInteger(row) || row < 0 || row >= boardSize) {
        throw new EngineConfigError(`initialRows[${i}] = ${row} is outside [0, ${boardSize})`);
      }
    });
    config.initialRows = input.initialRows.slice();
  }

  return config;
}
