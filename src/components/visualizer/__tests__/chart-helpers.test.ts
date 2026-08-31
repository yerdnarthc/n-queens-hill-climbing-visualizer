import { describe, it, expect } from 'vitest';
import {
  getPhaseColor,
  getPhaseLabel,
  computePhaseDistribution,
  computeRunAnalytics,
  buildConvergenceChartOption,
  buildLandscapeChartOption,
  DEFAULT_DARK_COLORS,
  DEFAULT_LIGHT_COLORS,
} from '../chart-helpers';
import type { Snapshot } from '@/lib/engine';

const sampleSnapshots: Snapshot[] = [
  {
    step: 0,
    board: [0, 1, 2, 3],
    conflicts: 6,
    phase: 'initial',
    move: null,
    iterationInRestart: 0,
    restartCount: 0,
    temperature: null,
  },
  {
    step: 1,
    board: [1, 1, 2, 3],
    conflicts: 4,
    phase: 'improving',
    move: { column: 0, fromRow: 0, toRow: 1, deltaConflicts: -2, evaluatedMoves: 12 },
    iterationInRestart: 1,
    restartCount: 0,
    temperature: null,
  },
  {
    step: 2,
    board: [1, 3, 2, 3],
    conflicts: 4,
    phase: 'shoulder',
    move: { column: 1, fromRow: 1, toRow: 3, deltaConflicts: 0, evaluatedMoves: 12 },
    iterationInRestart: 2,
    restartCount: 0,
    temperature: null,
  },
  {
    step: 3,
    board: [2, 0, 3, 1],
    conflicts: 5,
    phase: 'restart',
    move: null,
    iterationInRestart: 0,
    restartCount: 1,
    temperature: null,
  },
  {
    step: 4,
    board: [1, 3, 0, 2],
    conflicts: 0,
    phase: 'improving',
    move: { column: 0, fromRow: 2, toRow: 1, deltaConflicts: -5, evaluatedMoves: 12 },
    iterationInRestart: 1,
    restartCount: 1,
    temperature: null,
  },
];

describe('chart-helpers', () => {
  describe('getPhaseColor and getPhaseLabel', () => {
    it('returns global max color and label when conflicts === 0', () => {
      expect(getPhaseColor('improving', 0, DEFAULT_DARK_COLORS)).toBe(
        DEFAULT_DARK_COLORS.globalMax,
      );
      expect(getPhaseLabel('improving', 0)).toBe('Global Optimum (Solved)');
    });

    it('returns correct colors and labels for non-zero conflicts', () => {
      expect(getPhaseColor('improving', 4, DEFAULT_DARK_COLORS)).toBe(
        DEFAULT_DARK_COLORS.improving,
      );
      expect(getPhaseLabel('improving', 4)).toContain('Improving');

      expect(getPhaseColor('shoulder', 4, DEFAULT_DARK_COLORS)).toBe(DEFAULT_DARK_COLORS.shoulder);
      expect(getPhaseLabel('shoulder', 4)).toContain('Shoulder');

      expect(getPhaseColor('worsening', 5, DEFAULT_DARK_COLORS)).toBe(
        DEFAULT_DARK_COLORS.worsening,
      );
      expect(getPhaseLabel('worsening', 5)).toContain('Worsening');

      expect(getPhaseColor('restart', 6, DEFAULT_DARK_COLORS)).toBe(DEFAULT_DARK_COLORS.restart);
      expect(getPhaseLabel('restart', 6)).toBe('Random Restart');

      expect(getPhaseColor('initial', 6, DEFAULT_DARK_COLORS)).toBe(DEFAULT_DARK_COLORS.initial);
      expect(getPhaseLabel('initial', 6)).toBe('Initial State');
    });

    it('supports light theme colors', () => {
      expect(getPhaseColor('improving', 4, DEFAULT_LIGHT_COLORS)).toBe(
        DEFAULT_LIGHT_COLORS.improving,
      );
      expect(getPhaseColor('improving', 0, DEFAULT_LIGHT_COLORS)).toBe(
        DEFAULT_LIGHT_COLORS.globalMax,
      );
    });
  });

  describe('computePhaseDistribution', () => {
    it('computes counts and percentages accurately', () => {
      const dist = computePhaseDistribution(sampleSnapshots);
      expect(dist.improving).toBe(2);
      expect(dist.shoulder).toBe(1);
      expect(dist.restart).toBe(1);
      expect(dist.worsening).toBe(0);
      expect(dist.totalMoves).toBe(4);
      expect(dist.improvingPct).toBe(50);
      expect(dist.shoulderPct).toBe(25);
      expect(dist.restartPct).toBe(25);
    });

    it('handles empty snapshots safely', () => {
      const dist = computePhaseDistribution([]);
      expect(dist.totalMoves).toBe(0);
      expect(dist.improvingPct).toBe(0);
    });
  });

  describe('computeRunAnalytics', () => {
    it('aggregates metrics correctly', () => {
      const summary = computeRunAnalytics(sampleSnapshots, 36, 0, 1);
      expect(summary.initialConflicts).toBe(6);
      expect(summary.finalConflicts).toBe(0);
      expect(summary.bestConflicts).toBe(0);
      expect(summary.conflictDelta).toBe(6);
      expect(summary.totalSteps).toBe(4);
      expect(summary.restarts).toBe(1);
      expect(summary.avgEvaluatedPerStep).toBe(9); // 36 / 4 = 9
      expect(summary.distribution.totalMoves).toBe(4);
    });

    it('handles zero steps gracefully', () => {
      const summary = computeRunAnalytics([], 0, 0, 0);
      expect(summary.totalSteps).toBe(0);
      expect(summary.avgEvaluatedPerStep).toBe(0);
    });
  });

  describe('buildConvergenceChartOption', () => {
    it('constructs valid ECharts option for standard hill climbing', () => {
      const option = buildConvergenceChartOption(
        sampleSnapshots,
        2,
        'steepest-ascent',
        DEFAULT_DARK_COLORS,
      );
      expect(option.xAxis.data).toEqual([0, 1, 2, 3, 4]);
      expect(option.series[0].data).toEqual([6, 4, 4, 5, 0]);
      expect(option.series).toHaveLength(1);
      expect(option.yAxis).toHaveLength(1);
    });

    it('constructs dual yAxis and second series when simulated annealing temperature is present', () => {
      const saSnapshots: Snapshot[] = sampleSnapshots.map((s, idx) => ({
        ...s,
        temperature: 4 - idx * 0.8,
      }));

      const option = buildConvergenceChartOption(
        saSnapshots,
        1,
        'simulated-annealing',
        DEFAULT_DARK_COLORS,
      );
      expect(option.series).toHaveLength(2);
      expect(option.series[1].name).toBe('Temperature');
      expect(option.yAxis).toHaveLength(2);
    });
  });

  describe('buildLandscapeChartOption', () => {
    it('constructs valid ECharts option with trajectory line and scatter points', () => {
      const option = buildLandscapeChartOption(sampleSnapshots, 2, DEFAULT_DARK_COLORS);
      expect(option.series).toHaveLength(2);
      expect(option.series[0].name).toBe('Trajectory Path');
      expect(option.series[1].name).toBe('Search States');

      const scatterData = option.series[1].data as Array<{ symbol?: string }>;
      expect(scatterData).toHaveLength(5);
      // Solved step (index 4) should have star symbol
      expect(scatterData[4].symbol).toBe('star');
      // Restart step (index 3) should have triangle symbol
      expect(scatterData[3].symbol).toBe('triangle');
      // Shoulder step (index 2) should have diamond symbol
      expect(scatterData[2].symbol).toBe('diamond');
    });
  });
});
