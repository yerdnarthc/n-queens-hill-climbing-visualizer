import { describe, it, expect, beforeEach } from 'vitest';
import {
  CONFIG_STORAGE_KEY,
  clearVisualizerState,
  loadVisualizerState,
  saveVisualizerState,
} from '../config-persistence';
import { DEFAULT_SPEED, type SimulationConfig } from '@/store/simulation-store';

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

describe('config-persistence', () => {
  beforeEach(() => {
    clearVisualizerState();
  });

  it('returns null when nothing was stored', () => {
    expect(loadVisualizerState()).toBeNull();
  });

  it('round-trips a full config plus speed', () => {
    saveVisualizerState(FULL_CONFIG, 10);
    expect(loadVisualizerState()).toEqual({ config: FULL_CONFIG, speed: 10 });
  });

  it('returns null for unparseable stored JSON', () => {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, '{not json');
    expect(loadVisualizerState()).toBeNull();
  });

  it('degrades non-object payloads to defaults (missing fields, not a failure)', () => {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify([1, 2, 3]));
    const loaded = loadVisualizerState();
    expect(loaded).not.toBeNull();
    expect(loaded!.config.boardSize).toBe(8);
    expect(loaded!.speed).toBe(DEFAULT_SPEED);
  });

  it('degrades hostile field shapes to defaults/clamped values', () => {
    window.localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify({
        config: {
          n: '12', // wrong type → default boardSize
          seed: -5, // clamped into uint32 domain → 0
          strategy: 'not-a-strategy', // unknown → default strategy
          sideways: 'yes', // wrong type → default true
          streak: 99999, // clamped to max 200
          restarts: 1, // wrong type → default false
          maxRestarts: -7, // clamped to min 1
          cooling: 5, // clamped to max 0.999
        },
        speed: 'fast', // wrong type → default speed
      }),
    );
    expect(loadVisualizerState()).toEqual({
      config: {
        boardSize: 8,
        seed: 0,
        strategy: 'steepest-ascent',
        allowSideways: true,
        maxConsecutiveSideways: 200,
        allowRestarts: false,
        maxRestarts: 1,
        saCoolingRate: 0.999,
      },
      speed: DEFAULT_SPEED,
    });
  });

  it('clear removes the stored state', () => {
    saveVisualizerState(FULL_CONFIG, 5);
    expect(loadVisualizerState()).not.toBeNull();
    clearVisualizerState();
    expect(loadVisualizerState()).toBeNull();
  });
});
