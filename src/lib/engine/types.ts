/**
 * Shared types for the pure N-Queens hill-climbing engine.
 *
 * Board representation: `rows[col] = row` — exactly one queen per column;
 * a move relocates a single queen within its own column. Conflicts are
 * counted as attacking queen PAIRS (lower is better, 0 = solved).
 */
import type { ConflictsState } from './conflicts';
import type { Rng } from './rng';

/** UI board-size clamp (the engine itself accepts 1–64). */
export const BOARD_SIZE_LIMITS = { min: 4, max: 16 } as const;

/** Strategy registry ids, in canonical UI order. */
export const STRATEGY_IDS = [
  'steepest-ascent',
  'first-choice',
  'stochastic',
  'min-conflicts',
  'simulated-annealing',
] as const;

export type StrategyId = (typeof STRATEGY_IDS)[number];

/** User-facing config (policy knobs optional; resolved by `resolveConfig`). */
export interface EngineConfigInput {
  boardSize: number;
  seed: number;
  strategy: StrategyId;
  /** Allow plateau (Δ = 0) moves. Default: true. */
  allowSideways?: boolean;
  /** Max consecutive plateau moves before shoulders are refused. Default: 100 (AIMA). */
  maxConsecutiveSideways?: number;
  /** Restart from a fresh random board when stuck. Default: false. */
  allowRestarts?: boolean;
  /** Default: 10. */
  maxRestarts?: number;
  /** Accepted-move budget per restart attempt. Default: 1000. */
  maxIterationsPerRestart?: number;
  /** Hard cap on total emitted steps (moves + restarts) across the whole run. Default: 10000. */
  maxTotalSteps?: number;
  /** SA initial temperature. Default: boardSize. */
  saInitialTemp?: number;
  /** SA geometric cooling factor per proposal, in (0, 1) exclusive. Default: 0.99. */
  saCoolingRate?: number;
  /** SA freezes below this temperature. Default: 0.01. */
  saMinTemp?: number;
  /** Deterministic starting board (mainly for tests / exact demos). */
  initialRows?: number[];
}

/** Fully-resolved engine configuration. */
export interface EngineConfig {
  boardSize: number;
  seed: number;
  strategy: StrategyId;
  allowSideways: boolean;
  maxConsecutiveSideways: number;
  allowRestarts: boolean;
  maxRestarts: number;
  maxIterationsPerRestart: number;
  maxTotalSteps: number;
  saInitialTemp: number;
  saCoolingRate: number;
  saMinTemp: number;
  initialRows?: number[];
}

/** How a snapshot was produced. */
export type SnapshotPhase =
  | 'initial' // seeded start board
  | 'improving' // Δ < 0
  | 'shoulder' // Δ = 0 (plateau traversal)
  | 'worsening' // Δ > 0 (SA uphill acceptance only)
  | 'restart'; // fresh random board after getting stuck

/** The move that produced a snapshot (null for initial/restart). */
export interface MoveDetail {
  column: number;
  fromRow: number;
  toRow: number;
  /** resulting − previous conflict count (<0 improving, 0 shoulder, >0 worsening). */
  deltaConflicts: number;
  /** neighbour evaluations spent producing this move (step-cost metric). */
  evaluatedMoves: number;
}

/** Immutable point-in-time record — the unit of time travel & analytics. */
export interface Snapshot {
  /** Index in the history array (initial = 0). */
  step: number;
  /** Copy of `rows[col] = row` at this point. */
  board: number[];
  conflicts: number;
  phase: SnapshotPhase;
  move: MoveDetail | null;
  /** Accepted moves within the current restart attempt. */
  iterationInRestart: number;
  /** Number of restarts performed before this snapshot. */
  restartCount: number;
  /** SA temperature at acceptance; null for non-SA snapshots. */
  temperature: number | null;
}

/** Terminal state of a run. */
export type RunStatus =
  | 'solved' // 0 conflicts reached
  | 'stagnated' // stuck at a local optimum, no restarts available
  | 'exhausted' // iteration / step budget ran out
  | 'frozen'; // SA only: temperature hit saMinTemp, no restarts available

/** Summary of a full simulation run. */
export interface SimulationResult {
  status: RunStatus;
  solved: boolean;
  config: EngineConfig;
  snapshots: Snapshot[];
  finalBoard: number[];
  finalConflicts: number;
  /** snapshots.length − 1 (the initial board is not a step). */
  totalSteps: number;
  /** Moves applied across all restart attempts. */
  totalIterations: number;
  totalEvaluatedMoves: number;
  restarts: number;
  /** Fewest conflicts ever seen (min, NOT max — fixes the legacy "Best Score" bug). */
  bestConflicts: number;
  /** Step where `bestConflicts` first occurred. */
  bestStep: number;
}

/** A single move chosen by a strategy for the current board. */
export interface MoveSelection {
  column: number;
  toRow: number;
  deltaConflicts: number;
  evaluatedMoves: number;
  /** SA only: temperature at which the move was accepted. */
  temperature?: number;
  /** SA only: post-decay temperature for the next iteration. */
  temperatureAfter?: number;
}

/** Everything a strategy may consult to pick a move. Never mutated by strategies. */
export interface StrategyContext {
  /** Live board view — read-only by contract. */
  board: readonly number[];
  conflicts: ConflictsState;
  rng: Rng;
  config: EngineConfig;
  /** Consecutive shoulder moves so far in this restart attempt. */
  sidewaysStreak: number;
  /** Current SA temperature (ignored by non-SA strategies). */
  temperature: number;
}

/** A hill-climbing variant. Pure: same ctx ⇒ same selection. */
export interface Strategy {
  readonly id: StrategyId;
  /** @returns the chosen move, or null when no acceptable move exists. */
  selectMove(ctx: StrategyContext): MoveSelection | null;
}
