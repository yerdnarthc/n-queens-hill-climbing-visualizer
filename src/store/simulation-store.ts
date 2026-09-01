/**
 * Simulation store — the visualizer's state container (Phase 2).
 *
 * Architecture — "precompute-then-time-travel" (docs/DECISIONS.md D-017):
 * `runSimulation` is a pure BATCH function that returns the entire immutable
 * snapshot history in one call, so the store never steps the engine during
 * playback. It runs the engine once per config change and keeps the finished
 * `SimulationResult`; playback is just an integer cursor (`currentStep`)
 * moving through the history. Stepping is O(1), scrubbing is free, and the
 * Phase 4 charts get the full series up front.
 *
 * React-free by design: this module exports a vanilla-Zustand FACTORY
 * (`createSimulationStore`) so headless tests and non-React code create
 * isolated instances (D-018). The app singleton + React binding live in
 * `./index.ts`.
 *
 * Playback semantics (locked 2026-08-31):
 *   - any config change auto-reruns immediately (new result, cursor → 0)
 *   - reruns PRESERVE `isPlaying` — the new run keeps playing from step 0
 *   - `play()` at the end (or without a result) restarts from step 0
 *   - `stepForward()` at the end pauses — the single "run finished" signal
 */
import { createStore } from 'zustand/vanilla';
import {
  BOARD_SIZE_LIMITS,
  runSimulation,
  type EngineConfigInput,
  type SimulationResult,
  type Snapshot,
} from '@/lib/engine';

/** UI-facing config = engine input minus `initialRows` (a test/demo-only knob). */
export type SimulationConfig = Omit<EngineConfigInput, 'initialRows'>;

/** Seed domain: mulberry32 takes [0, 2^32). */
const MAX_SEED = 4294967295;

/** Playback speed bounds, in steps per second. */
export const SPEED_LIMITS = { min: 0.5, max: 30 } as const;

/** Default playback speed, in steps per second. */
export const DEFAULT_SPEED = 2;

/**
 * Machine-curated first impression (seed scan 2026-08-31): N=8 steepest-ascent
 * solves in 5 steps — 4 improving + 1 shoulder — from an initial board with 6
 * conflict pairs. Compact enough to follow, varied enough to be interesting.
 */
export const DEFAULT_CONFIG: SimulationConfig = {
  boardSize: 8,
  seed: 27,
  strategy: 'steepest-ascent',
};

/**
 * Clamp with NaN → fallback. ±Infinity clamp to their natural bound (so e.g.
 * a `Number.POSITIVE_INFINITY` board size yields max, not the default).
 */
const clamp = (value: number, min: number, max: number, fallback: number): number =>
  Number.isNaN(value) ? fallback : Math.min(max, Math.max(min, value));

/** UI board clamp (D-011): the engine accepts 1–64, the UI shows 4–16. */
export function clampBoardSize(boardSize: number): number {
  return Math.round(
    clamp(boardSize, BOARD_SIZE_LIMITS.min, BOARD_SIZE_LIMITS.max, DEFAULT_CONFIG.boardSize),
  );
}

/** Seed clamp into mulberry32's [0, 2^32) domain. */
export function clampSeed(seed: number): number {
  return Math.round(clamp(seed, 0, MAX_SEED, 0));
}

/** Speed clamp in steps/second (fractional values allowed — 0.5 = slow-mo). */
export function clampSpeed(stepsPerSecond: number): number {
  return clamp(stepsPerSecond, SPEED_LIMITS.min, SPEED_LIMITS.max, DEFAULT_SPEED);
}

/** Clamp the raw-input fields after a merge. */
function normalizeConfig(config: SimulationConfig): SimulationConfig {
  return { ...config, boardSize: clampBoardSize(config.boardSize), seed: clampSeed(config.seed) };
}

/** Shallow compare — every SimulationConfig value is a primitive. */
function sameConfig(a: SimulationConfig, b: SimulationConfig): boolean {
  const keys = Object.keys(a) as (keyof SimulationConfig)[];
  return (
    keys.length === Object.keys(b).length && keys.every((key) => key in b && a[key] === b[key])
  );
}

export interface SimulationState {
  /** Clamped engine input. (`result.config` is the fully-resolved version.) */
  config: SimulationConfig;
  /** The finished run; null until the first `run` / `play` / `setConfig`. */
  result: SimulationResult | null;
  /** Playback cursor into `result.snapshots` (0 = initial board). */
  currentStep: number;
  isPlaying: boolean;
  /** Steps per second, clamped to `SPEED_LIMITS`. */
  speed: number;

  /** Merge + clamp a patch, then rerun (no-op when the config is unchanged). */
  setConfig: (patch: Partial<SimulationConfig>) => void;
  /** Rerun the current config; keeps `isPlaying`, resets the cursor. */
  run: () => void;
  /** Pick a fresh random uint32 seed and rerun (UI-level entropy, see D-021). */
  newSeed: () => void;
  /** Play; at the end (or without a result) restarts from step 0. */
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  /** Advance one step; at the end, pause (the "run finished" signal). */
  stepForward: () => void;
  stepBack: () => void;
  jumpTo: (step: number) => void;
  jumpToStart: () => void;
  jumpToEnd: () => void;
  /** Jump to the step where the fewest conflicts were first seen (the global best). */
  jumpToBest: () => void;
  setSpeed: (stepsPerSecond: number) => void;
}

/**
 * Factory — isolated store instances for tests and non-React consumers.
 * The app singleton lives in `./index.ts` (React boundary).
 */
export function createSimulationStore() {
  return createStore<SimulationState>()((set, get) => {
    /** (Re)run the engine with `config`; keep playing state, reset the cursor. */
    const runWith = (config: SimulationConfig): void => {
      set({ result: runSimulation(config), currentStep: 0 });
    };

    return {
      config: DEFAULT_CONFIG,
      result: null,
      currentStep: 0,
      isPlaying: false,
      speed: DEFAULT_SPEED,

      setConfig: (patch) => {
        const merged = normalizeConfig({ ...get().config, ...patch });
        if (sameConfig(merged, get().config)) return; // no-op — e.g. already-clamped value
        runWith(merged);
        set({ config: merged });
      },

      run: () => runWith(get().config),

      newSeed: () => {
        // UI-level entropy only — the ENGINE stays deterministic (D-021).
        get().setConfig({ seed: Math.floor(Math.random() * 4294967296) });
      },

      play: () => {
        const { result, currentStep, config } = get();
        if (result === null) {
          runWith(config); // no run yet — start one (headless callers may `play` first)
          set({ isPlaying: true });
        } else if (currentStep >= result.totalSteps) {
          set({ isPlaying: true, currentStep: 0 }); // at the end — replay from step 0
        } else {
          set({ isPlaying: true });
        }
      },

      pause: () => set({ isPlaying: false }),

      togglePlay: () => {
        const { isPlaying } = get();
        if (isPlaying) get().pause();
        else get().play();
      },

      stepForward: () => {
        const { result, currentStep } = get();
        if (result === null) return;
        if (currentStep >= result.totalSteps) {
          set({ isPlaying: false }); // end reached — the "run finished" signal
          return;
        }
        set({ currentStep: currentStep + 1 });
      },

      stepBack: () => {
        const { currentStep } = get();
        if (currentStep > 0) set({ currentStep: currentStep - 1 });
      },

      jumpTo: (step) => {
        const { result } = get();
        if (result === null) return;
        set({ currentStep: Math.round(clamp(step, 0, result.totalSteps, 0)) });
      },

      jumpToStart: () => get().jumpTo(0),

      jumpToEnd: () => {
        const { result } = get();
        if (result === null) return;
        set({ currentStep: result.totalSteps });
      },

      jumpToBest: () => {
        const { result } = get();
        if (result === null) return;
        set({ currentStep: result.bestStep });
      },

      setSpeed: (stepsPerSecond) => set({ speed: clampSpeed(stepsPerSecond) }),
    };
  });
}

/* ── Selectors ──────────────────────────────────────────────────────────
 * All return primitives or refs into the immutable snapshot array — stable
 * across renders, so plain strict-equality subscriptions suffice (Zustand v5
 * default) and `useShallow` is unnecessary. `selectSnapshot` returning the
 * snapshot's object ref also keeps phase-based UI (board, move markers) from
 * re-rendering until the cursor actually moves.
 * ────────────────────────────────────────────────────────────────────── */

export const selectResult = (state: SimulationState): SimulationResult | null => state.result;

export const selectSnapshot = (state: SimulationState): Snapshot | null =>
  state.result?.snapshots[state.currentStep] ?? null;

export const selectTotalSteps = (state: SimulationState): number => state.result?.totalSteps ?? 0;

/** Cursor position in [0, 1] — the scrubber's fill fraction. */
export const selectProgress = (state: SimulationState): number => {
  const total = selectTotalSteps(state);
  return total === 0 ? 0 : state.currentStep / total;
};

export const selectIsAtStart = (state: SimulationState): boolean => state.currentStep === 0;

export const selectIsAtEnd = (state: SimulationState): boolean =>
  state.result !== null && state.currentStep === state.result.totalSteps;
