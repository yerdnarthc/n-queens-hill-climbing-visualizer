/**
 * Simulation orchestrator — the ONLY stateful part of the engine.
 *
 * Runs one complete attempt (with optional restarts) and emits an immutable
 * snapshot per event (initial board, accepted move, restart), forming the
 * time-travel history that Phase 2's store and Phase 4's charts consume.
 *
 * Termination guarantees:
 *   - every accepted move is applied via O(1) `applyMove`
 *   - accepted-move budget per attempt (`maxIterationsPerRestart`)
 *   - total emitted-step budget (`maxTotalSteps`) caps moves + restarts
 *   - restart count capped by `maxRestarts`
 *   - SA's internal proposal loop is finite (geometric cooling)
 *
 * Determinism: the seeded RNG is the sole entropy source, consumed in a
 * fixed order — same seed + same config ⇒ bit-identical snapshot history.
 */
import { createConflicts } from './conflicts';
import { resolveConfig } from './config';
import { createRng } from './rng';
import { getStrategy } from './strategies';
import type {
  EngineConfigInput,
  MoveDetail,
  SimulationResult,
  Snapshot,
  SnapshotPhase,
  StrategyContext,
} from './types';

/** Snapshot bookkeeping shared by move/restart emission. */
interface RunState {
  snapshots: Snapshot[];
  totalIterations: number;
  totalEvaluatedMoves: number;
  restartCount: number;
  iterationsInRestart: number;
  sidewaysStreak: number;
  temperature: number;
  bestConflicts: number;
  bestStep: number;
}

export function runSimulation(input: EngineConfigInput): SimulationResult {
  const config = resolveConfig(input);
  const rng = createRng(config.seed);
  const n = config.boardSize;

  // Initial board: caller-provided (tests/demos) or one uniform random row per column.
  const rows = config.initialRows
    ? config.initialRows.slice()
    : Array.from({ length: n }, () => rng.int(n));

  const conflicts = createConflicts(rows);
  const strategy = getStrategy(config.strategy);
  const isSa = config.strategy === 'simulated-annealing';

  const state: RunState = {
    snapshots: [],
    totalIterations: 0,
    totalEvaluatedMoves: 0,
    restartCount: 0,
    iterationsInRestart: 0,
    sidewaysStreak: 0,
    temperature: config.saInitialTemp,
    bestConflicts: conflicts.getTotal(),
    bestStep: 0,
  };

  const pushSnapshot = (
    phase: SnapshotPhase,
    move: MoveDetail | null,
    temperature: number | null,
  ): void => {
    const total = conflicts.getTotal();
    state.snapshots.push({
      step: state.snapshots.length,
      board: conflicts.getRows().slice(),
      conflicts: total,
      phase,
      move,
      iterationInRestart: state.iterationsInRestart,
      restartCount: state.restartCount,
      temperature,
    });
    if (total < state.bestConflicts) {
      state.bestConflicts = total;
      state.bestStep = state.snapshots.length - 1;
    }
  };

  const restart = (): boolean => {
    if (!config.allowRestarts || state.restartCount >= config.maxRestarts) return false;
    state.restartCount++;
    state.iterationsInRestart = 0;
    state.sidewaysStreak = 0;
    state.temperature = config.saInitialTemp;
    for (let col = 0; col < n; col++) {
      // Fresh uniform-random board from the shared stream (keeps determinism).
      conflicts.applyMove(col, rng.int(n));
    }
    pushSnapshot('restart', null, isSa ? config.saInitialTemp : null);
    return true;
  };

  pushSnapshot('initial', null, isSa ? config.saInitialTemp : null);

  let status: SimulationResult['status'] = 'exhausted';

  for (;;) {
    if (conflicts.getTotal() === 0) {
      status = 'solved';
      break;
    }
    if (state.snapshots.length - 1 >= config.maxTotalSteps) {
      status = 'exhausted';
      break;
    }
    if (state.iterationsInRestart >= config.maxIterationsPerRestart) {
      if (restart()) continue;
      status = 'exhausted';
      break;
    }

    const selection = strategy.selectMove({
      board: conflicts.getRows(),
      conflicts,
      rng,
      config,
      sidewaysStreak: state.sidewaysStreak,
      temperature: state.temperature,
    });

    if (selection === null) {
      // SA returns null only when frozen below saMinTemp.
      if (!restart()) {
        status = isSa ? 'frozen' : 'stagnated';
        break;
      }
      continue;
    }

    const fromRow = conflicts.getRows()[selection.column];
    const before = conflicts.getTotal();
    const after = conflicts.applyMove(selection.column, selection.toRow);
    const actualDelta = after - before;
    if (actualDelta !== selection.deltaConflicts) {
      throw new Error(
        `evaluator inconsistency: strategy predicted Δ=${selection.deltaConflicts}, ` +
          `applyMove produced Δ=${actualDelta}`,
      );
    }

    state.totalIterations++;
    state.iterationsInRestart++;
    state.totalEvaluatedMoves += selection.evaluatedMoves;

    const phase: SnapshotPhase =
      actualDelta < 0 ? 'improving' : actualDelta === 0 ? 'shoulder' : 'worsening';

    // Sideways streak: SA is exempt (temperature governs its exploration);
    // for the other variants an improving move resets the plateau counter.
    if (!isSa) {
      state.sidewaysStreak = actualDelta === 0 ? state.sidewaysStreak + 1 : 0;
    }
    if (isSa && selection.temperatureAfter !== undefined) {
      state.temperature = selection.temperatureAfter;
    }

    pushSnapshot(
      phase,
      {
        column: selection.column,
        fromRow,
        toRow: selection.toRow,
        deltaConflicts: actualDelta,
        evaluatedMoves: selection.evaluatedMoves,
      },
      selection.temperature ?? (isSa ? state.temperature : null),
    );
  }

  const snapshots = state.snapshots;
  const last = snapshots[snapshots.length - 1];
  return {
    status,
    solved: last.conflicts === 0,
    config,
    snapshots,
    finalBoard: last.board.slice(),
    finalConflicts: last.conflicts,
    totalSteps: snapshots.length - 1,
    totalIterations: state.totalIterations,
    totalEvaluatedMoves: state.totalEvaluatedMoves,
    restarts: state.restartCount,
    bestConflicts: state.bestConflicts,
    bestStep: state.bestStep,
  };
}
