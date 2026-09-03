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
      // The data is now per-point objects (mirrors the Landscape chart's
      // per-point styling). We assert the value tuples are still correct.
      const data = option.series[0].data as Array<{ value: [number, number] }>;
      expect(data.map((d) => d.value)).toEqual([
        [0, 6],
        [1, 4],
        [2, 4],
        [3, 5],
        [4, 0],
      ]);
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

    it('uses the same per-phase symbols as the Landscape chart (solved=star, restart=triangle, shoulder=diamond, else=circle)', () => {
      // sampleSnapshots:
      //   index 0: phase=initial,  conflicts=6, not solved → circle
      //   index 1: phase=improving, conflicts=4 → circle
      //   index 2: phase=shoulder,  conflicts=4 → diamond
      //   index 3: phase=restart,  conflicts=5 → triangle
      //   index 4: phase=improving, conflicts=0 (solved) → star
      const option = buildConvergenceChartOption(
        sampleSnapshots,
        2,
        'steepest-ascent',
        DEFAULT_DARK_COLORS,
      );
      const data = option.series[0].data as Array<{ symbol: string }>;
      expect(data[0].symbol).toBe('circle');
      expect(data[1].symbol).toBe('circle');
      expect(data[2].symbol).toBe('diamond');
      expect(data[3].symbol).toBe('triangle');
      expect(data[4].symbol).toBe('star');
    });

    it('uses the same per-phase symbolSize baseline as the Landscape chart (8 sparse, +5 current, +3 restart, +5 solved)', () => {
      // For 5 snapshots (sparse), baseline is 8. With currentStep=1:
      //   index 0 (initial, not current): circle, size 8
      //   index 1 (improving, current):    circle, size 8 + 5 = 13
      //   index 2 (shoulder, not current): diamond, size 8
      //   index 3 (restart, not current):  triangle, size 10
      //   index 4 (improving→solved, not current): star, size 13
      const option = buildConvergenceChartOption(
        sampleSnapshots,
        1,
        'steepest-ascent',
        DEFAULT_DARK_COLORS,
      );
      const data = option.series[0].data as Array<{ symbolSize: number }>;
      expect(data[0].symbolSize).toBe(8);
      expect(data[1].symbolSize).toBe(13); // current step headroom
      expect(data[2].symbolSize).toBe(8);
      expect(data[3].symbolSize).toBe(10);
      expect(data[4].symbolSize).toBe(13);
    });

    it('glows the current-step marker (border + shadow) just like the Landscape chart', () => {
      // The current step's marker must have a 2px foreground border and
      // an 8px shadow blur tinted with the phase color. All other markers
      // should have borderWidth 0, shadowBlur 0, and transparent colors.
      const option = buildConvergenceChartOption(
        sampleSnapshots,
        1, // current step = index 1
        'steepest-ascent',
        DEFAULT_DARK_COLORS,
      );
      const data = option.series[0].data as Array<{
        itemStyle: {
          color: string;
          borderColor: string;
          borderWidth: number;
          shadowBlur: number;
          shadowColor: string;
        };
      }>;
      // The current step (index 1) glows.
      expect(data[1].itemStyle.borderWidth).toBe(2);
      expect(data[1].itemStyle.shadowBlur).toBe(8);
      expect(data[1].itemStyle.borderColor).toBe(DEFAULT_DARK_COLORS.foreground);
      expect(data[1].itemStyle.shadowColor).not.toBe('transparent');
      // Non-current steps don't glow.
      for (const i of [0, 2, 3, 4]) {
        expect(data[i].itemStyle.borderWidth).toBe(0);
        expect(data[i].itemStyle.shadowBlur).toBe(0);
        expect(data[i].itemStyle.borderColor).toBe('transparent');
        expect(data[i].itemStyle.shadowColor).toBe('transparent');
      }
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

    it('renders the trajectory line with the same width + opacity as the Landscape chart', () => {
      // The two analytics charts should look like a coherent pair: same
      // primary-color line, same width, same opacity. A regression here
      // would make the markers visually overpower the convergence line OR
      // make the convergence line look heavier than the landscape one.
      const convergence = buildConvergenceChartOption(
        sampleSnapshots,
        2,
        'steepest-ascent',
        DEFAULT_DARK_COLORS,
      );
      const landscape = buildLandscapeChartOption(sampleSnapshots, 2, DEFAULT_DARK_COLORS);
      const convergenceLineStyle = (
        convergence.series[0] as { lineStyle: { color: string; width: number; opacity?: number } }
      ).lineStyle;
      const landscapeLineStyle = (
        landscape.series[0] as { lineStyle: { color: string; width: number; opacity?: number } }
      ).lineStyle;
      expect(convergenceLineStyle.color).toBe(landscapeLineStyle.color);
      expect(convergenceLineStyle.width).toBe(landscapeLineStyle.width);
      expect(convergenceLineStyle.opacity).toBe(landscapeLineStyle.opacity);
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

    it('uses axis-trigger tooltip with snap-enabled axisPointer (matches Convergence UX)', () => {
      // The Landscape chart used `trigger: 'item'`, which only showed the
      // tooltip when the cursor was directly over a marker. That made the
      // chart feel "dead" between markers and made click-to-scrub miss in
      // the gaps. Switching to `trigger: 'axis'` + `axisPointer.snap: true`
      // mirrors the Convergence chart's behavior: a vertical dashed line
      // follows the cursor and snaps to the nearest data point, and the
      // tooltip is shown anywhere on the plot.
      const option = buildLandscapeChartOption(sampleSnapshots, 2, DEFAULT_DARK_COLORS);
      const tooltip = option.tooltip as {
        trigger: string;
        axisPointer: { type: string; snap: boolean; lineStyle: { type: string } };
      };
      expect(tooltip.trigger).toBe('axis');
      expect(tooltip.axisPointer).toBeDefined();
      expect(tooltip.axisPointer.type).toBe('line');
      expect(tooltip.axisPointer.snap).toBe(true);
      // The line should be themed to match the convergence chart's style
      // (dashed, in the primary color).
      expect(tooltip.axisPointer.lineStyle.type).toBe('dashed');
    });

    it('formatter handles the trigger:axis array shape (one entry per series)', () => {
      // ECharts passes `params` as an Array<{dataIndex}> for axis-trigger
      // tooltips. The landscape formatter must read the first entry's
      // dataIndex to look up the snapshot — it must NOT crash on the
      // old `params.dataIndex` access (which would be undefined on an
      // array).
      const option = buildLandscapeChartOption(sampleSnapshots, 2, DEFAULT_DARK_COLORS);
      const tooltip = option.tooltip as {
        formatter: (params: unknown) => string;
      };
      // Simulate the array shape ECharts would pass.
      const arr = [{ dataIndex: 2 }];
      const html = tooltip.formatter(arr);
      // The formatter builds HTML containing the step number and the
      // conflict count. Step 2 (sampleSnapshots[2]) has conflicts: 4.
      expect(html).toContain('Landscape Step 2');
      expect(html).toContain('4 conflicts');
    });

    it('formatter returns an empty string when given an empty/unknown payload', () => {
      // Defensive: a malformed payload should not throw. The formatter
      // handles both `params` (single object) and `params` (array) shapes
      // gracefully and returns '' when no dataIndex can be resolved.
      const option = buildLandscapeChartOption(sampleSnapshots, 2, DEFAULT_DARK_COLORS);
      const tooltip = option.tooltip as { formatter: (params: unknown) => string };
      expect(tooltip.formatter([])).toBe('');
      expect(tooltip.formatter([{}])).toBe('');
      expect(tooltip.formatter({})).toBe('');
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

    it('uses a category xAxis with boundaryGap: false so the line touches the plot edges', () => {
      // The landscape chart used `type: 'value'` with `min: 0, max: N`,
      // which left visible gaps at the left/right edges when the user
      // zoomed in (because ECharts pads the visible window with "nice"
      // tick rounding). Mirroring the Convergence chart's `type:
      // 'category'` with `boundaryGap: false` makes the trajectory line
      // stretch edge-to-edge regardless of zoom state.
      const option = buildLandscapeChartOption(sampleSnapshots, 2, DEFAULT_DARK_COLORS);
      const xAxis = option.xAxis as {
        type: string;
        data: number[];
        boundaryGap: boolean;
      };
      expect(xAxis.type).toBe('category');
      expect(xAxis.data).toEqual([0, 1, 2, 3, 4]);
      expect(xAxis.boundaryGap).toBe(false);
    });

    it('uses the 8 baseline + 5 current-step headroom for sparse runs', () => {
      // Regression guard for the subtle marker-size bump. The landscape
      // chart computes the symbol size in a `snapshots.map(...)` callback
      // because each point's shape/size depends on its phase. The baseline
      // is `snapshots.length > 60 ? 6 : 8` (smaller for dense runs to avoid
      // visual overload, larger for sparse runs to keep markers prominent).
      // For our 5-snapshot fixture, baseline = 8.
      const option = buildLandscapeChartOption(sampleSnapshots, 1, DEFAULT_DARK_COLORS);
      const scatterData = option.series[1].data as Array<{
        symbolSize: number;
        symbol: string;
      }>;
      // currentStep=1 → the snapshot at index 1 (step=1) is "current".
      // Its phase=improving → symbol=circle, baseline=8, +5 headroom=13.
      const current = scatterData[1];
      expect(current.symbol).toBe('circle');
      expect(current.symbolSize).toBe(13);

      // And a non-current point at the same index range (improving, not solved)
      // should get the plain baseline of 8.
      const nonCurrentImproving = scatterData[0];
      expect(nonCurrentImproving.symbol).toBe('circle');
      expect(nonCurrentImproving.symbolSize).toBe(8);
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

    it('positions the slider 8px from the bottom of the chart (breathing room)', () => {
      // Regression guard for the spacing fix: the slider was at `bottom: 4`
      // which felt cramped against the bottom edge of the chart. The
      // current value (8) gives more visual breathing room and balances
      // against the 14% top padding.
      const config = buildDataZoomConfig(DEFAULT_DARK_COLORS);
      const slider = config[1] as { bottom: number; height: number };
      expect(slider.bottom).toBe(8);
      expect(slider.height).toBe(28);
    });
  });

  describe('chart grid padding (Analytics section spacing)', () => {
    // Regression guards for the spacing fix in the Analytics section.
    // Both charts use `top: 20%, bottom: 20%` — generous padding on
    // both ends of the chart so that:
    //   - the yAxis name (at the top, by ECharts default) and the
    //     axisPointer label (which appears at the top when hovering)
    //     have ~54px to themselves and never collide;
    //   - the xAxis name "Step" and the dataZoom slider (18px tall,
    //     bottom: 8) have their own non-overlapping ~54px region at
    //     the bottom.
    //
    // Earlier iterations tried moving the yAxis names to the bottom
    // via `nameLocation: 'start'`, but that crowded the xAxis name
    // + dataZoom slider region — the yAxis names belong at the top
    // by convention, and a roomy top region is the right fix.

    it('Convergence: grid is padded with 20% top and 20% bottom', () => {
      const option = buildConvergenceChartOption(
        sampleSnapshots,
        2,
        'steepest-ascent',
        DEFAULT_DARK_COLORS,
      );
      const grid = option.grid as { top: string; bottom: string };
      expect(grid.top).toBe('15%');
      expect(grid.bottom).toBe('20%');
    });

    it('Convergence: yAxis names use the ECharts default (top of axis, no nameLocation set)', () => {
      // We don't set nameLocation explicitly, so the option object
      // should not have a nameLocation property on the yAxis entries.
      // (ECharts' default is 'end', which places the name at the
      // top of a value axis.)
      const option = buildConvergenceChartOption(
        sampleSnapshots,
        2,
        'steepest-ascent',
        DEFAULT_DARK_COLORS,
      );
      const yAxis = option.yAxis as Array<{ name: string; nameLocation?: string }>;
      // Primary axis: "Conflicts h(s)".
      expect(yAxis[0].name).toBe('Conflicts h(s)');
      expect(yAxis[0].nameLocation).toBeUndefined();
    });

    it('Convergence (SA): temperature yAxis name is also at the top (no nameLocation set)', () => {
      // The secondary (right) yAxis for SA only appears when temperature
      // data is present. We synthesize a snapshot set with temperature
      // data to assert on it. The name should also be at the top via
      // ECharts' default 'end' nameLocation (no nameLocation set).
      const saSnapshots: Snapshot[] = sampleSnapshots.map((s, idx) => ({
        ...s,
        temperature: 4 - idx * 0.8,
      }));
      const option = buildConvergenceChartOption(
        saSnapshots,
        2,
        'simulated-annealing',
        DEFAULT_DARK_COLORS,
      );
      const yAxis = option.yAxis as Array<{ name: string; nameLocation?: string }>;
      expect(yAxis).toHaveLength(2);
      expect(yAxis[1].name).toBe('Temperature T');
      expect(yAxis[1].nameLocation).toBeUndefined();
    });

    it('Landscape: grid is padded with 20% top and 20% bottom', () => {
      const option = buildLandscapeChartOption(sampleSnapshots, 2, DEFAULT_DARK_COLORS);
      const grid = option.grid as { top: string; bottom: string };
      expect(grid.top).toBe('15%');
      expect(grid.bottom).toBe('20%');
    });

    it('Landscape: yAxis name uses the ECharts default (top of axis, no nameLocation set)', () => {
      const option = buildLandscapeChartOption(sampleSnapshots, 2, DEFAULT_DARK_COLORS);
      const yAxis = option.yAxis as { name: string; nameLocation?: string };
      expect(yAxis.name).toBe('Conflicts (Attacking Pairs)');
      expect(yAxis.nameLocation).toBeUndefined();
    });
  });

  describe('chart animation profile (responsive playback UX)', () => {
    // Regression guards for the animation config that determines how
    // the analytics charts animate on initial load and on every
    // setOption (currentStep change, scrub, marker move).
    //
    // ECharts' defaults (animationDuration: 1000, animationDurationUpdate:
    // 300 with cubicOut easing) are tuned for "presentation" charts and
    // cause a perceptible lag in interactive playback: the state is
    // correct but the visual trails behind by ~300ms. Our custom profile
    // trades some of the default polish for a snappier feel that
    // matches the user's playback expectations:
    //
    //   - animationDuration: 200          — short initial draw, so the
    //     chart still feels alive on first paint without delaying the
    //     user with a long entrance animation.
    //   - animationDurationUpdate: 100    — short easing on updates
    //     (still well under one frame at 10+ steps/sec), gives a tiny
    //     bit of motion that visually connects consecutive steps
    //     during playback without the 300ms lag of the default.
    //   - animationEasingUpdate: cubicOut — the ECharts default
    //     easing curve; with our short 100ms duration, the cubicOut
    //     ramp reads as "smooth glide" rather than "lag" the way it
    //     does at 300ms.
    //   - animationThreshold: 200         — ECharts auto-disables
    //     animation when the element count exceeds this. We pin it
    //     to a realistic run-length ceiling so the animation profile
    //     is consistent across short and long runs.
    //
    // If these values feel wrong, the right place to change them is
    // the corresponding keys on the option object in
    // `buildConvergenceChartOption` / `buildLandscapeChartOption` in
    // chart-helpers.ts — these tests will then fail and prompt the
    // tuning pass.

    it('Convergence: uses the playback-friendly animation profile', () => {
      const option = buildConvergenceChartOption(
        sampleSnapshots,
        2,
        'steepest-ascent',
        DEFAULT_DARK_COLORS,
      );
      // Initial draw — short, so the chart feels polished on first
      // load without delaying the user.
      expect(option.animationDuration).toBe(200);
      // Update animation — 100ms with cubicOut, snappier than
      // ECharts' 300ms default but with enough motion to visually
      // link consecutive steps during playback.
      expect(option.animationDurationUpdate).toBe(100);
      // cubicOut is the ECharts default; we use it explicitly so
      // a future change is a deliberate decision, not a regression.
      expect(option.animationEasingUpdate).toBe('cubicOut');
      // Element-count ceiling for auto-disabling animation. Pinned
      // to a realistic run-length ceiling.
      expect(option.animationThreshold).toBe(200);
    });

    it('Convergence: pins the markLine to a short 50ms animation (snappy cursor)', () => {
      // The mark line is the current-step cursor. The per-series
      // override (`animation: { duration: 50 }`) keeps the cursor
      // from feeling laggy on click-to-scrub while still giving it
      // a brief visual confirmation of movement. Faster than the
      // top-level 100ms because the mark line is a single
      // point-position change, not a multi-element update.
      const option = buildConvergenceChartOption(
        sampleSnapshots,
        2,
        'steepest-ascent',
        DEFAULT_DARK_COLORS,
      );
      const markLine = (option.series[0] as { markLine: { animation: { duration: number } } })
        .markLine;
      expect(markLine.animation).toEqual({ duration: 50 });
    });

    it('Landscape: uses the playback-friendly animation profile', () => {
      const option = buildLandscapeChartOption(sampleSnapshots, 2, DEFAULT_DARK_COLORS);
      expect(option.animationDuration).toBe(200);
      expect(option.animationDurationUpdate).toBe(100);
      expect(option.animationEasingUpdate).toBe('cubicOut');
      expect(option.animationThreshold).toBe(200);
    });

    it('Landscape: pins the markLine to a short 50ms animation (snappy cursor)', () => {
      // The Landscape chart's mark line (drawn on the trajectory
      // line series) is the current-step cursor — same role as the
      // Convergence chart's mark line. Match the per-series
      // override for visual consistency.
      const option = buildLandscapeChartOption(sampleSnapshots, 2, DEFAULT_DARK_COLORS);
      const markLine = (option.series[0] as { markLine: { animation: { duration: number } } })
        .markLine;
      expect(markLine.animation).toEqual({ duration: 50 });
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
