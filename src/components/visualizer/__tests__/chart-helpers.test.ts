import { describe, it, expect } from 'vitest';
import {
  getPhaseColor,
  getPhaseLabel,
  computePhaseDistribution,
  computeRunAnalytics,
  buildConvergenceChartOption,
  buildLandscapeChartOption,
  buildDataZoomConfig,
  withAlpha,
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

    it('attaches X-axis-only dataZoom with inside + slider entries', () => {
      const option = buildConvergenceChartOption(
        sampleSnapshots,
        2,
        'steepest-ascent',
        DEFAULT_DARK_COLORS,
      );
      // The dataZoom config is shared via buildDataZoomConfig — see its own
      // tests below for the detailed assertions. Here we just confirm it's
      // wired in with the expected shape.
      const dz = option.dataZoom as Array<{ type: string; xAxisIndex: number }>;
      expect(Array.isArray(dz)).toBe(true);
      expect(dz).toHaveLength(2);
      expect(dz[0].type).toBe('inside');
      expect(dz[1].type).toBe('slider');
      // Both entries must be X-axis-only (xAxisIndex: 0).
      expect(dz[0].xAxisIndex).toBe(0);
      expect(dz[1].xAxisIndex).toBe(0);
    });

    it('bakes a saved zoom range into the slider dataZoom entry', () => {
      const option = buildConvergenceChartOption(
        sampleSnapshots,
        2,
        'steepest-ascent',
        DEFAULT_DARK_COLORS,
        { start: 30, end: 70 },
      );
      const dz = option.dataZoom as Array<{ start: number; end: number }>;
      // The slider (index 1) reflects the saved range, so the next option
      // update won't visually reset the user's zoom position.
      expect(dz[1].start).toBe(30);
      expect(dz[1].end).toBe(70);
    });

    it('pins the primary (conflicts) y-axis to the full-run max', () => {
      // The sample fixtures have conflicts [6, 4, 4, 5, 0]. Max raw = 6,
      // and the builder adds +1 headroom → expected max = 7.
      const option = buildConvergenceChartOption(
        sampleSnapshots,
        2,
        'steepest-ascent',
        DEFAULT_DARK_COLORS,
      );
      const yAxis = option.yAxis as Array<{ min: number; max: number; scale: boolean }>;
      expect(yAxis[0].min).toBe(0);
      expect(yAxis[0].max).toBe(7);
      expect(yAxis[0].scale).toBe(false);
    });

    it('keeps the y-axis max stable regardless of the dataZoom window', () => {
      // Building the option with a zoom range that hides the high-conflict
      // snapshots must NOT change the y-axis max — that's the whole point
      // of pinning it. We compare the unpinned and pinned options.
      const unpinned = buildConvergenceChartOption(
        sampleSnapshots,
        2,
        'steepest-ascent',
        DEFAULT_DARK_COLORS,
      );
      const pinned = buildConvergenceChartOption(
        sampleSnapshots,
        2,
        'steepest-ascent',
        DEFAULT_DARK_COLORS,
        { start: 50, end: 100 },
      );
      const unpinnedMax = (unpinned.yAxis as Array<{ max: number }>)[0].max;
      const pinnedMax = (pinned.yAxis as Array<{ max: number }>)[0].max;
      expect(pinnedMax).toBe(unpinnedMax);
    });

    it('pins the temperature y-axis to the full-run max when SA is active', () => {
      // The test sets temperature = 4 - idx*0.8 for 5 samples, so values
      // are [4, 3.2, 2.4, 1.6, 0.8]. Max raw = 4, +0.1 headroom → 4.1.
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
      const yAxis = option.yAxis as Array<{ min: number; max: number }>;
      expect(yAxis).toHaveLength(2);
      expect(yAxis[1].min).toBe(0);
      expect(yAxis[1].max).toBe(4.1);
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

    it('attaches X-axis-only dataZoom to the landscape chart too', () => {
      const option = buildLandscapeChartOption(sampleSnapshots, 2, DEFAULT_DARK_COLORS);
      const dz = option.dataZoom as Array<{ xAxisIndex: number; zoomLock: boolean }>;
      expect(dz).toHaveLength(2);
      expect(dz[0].xAxisIndex).toBe(0);
      // zoomLock: true on the inside entry is the X-axis-only safety net —
      // it constrains trackpad-pinch gestures to horizontal zoom, never
      // letting the Y (conflict) domain get accidentally rescaled.
      expect(dz[0].zoomLock).toBe(true);
    });

    it('pins the y-axis to the full-run conflicts max', () => {
      // sampleSnapshots conflicts: [6, 4, 4, 5, 0]. Max raw = 6, +1 headroom → 7.
      const option = buildLandscapeChartOption(sampleSnapshots, 2, DEFAULT_DARK_COLORS);
      const yAxis = option.yAxis as { min: number; max: number; scale: boolean };
      expect(yAxis.min).toBe(0);
      expect(yAxis.max).toBe(7);
      expect(yAxis.scale).toBe(false);
    });

    it('keeps the y-axis max stable regardless of the dataZoom window', () => {
      // The whole point of pinning: zooming in must not rescale Y.
      const unpinned = buildLandscapeChartOption(sampleSnapshots, 2, DEFAULT_DARK_COLORS);
      const pinned = buildLandscapeChartOption(sampleSnapshots, 2, DEFAULT_DARK_COLORS, {
        start: 50,
        end: 100,
      });
      const unpinnedMax = (unpinned.yAxis as { max: number }).max;
      const pinnedMax = (pinned.yAxis as { max: number }).max;
      expect(pinnedMax).toBe(unpinnedMax);
    });

    it('handles the all-solved edge case without NaN or -Infinity', () => {
      // If every snapshot has conflicts === 0, naive `Math.max(...[0,0,0])`
      // would be 0, and `0 + 1` headroom is 1 — but the y-axis must never
      // be -Infinity, which is what happens with `Math.max(...[])` on an
      // empty array. The builder guards both cases.
      const allSolved: Snapshot[] = sampleSnapshots.map((s) => ({ ...s, conflicts: 0 }));
      const option = buildLandscapeChartOption(allSolved, 2, DEFAULT_DARK_COLORS);
      const yAxis = option.yAxis as { min: number; max: number };
      expect(Number.isFinite(yAxis.max)).toBe(true);
      expect(yAxis.max).toBeGreaterThan(0);
    });
  });

  describe('buildDataZoomConfig', () => {
    it('returns inside + slider entries with X-axis-only scope by default', () => {
      const config = buildDataZoomConfig(DEFAULT_DARK_COLORS);
      expect(config).toHaveLength(2);

      const [inside, slider] = config as Array<{
        type: string;
        xAxisIndex: number;
        start?: number;
        end?: number;
        filterMode: string;
        zoomLock?: boolean;
      }>;

      expect(inside.type).toBe('inside');
      expect(inside.xAxisIndex).toBe(0);
      expect(inside.zoomLock).toBe(true);
      expect(inside.filterMode).toBe('filter');

      expect(slider.type).toBe('slider');
      expect(slider.xAxisIndex).toBe(0);
      expect(slider.filterMode).toBe('filter');
      // Default to the full 0–100 range so the user sees the whole run on
      // first paint, before they touch the slider.
      expect(slider.start).toBe(0);
      expect(slider.end).toBe(100);
    });

    it('honors a passed-in zoom range for slider start/end', () => {
      const config = buildDataZoomConfig(DEFAULT_DARK_COLORS, { start: 25, end: 75 });
      const slider = config[1] as { start: number; end: number };
      expect(slider.start).toBe(25);
      expect(slider.end).toBe(75);
    });

    it('themes the slider with the active palette tokens', () => {
      const darkConfig = buildDataZoomConfig(DEFAULT_DARK_COLORS);
      const lightConfig = buildDataZoomConfig(DEFAULT_LIGHT_COLORS);
      const darkSlider = darkConfig[1] as {
        handleStyle: { color: string };
        textStyle: { color: string };
      };
      const lightSlider = lightConfig[1] as {
        handleStyle: { color: string };
        textStyle: { color: string };
      };
      // The slider should pick up each theme's `primary` (handle) and
      // `axis` (text) colors so it visually integrates with the chart.
      expect(darkSlider.handleStyle.color).toBe(DEFAULT_DARK_COLORS.primary);
      expect(darkSlider.textStyle.color).toBe(DEFAULT_DARK_COLORS.axis);
      expect(lightSlider.handleStyle.color).toBe(DEFAULT_LIGHT_COLORS.primary);
      expect(lightSlider.textStyle.color).toBe(DEFAULT_LIGHT_COLORS.axis);
    });
  });

  describe('withAlpha', () => {
    it('appends a two-digit hex alpha to a 6-digit hex color', () => {
      // 0.5 → 128 → '80'
      expect(withAlpha('#7c3aed', 0.5)).toBe('#7c3aed80');
      // 1.0 → 255 → 'ff'
      expect(withAlpha('#7c3aed', 1)).toBe('#7c3aedff');
      // 0.0 → 0 → '00'
      expect(withAlpha('#7c3aed', 0)).toBe('#7c3aed00');
    });

    it('expands 3-digit shorthand to 6-digit form before appending alpha', () => {
      expect(withAlpha('#abc', 0.5)).toBe('#aabbcc80');
    });

    it('clamps alpha to the 0–1 range', () => {
      // Above 1 should clamp, not overflow.
      expect(withAlpha('#7c3aed', 2)).toBe('#7c3aedff');
      // Below 0 should clamp to 0.
      expect(withAlpha('#7c3aed', -0.5)).toBe('#7c3aed00');
    });

    it('returns the input unchanged for non-hex strings (defensive)', () => {
      // We don't try to handle every CSS color format — just bail out and
      // let ECharts' own color parser take over (it tolerates named colors).
      expect(withAlpha('rgb(124, 58, 237)', 0.5)).toBe('rgb(124, 58, 237)');
    });
  });
});
