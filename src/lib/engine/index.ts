/**
 * N-Queens hill-climbing engine — public API.
 *
 * Pure, deterministic, zero React/framework imports.
 * Same seed + same config ⇒ identical run (snapshots included).
 */
export { BOARD_SIZE_LIMITS, STRATEGY_IDS } from './types';
export type {
  EngineConfig,
  EngineConfigInput,
  MoveDetail,
  MoveSelection,
  RunStatus,
  SimulationResult,
  Snapshot,
  SnapshotPhase,
  Strategy,
  StrategyContext,
  StrategyId,
} from './types';

export { EngineConfigError, resolveConfig } from './config';
export { countConflictsBruteForce, createConflicts } from './conflicts';
export type { ConflictsState } from './conflicts';
export { createRng, mulberry32 } from './rng';
export type { Rng } from './rng';
export { runSimulation } from './simulation';
export { STRATEGIES, getStrategy } from './strategies';
