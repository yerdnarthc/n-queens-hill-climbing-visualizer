import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPEED,
  clampBoardSize,
  clampSeed,
  clampSpeed,
  createSimulationStore,
  selectIsAtEnd,
  selectIsAtStart,
  selectProgress,
  selectSnapshot,
  selectTotalSteps,
} from '../simulation-store';

/**
 * Machine-harvested fixtures (engine oracle, 2026-08-31 — never hand-derived):
 *
 *  seed 27, N=8, steepest-ascent — the DEFAULT_CONFIG "first impression":
 *    solved in 5 steps, conflicts [6,3,2,1,1,0], phases
 *    [initial, improving, improving, improving, shoulder, improving],
 *    initial board [3,0,0,1,6,1,2,0], final board [3,5,7,1,6,0,2,4].
 *
 *  seed 25, N=8 — compact run: solved in 2 steps, conflicts [4,1,0].
 *
 *  seed 16, N=4 — lucky board: the initial placement is already a solution
 *    (totalSteps 0, conflicts [0], board [2,0,3,1]).
 */
const initial27 = [3, 0, 0, 1, 6, 1, 2, 0];
const conflicts27 = [6, 3, 2, 1, 1, 0];

describe('clamp helpers', () => {
  it('clampBoardSize bounds the UI range to 4–16 and rounds', () => {
    expect(clampBoardSize(1)).toBe(4);
    expect(clampBoardSize(3.6)).toBe(4);
    expect(clampBoardSize(16.9)).toBe(16);
    expect(clampBoardSize(64)).toBe(16);
    expect(clampBoardSize(8)).toBe(8);
  });

  it('clampBoardSize falls back to the default for non-finite input', () => {
    expect(clampBoardSize(Number.NaN)).toBe(8);
    expect(clampBoardSize(Number.POSITIVE_INFINITY)).toBe(16);
  });

  it('clampSeed bounds to the uint32 domain [0, 2^32) and rounds', () => {
    expect(clampSeed(-5)).toBe(0);
    expect(clampSeed(4294967296)).toBe(4294967295);
    expect(clampSeed(123.4)).toBe(123);
    expect(clampSeed(Number.NaN)).toBe(0);
  });

  it('clampSpeed bounds to 0.5–30 sps and falls back to the default', () => {
    expect(clampSpeed(0)).toBe(0.5);
    expect(clampSpeed(100)).toBe(30);
    expect(clampSpeed(1.75)).toBe(1.75);
    expect(clampSpeed(Number.NaN)).toBe(DEFAULT_SPEED);
  });
});

describe('createSimulationStore — run & lifecycle', () => {
  it('starts with default config, no result, cursor 0, paused', () => {
    const s = createSimulationStore().getState();
    expect(s.config).toEqual({ boardSize: 8, seed: 27, strategy: 'steepest-ascent' });
    expect(s.result).toBeNull();
    expect(s.currentStep).toBe(0);
    expect(s.isPlaying).toBe(false);
    expect(s.speed).toBe(DEFAULT_SPEED);
  });

  it('run() executes the default config and lands the cursor on the initial snapshot', () => {
    const store = createSimulationStore();
    store.getState().run();
    const s = store.getState();
    expect(s.result!.status).toBe('solved');
    expect(s.result!.totalSteps).toBe(5);
    expect(s.currentStep).toBe(0);
    expect(s.isPlaying).toBe(false);
    expect(selectSnapshot(s)).toMatchObject({
      step: 0,
      board: initial27,
      conflicts: 6,
      phase: 'initial',
      move: null,
    });
  });

  it('run() is deterministic — identical configs yield equal snapshots', () => {
    const store = createSimulationStore();
    store.getState().run();
    const first = store.getState().result!;
    store.getState().run();
    expect(store.getState().result).not.toBe(first); // fresh object…
    expect(store.getState().result!.snapshots).toEqual(first.snapshots); // …same content
  });

  it('run() preserves isPlaying across reruns, restarting the new run at step 0', () => {
    const store = createSimulationStore();
    store.getState().run();
    store.getState().play();
    store.getState().stepForward();
    expect(store.getState().isPlaying).toBe(true);
    store.getState().run();
    const s = store.getState();
    expect(s.isPlaying).toBe(true); // keeps playing…
    expect(s.currentStep).toBe(0); // …but from the new run's start
  });
});
describe('createSimulationStore — config changes', () => {
  it('setConfig reruns immediately (new result, cursor 0)', () => {
    const store = createSimulationStore();
    store.getState().setConfig({ seed: 25 });
    const s = store.getState();
    expect(s.config.seed).toBe(25);
    expect(s.result!.totalSteps).toBe(2); // machine-harvested for seed 25
    expect(s.result!.snapshots.map((snap) => snap.conflicts)).toEqual([4, 1, 0]);
    expect(s.currentStep).toBe(0);
  });

  it('setConfig clamps out-of-range values before running', () => {
    const store = createSimulationStore();
    store.getState().setConfig({ boardSize: 99, seed: 1e10 });
    const s = store.getState();
    expect(s.config.boardSize).toBe(16);
    expect(s.config.seed).toBe(4294967295);
    expect(s.result!.config.boardSize).toBe(16); // engine saw the clamped value
    expect(s.result!.snapshots[0]!.board).toHaveLength(16);
  });

  it('setConfig is a no-op when the merged config is unchanged', () => {
    const store = createSimulationStore();
    store.getState().run();
    const before = store.getState().result;
    store.getState().setConfig({ seed: 27 }); // already the default
    store.getState().setConfig({}); // empty patch
    expect(store.getState().result).toBe(before); // same ref — no rerun
  });

  it('setConfig resets the cursor even from the end of a run', () => {
    const store = createSimulationStore();
    store.getState().run();
    store.getState().jumpToEnd();
    expect(store.getState().currentStep).toBe(5);
    store.getState().setConfig({ seed: 25 });
    expect(store.getState().currentStep).toBe(0);
  });

  it('newSeed() replaces the seed with a fresh uint32 and reruns', () => {
    const store = createSimulationStore();
    store.getState().run();
    const firstSeed = store.getState().config.seed;
    store.getState().newSeed();
    const s = store.getState();
    expect(s.config.seed).not.toBe(firstSeed);
    expect(Number.isInteger(s.config.seed)).toBe(true);
    expect(s.config.seed).toBeGreaterThanOrEqual(0);
    expect(s.config.seed).toBeLessThan(4294967296);
    expect(s.result!.config.seed).toBe(s.config.seed); // engine ran the new seed
    expect(s.currentStep).toBe(0);
  });
});
describe('createSimulationStore — playback', () => {
  it('play() on a fresh store bootstraps the initial run and starts', () => {
    const store = createSimulationStore();
    store.getState().play();
    const s = store.getState();
    expect(s.isPlaying).toBe(true);
    expect(s.result!.totalSteps).toBe(5);
    expect(s.currentStep).toBe(0);
  });

  it('stepForward walks to the end, then auto-pauses (run finished signal)', () => {
    const store = createSimulationStore();
    store.getState().run();
    store.getState().play();
    for (let i = 1; i <= 5; i++) {
      store.getState().stepForward();
      expect(store.getState().currentStep).toBe(i);
    }
    expect(store.getState().isPlaying).toBe(true); // at the last step, still playing
    store.getState().stepForward(); // would advance past the end
    const s = store.getState();
    expect(s.currentStep).toBe(5); // cursor clamped at the end
    expect(s.isPlaying).toBe(false); // auto-paused — the run finished
  });

  it('the last snapshot is the solved board', () => {
    const store = createSimulationStore();
    store.getState().run();
    store.getState().jumpToEnd();
    const snap = selectSnapshot(store.getState())!;
    expect(snap.board).toEqual([3, 5, 7, 1, 6, 0, 2, 4]); // machine-harvested
    expect(snap.conflicts).toBe(0);
    expect(store.getState().result!.finalBoard).toEqual([3, 5, 7, 1, 6, 0, 2, 4]);
  });
  it('stepBack floors at 0 and steps back one at a time', () => {
    const store = createSimulationStore();
    store.getState().run();
    store.getState().stepBack(); // already at 0
    expect(store.getState().currentStep).toBe(0);
    store.getState().stepForward();
    store.getState().stepForward();
    store.getState().stepBack();
    expect(store.getState().currentStep).toBe(1);
  });

  it('jumpTo clamps into [0, totalSteps] and rounds', () => {
    const store = createSimulationStore();
    store.getState().run();
    store.getState().jumpTo(3);
    expect(store.getState().currentStep).toBe(3);
    store.getState().jumpTo(-5);
    expect(store.getState().currentStep).toBe(0);
    store.getState().jumpTo(99);
    expect(store.getState().currentStep).toBe(5);
    store.getState().jumpTo(2.7);
    expect(store.getState().currentStep).toBe(3);
  });

  it('jumpToStart / jumpToEnd move the cursor to the run bounds', () => {
    const store = createSimulationStore();
    store.getState().run();
    store.getState().jumpTo(3);
    store.getState().jumpToStart();
    expect(store.getState().currentStep).toBe(0);
    store.getState().jumpToEnd();
    expect(store.getState().currentStep).toBe(5);
  });

  it('pause() stops playback without moving the cursor', () => {
    const store = createSimulationStore();
    store.getState().play();
    store.getState().stepForward();
    store.getState().pause();
    const s = store.getState();
    expect(s.isPlaying).toBe(false);
    expect(s.currentStep).toBe(1);
  });

  it('togglePlay flips between playing and paused', () => {
    const store = createSimulationStore();
    store.getState().togglePlay(); // fresh → play (bootstraps run)
    expect(store.getState().isPlaying).toBe(true);
    store.getState().togglePlay(); // → pause
    expect(store.getState().isPlaying).toBe(false);
    store.getState().togglePlay(); // → play resumes mid-run
    expect(store.getState().isPlaying).toBe(true);
  });
  it('play() at the end restarts from step 0', () => {
    const store = createSimulationStore();
    store.getState().run();
    store.getState().jumpToEnd();
    store.getState().play();
    const s = store.getState();
    expect(s.isPlaying).toBe(true);
    expect(s.currentStep).toBe(0);
    expect(selectSnapshot(s)!.board).toEqual(initial27);
  });

  it('setSpeed clamps into range without disturbing playback', () => {
    const store = createSimulationStore();
    store.getState().play();
    store.getState().setSpeed(10);
    expect(store.getState().speed).toBe(10);
    expect(store.getState().isPlaying).toBe(true);
    store.getState().setSpeed(999);
    expect(store.getState().speed).toBe(30);
    store.getState().setSpeed(0.1);
    expect(store.getState().speed).toBe(0.5);
  });
});

describe('createSimulationStore — edge runs', () => {
  it('handles a zero-step run (N=4 seed 16: initial board already solved)', () => {
    const store = createSimulationStore();
    store.getState().setConfig({ boardSize: 4, seed: 16 });
    const s = store.getState();
    expect(s.result!.status).toBe('solved');
    expect(s.result!.totalSteps).toBe(0);
    expect(s.result!.snapshots).toHaveLength(1);
    expect(selectSnapshot(s)!.board).toEqual([2, 0, 3, 1]);
    store.getState().jumpToEnd();
    expect(store.getState().currentStep).toBe(0); // end IS start for zero steps
    expect(selectProgress(store.getState())).toBe(0);
  });

  it('playing a zero-step run auto-pauses on the first tick', () => {
    const store = createSimulationStore();
    store.getState().setConfig({ boardSize: 4, seed: 16 });
    store.getState().play();
    expect(store.getState().isPlaying).toBe(true);
    store.getState().stepForward(); // no steps exist — immediate finish
    expect(store.getState().currentStep).toBe(0);
    expect(store.getState().isPlaying).toBe(false);
  });

  it('stays safe when navigating before any run exists', () => {
    const store = createSimulationStore();
    store.getState().stepForward(); // no result → no-op
    store.getState().stepBack();
    store.getState().jumpTo(3);
    store.getState().jumpToStart();
    store.getState().jumpToEnd();
    expect(store.getState().result).toBeNull();
    expect(store.getState().currentStep).toBe(0);
  });

  it('carries stagnated runs to their plateau (seed 1, N=8 — machine-harvested)', () => {
    const store = createSimulationStore();
    store.getState().setConfig({ seed: 1 });
    const s = store.getState();
    expect(s.result!.status).toBe('stagnated');
    expect(s.result!.solved).toBe(false);
    expect(s.result!.totalSteps).toBe(105);
    expect(s.result!.finalConflicts).toBe(1);
    expect(s.result!.snapshots.at(-1)!.conflicts).toBe(1);
  });
});
describe('simulation selectors', () => {
  it('selectSnapshot / selectTotalSteps follow the cursor through the run', () => {
    const store = createSimulationStore();
    store.getState().run();
    expect(selectSnapshot(store.getState())!.conflicts).toBe(conflicts27[0]);
    expect(selectTotalSteps(store.getState())).toBe(5);
    store.getState().jumpToEnd();
    expect(selectSnapshot(store.getState())!.conflicts).toBe(0);
  });

  it('selectSnapshot returns the SAME immutable object when revisiting a step', () => {
    const store = createSimulationStore();
    store.getState().run();
    const first = selectSnapshot(store.getState());
    store.getState().stepForward();
    const second = selectSnapshot(store.getState());
    expect(second).not.toBe(first); // different steps, different objects
    expect(second!.conflicts).toBe(conflicts27[1]);
    store.getState().stepBack();
    expect(selectSnapshot(store.getState())).toBe(first); // time travel: same ref
  });

  it('expose at-start / at-end / progress through the run', () => {
    const store = createSimulationStore();
    store.getState().run();
    expect(selectIsAtStart(store.getState())).toBe(true);
    expect(selectIsAtEnd(store.getState())).toBe(false);
    store.getState().jumpTo(2);
    expect(selectProgress(store.getState())).toBe(0.4);
    store.getState().jumpToEnd();
    expect(selectProgress(store.getState())).toBe(1);
    expect(selectIsAtEnd(store.getState())).toBe(true);
    expect(selectIsAtStart(store.getState())).toBe(false);
  });

  it('degrade safely before the first run', () => {
    const store = createSimulationStore();
    const s = store.getState();
    expect(selectSnapshot(s)).toBeNull();
    expect(selectTotalSteps(s)).toBe(0);
    expect(selectProgress(s)).toBe(0);
    expect(selectIsAtEnd(s)).toBe(false);
    expect(selectIsAtStart(s)).toBe(true);
  });
});
