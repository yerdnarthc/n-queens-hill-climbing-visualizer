import type { Snapshot, SnapshotPhase, StrategyId } from '@/lib/engine';

export interface PhaseColors {
  improving: string;
  shoulder: string;
  worsening: string;
  restart: string;
  initial: string;
  globalMax: string;
  primary: string;
  grid: string;
  axis: string;
  card: string;
  foreground: string;
  muted: string;
}

export const DEFAULT_DARK_COLORS: PhaseColors = {
  improving: '#38bdf8', // sky-400
  shoulder: '#fdba74', // orange-300
  worsening: '#fb7185', // rose-400
  restart: '#fbbf24', // amber-400
  initial: '#a78bfa', // violet-400
  globalMax: '#34d399', // emerald-400
  primary: '#8b5cf6', // violet-500
  grid: '#1e293b', // slate-800
  axis: '#94a3b8', // slate-400
  card: '#111827', // gray-900
  foreground: '#e2e8f0', // slate-200
  muted: '#64748b', // slate-500
};

export const DEFAULT_LIGHT_COLORS: PhaseColors = {
  improving: '#0284c7', // sky-600
  shoulder: '#f97316', // orange-500
  worsening: '#f43f5e', // rose-500
  restart: '#d97706', // amber-600
  initial: '#7c3aed', // violet-600
  globalMax: '#059669', // emerald-600
  primary: '#7c3aed', // violet-600
  grid: '#e2e8f0', // slate-200
  axis: '#64748b', // slate-500
  card: '#ffffff',
  foreground: '#0f172a', // slate-900
  muted: '#94a3b8', // slate-400
};

/**
 * Returns color for a snapshot phase, taking global solution (conflicts === 0) into account.
 */
export function getPhaseColor(
  phase: SnapshotPhase,
  conflicts: number,
  colors: PhaseColors = DEFAULT_DARK_COLORS,
): string {
  if (conflicts === 0) {
    return colors.globalMax;
  }
  switch (phase) {
    case 'improving':
      return colors.improving;
    case 'shoulder':
      return colors.shoulder;
    case 'worsening':
      return colors.worsening;
    case 'restart':
      return colors.restart;
    case 'initial':
    default:
      return colors.initial;
  }
}

/**
 * Returns human-readable label for a snapshot phase.
 */
export function getPhaseLabel(phase: SnapshotPhase, conflicts: number): string {
  if (conflicts === 0) {
    return 'Global Optimum (Solved)';
  }
  switch (phase) {
    case 'improving':
      return 'Improving (Δ < 0)';
    case 'shoulder':
      return 'Plateau / Shoulder (Δ = 0)';
    case 'worsening':
      return 'Worsening / Exploration (Δ > 0)';
    case 'restart':
      return 'Random Restart';
    case 'initial':
      return 'Initial State';
    default:
      return phase;
  }
}

/**
 * Builds the ECharts `dataZoom` configuration block used by every analytics
 * chart. We provide two zoom interactions stacked into a single config entry:
 *
 * 1. `type: 'inside'`  — wheel-zoom and pinch-zoom on the plot area itself,
 *    no extra UI. `zoomLock: true` constrains the interaction to the X axis,
 *    so trackpad gestures can't accidentally rescale the Y (conflict) domain.
 *
 * 2. `type: 'slider'`  — a small drag-handle bar rendered inside the chart at
 *    the bottom (`bottom: 4`, `height: 18`). This is the most discoverable
 *    affordance for users who don't realize they can scroll-wheel-zoom.
 *
 * Both entries use `xAxisIndex: 0` (X axis only) and `filterMode: 'filter'`,
 * which samples the series along X without rescaling the Y axis — i.e. the
 * Y range always remains `[0, maxConflicts]` regardless of zoom state.
 *
 * `zoomRange` is an optional `{ start, end }` from the parent (preserved
 * across re-renders). When null, the slider starts at the full 0–100 range.
 */
export function buildDataZoomConfig(
  colors: PhaseColors,
  zoomRange: { start: number; end: number } | null = null,
) {
  const start = zoomRange?.start ?? 0;
  const end = zoomRange?.end ?? 100;
  return [
    {
      type: 'inside',
      xAxisIndex: 0,
      zoomLock: true, // X-axis only — prevent accidental Y rescale on pinch
      moveOnMouseMove: true,
      zoomOnMouseWheel: true,
      filterMode: 'filter',
    },
    {
      type: 'slider',
      xAxisIndex: 0,
      bottom: 4,
      height: 18,
      start,
      end,
      filterMode: 'filter',
      borderColor: 'transparent',
      backgroundColor: 'transparent',
      // The "filler" is the band between the two handles — the user's
      // currently-visible window. A faint primary tint reads as "this is
      // what you're looking at" without overpowering the chart.
      fillerColor: withAlpha(colors.primary, 0.18),
      handleStyle: {
        color: colors.primary,
        borderColor: colors.primary,
      },
      moveHandleStyle: {
        color: colors.primary,
        opacity: 0.6,
      },
      // Visual ghost of the underlying series inside the slider rail —
      // gives the user a sense of where the data is dense.
      selectedDataBackground: {
        lineStyle: { color: colors.primary, opacity: 0.5, width: 1 },
        areaStyle: { color: withAlpha(colors.primary, 0.18) },
      },
      dataBackground: {
        lineStyle: { color: colors.axis, opacity: 0.45 },
        areaStyle: { color: withAlpha(colors.axis, 0.12) },
      },
      textStyle: { color: colors.axis, fontSize: 10 },
      showDetail: false,
    },
  ];
}

export interface PhaseDistribution {
  improving: number;
  shoulder: number;
  worsening: number;
  restart: number;
  totalMoves: number;
  improvingPct: number;
  shoulderPct: number;
  worseningPct: number;
  restartPct: number;
}

/**
 * Computes breakdown of search steps across phases.
 */
/**
 * Applies an alpha (0-1) to a hex color string (#RRGGBB or #RRGGBBAA) and
 * returns the resulting hex color. Used by the dataZoom slider styling so
 * the handles and filler can pick up theme colors with custom transparency
 * without committing to a fixed opacity in CSS variables.
 */
export function withAlpha(hex: string, alpha: number): string {
  const clamp = Math.max(0, Math.min(1, alpha));
  // Expand 3-digit shorthand (#abc) to 6-digit form (#aabbcc)
  const normalized = hex.replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i, '#$1$1$2$2$3$3');
  const m = /^#[0-9a-f]{6}$/i.exec(normalized);
  if (!m) return hex;
  const a = Math.round(clamp * 255)
    .toString(16)
    .padStart(2, '0');
  return `${normalized}${a}`;
}

export function computePhaseDistribution(snapshots: readonly Snapshot[]): PhaseDistribution {
  let improving = 0;
  let shoulder = 0;
  let worsening = 0;
  let restart = 0;

  for (const s of snapshots) {
    if (s.phase === 'improving') improving++;
    else if (s.phase === 'shoulder') shoulder++;
    else if (s.phase === 'worsening') worsening++;
    else if (s.phase === 'restart') restart++;
  }

  const totalMoves = improving + shoulder + worsening + restart;
  const safeTotal = totalMoves > 0 ? totalMoves : 1;

  return {
    improving,
    shoulder,
    worsening,
    restart,
    totalMoves,
    improvingPct: Math.round((improving / safeTotal) * 100),
    shoulderPct: Math.round((shoulder / safeTotal) * 100),
    worseningPct: Math.round((worsening / safeTotal) * 100),
    restartPct: Math.round((restart / safeTotal) * 100),
  };
}

export interface RunAnalyticsSummary {
  initialConflicts: number;
  finalConflicts: number;
  bestConflicts: number;
  conflictDelta: number;
  totalSteps: number;
  restarts: number;
  avgEvaluatedPerStep: number;
  distribution: PhaseDistribution;
}

export function computeRunAnalytics(
  snapshots: readonly Snapshot[],
  totalEvaluatedMoves = 0,
  bestConflicts = 0,
  restarts = 0,
): RunAnalyticsSummary {
  const initialConflicts = snapshots.length > 0 ? snapshots[0].conflicts : 0;
  const finalConflicts = snapshots.length > 0 ? snapshots[snapshots.length - 1].conflicts : 0;
  const conflictDelta = initialConflicts - bestConflicts;
  const totalSteps = Math.max(0, snapshots.length - 1);
  const avgEvaluatedPerStep =
    totalSteps > 0 ? Math.round((totalEvaluatedMoves / totalSteps) * 10) / 10 : 0;
  const distribution = computePhaseDistribution(snapshots);

  return {
    initialConflicts,
    finalConflicts,
    bestConflicts,
    conflictDelta,
    totalSteps,
    restarts,
    avgEvaluatedPerStep,
    distribution,
  };
}

/**
 * Builds ECharts option for the Convergence Chart ($h(s)$ trajectory & SA Temperature).
 */
export function buildConvergenceChartOption(
  snapshots: readonly Snapshot[],
  currentStep: number,
  strategy: StrategyId,
  colors: PhaseColors = DEFAULT_DARK_COLORS,
  zoomRange: { start: number; end: number } | null = null,
) {
  const steps = snapshots.map((s) => s.step);
  const conflictData = snapshots.map((s) => s.conflicts);
  const isSa = strategy === 'simulated-annealing';
  const hasSaData = isSa && snapshots.some((s) => s.temperature !== null);
  const temperatureData = hasSaData ? snapshots.map((s) => s.temperature ?? 0) : [];

  // Pin both Y-axis ranges to the full-run domain so they stay steady
  // regardless of the dataZoom X-window. Without explicit `max`, ECharts
  // re-computes a "nice" upper bound from the *filtered* (post-dataZoom)
  // series, which causes the Y-axis to rescale as the user scrubs — making
  // relative trajectory shape hard to compare across windows. See the
  // ECharts `AxisProxy._filterData` source: `selectRange` physically
  // removes out-of-window points, and the Y-axis extent is then derived
  // from whatever's left. Setting `max` explicitly (and `scale: false`
  // for clarity) opts the axis out of the auto-nice rescale.
  // We use `Math.max(0, ...)` to guard against the all-solved run edge
  // case (conflictData === [0, 0, 0, ...]) where `Math.max(...arr)` returns
  // -Infinity, and add a small headroom (+1) so the highest marker isn't
  // flush against the top edge of the plot.
  const maxConflictsRaw = conflictData.length > 0 ? Math.max(...conflictData) : 0;
  const yAxisMaxConflicts = Math.max(1, maxConflictsRaw + 1);
  const maxTempRaw = temperatureData.length > 0 ? Math.max(...temperatureData) : 0;
  const yAxisMaxTemp = Math.max(0.1, Math.round((maxTempRaw + 0.1) * 100) / 100);

  // Restart step mark lines
  const restartMarkLines = snapshots
    .filter((s) => s.phase === 'restart')
    .map((s) => ({
      xAxis: s.step,
      lineStyle: {
        color: colors.restart,
        type: 'dashed' as const,
        width: 1.5,
      },
      label: {
        formatter: `Restart #${s.restartCount}`,
        color: colors.restart,
        fontSize: 10,
        position: 'insideEndTop' as const,
      },
    }));

  // Current step indicator line
  const currentStepMarkLine = {
    xAxis: currentStep,
    lineStyle: {
      color: colors.improving,
      type: 'solid' as const,
      width: 2,
    },
    label: {
      show: true,
      formatter: `Step ${currentStep}`,
      color: colors.improving,
      fontSize: 11,
      fontWeight: 'bold' as const,
      position: 'end' as const,
    },
  };

  const markLines = [...restartMarkLines, currentStepMarkLine];

  return {
    backgroundColor: 'transparent',
    // X-axis-only zoom — see `buildDataZoomConfig` for the rationale behind
    // `xAxisIndex: 0`, `zoomLock: true`, and `filterMode: 'filter'`.
    dataZoom: buildDataZoomConfig(colors, zoomRange),
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.card,
      borderColor: colors.grid,
      textStyle: { color: colors.foreground, fontSize: 12 },
      axisPointer: {
        type: 'line',
        lineStyle: { color: colors.primary, width: 1.5, type: 'dashed' },
      },
      formatter: (params: unknown) => {
        if (!Array.isArray(params) || params.length === 0) return '';
        const stepIdx = params[0].dataIndex;
        const snap = snapshots[stepIdx];
        if (!snap) return '';

        const phaseColor = getPhaseColor(snap.phase, snap.conflicts, colors);
        const phaseName = getPhaseLabel(snap.phase, snap.conflicts);

        let html = `<div style="font-weight:600;margin-bottom:4px;">Step ${snap.step}</div>`;
        html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${phaseColor};"></span>
          <span>${phaseName}</span>
        </div>`;
        html += `<div><strong>Conflicts:</strong> ${snap.conflicts}</div>`;

        if (snap.move) {
          html += `<div style="color:${colors.muted};font-size:11px;margin-top:2px;">
            Col ${snap.move.column}: Row ${snap.move.fromRow} &rarr; ${snap.move.toRow} (Δ ${snap.move.deltaConflicts})
          </div>`;
        }

        if (snap.temperature !== null) {
          html += `<div style="color:${colors.worsening};font-size:11px;">
            <strong>Temp:</strong> ${snap.temperature.toFixed(3)}
          </div>`;
        }

        if (snap.restartCount > 0) {
          html += `<div style="color:${colors.restart};font-size:11px;">
            <strong>Restart attempt:</strong> #${snap.restartCount} (iter ${snap.iterationInRestart})
          </div>`;
        }

        return html;
      },
    },
    grid: {
      left: '3%',
      right: hasSaData ? '6%' : '4%',
      top: '12%',
      bottom: '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: steps,
      boundaryGap: false,
      axisLine: { lineStyle: { color: colors.grid } },
      axisLabel: { color: colors.axis, fontSize: 11 },
      splitLine: { show: true, lineStyle: { color: colors.grid, type: 'dotted' } },
      name: 'Step',
      nameLocation: 'middle',
      nameGap: 24,
      nameTextStyle: { color: colors.axis, fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Conflicts h(s)',
        nameTextStyle: { color: colors.axis, fontSize: 11, align: 'left' },
        axisLine: { lineStyle: { color: colors.grid } },
        axisLabel: { color: colors.axis, fontSize: 11 },
        splitLine: { lineStyle: { color: colors.grid } },
        // Pinned: see the yAxisMaxConflicts computation above. Together
        // with `scale: false` (the default) this keeps the Y-axis
        // visually steady as the user scrubs and zooms the X window.
        min: 0,
        max: yAxisMaxConflicts,
        scale: false,
      },
      ...(hasSaData
        ? [
            {
              type: 'value',
              name: 'Temperature T',
              nameTextStyle: { color: colors.worsening, fontSize: 11, align: 'right' },
              axisLine: { lineStyle: { color: colors.worsening } },
              axisLabel: {
                color: colors.worsening,
                fontSize: 10,
                formatter: (val: number) => val.toFixed(1),
              },
              splitLine: { show: false },
              position: 'right' as const,
              // Pinned (mirrors the primary conflicts axis): the user must
              // see the temperature drop on a fixed scale across the run.
              min: 0,
              max: yAxisMaxTemp,
              scale: false,
            },
          ]
        : []),
    ],
    series: [
      {
        name: 'Conflicts',
        type: 'line',
        yAxisIndex: 0,
        data: conflictData,
        smooth: false,
        symbol: 'circle',
        symbolSize: (value: number, params: { dataIndex: number }) => {
          // Current step: most prominent. Otherwise: modest bump from the
          // pre-zoom sizes (4 → 6, and never hidden for dense runs) so the
          // points stay readable now that the dataZoom slider is available
          // for further inspection.
          if (params.dataIndex === currentStep) return 9;
          return snapshots.length > 50 ? 4 : 6;
        },
        itemStyle: {
          color: (params: { dataIndex: number }) => {
            const snap = snapshots[params.dataIndex];
            return snap ? getPhaseColor(snap.phase, snap.conflicts, colors) : colors.primary;
          },
        },
        lineStyle: {
          color: colors.primary,
          width: 2.5,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${colors.primary}44` },
              { offset: 1, color: `${colors.primary}05` },
            ],
          },
        },
        markLine: {
          symbol: ['none', 'none'],
          data: markLines,
          silent: true,
        },
      },
      ...(hasSaData
        ? [
            {
              name: 'Temperature',
              type: 'line',
              yAxisIndex: 1,
              data: temperatureData,
              smooth: true,
              showSymbol: false,
              lineStyle: {
                color: colors.worsening,
                width: 1.5,
                type: 'dashed' as const,
              },
            },
          ]
        : []),
    ],
  };
}

/**
 * Builds ECharts option for the Optimization Landscape Chart ($h(s)$ trajectory with phase markers).
 */
export function buildLandscapeChartOption(
  snapshots: readonly Snapshot[],
  currentStep: number,
  colors: PhaseColors = DEFAULT_DARK_COLORS,
  zoomRange: { start: number; end: number } | null = null,
) {
  const steps = snapshots.map((s) => s.step);

  // Pin the Y-axis to the full-run conflicts max. See the matching comment
  // in `buildConvergenceChartOption` for the full rationale: without an
  // explicit `max`, ECharts derives the upper bound from the post-dataZoom
  // filtered series, which makes the Y-axis rescale as the user scrubs.
  // +1 headroom so the highest marker isn't flush against the top edge.
  const maxConflictsRaw = snapshots.length > 0 ? Math.max(...snapshots.map((s) => s.conflicts)) : 0;
  const yAxisMaxConflicts = Math.max(1, maxConflictsRaw + 1);

  const scatterData = snapshots.map((s) => {
    const isCurrent = s.step === currentStep;
    const isSolved = s.conflicts === 0;
    const color = getPhaseColor(s.phase, s.conflicts, colors);

    let symbol = 'circle';
    // Bumped from `>60 ? 5 : 7` to `>60 ? 6 : 8` so dense runs stay readable
    // now that the dataZoom slider lets the user inspect any range in detail.
    let size = snapshots.length > 60 ? 6 : 8;

    if (isSolved) {
      symbol = 'star';
      size = 13;
    } else if (s.phase === 'restart') {
      symbol = 'triangle';
      size = 10;
    } else if (s.phase === 'shoulder') {
      symbol = 'diamond';
      size = 8;
    }

    if (isCurrent) {
      size += 5;
    }

    return {
      name: `Step ${s.step}`,
      value: [s.step, s.conflicts],
      symbol,
      symbolSize: size,
      itemStyle: {
        color,
        borderColor: isCurrent ? colors.foreground : 'transparent',
        borderWidth: isCurrent ? 2 : 0,
        shadowBlur: isCurrent ? 8 : 0,
        shadowColor: color,
      },
    };
  });

  return {
    backgroundColor: 'transparent',
    // X-axis-only zoom — see `buildDataZoomConfig` for the rationale behind
    // `xAxisIndex: 0`, `zoomLock: true`, and `filterMode: 'filter'`.
    dataZoom: buildDataZoomConfig(colors, zoomRange),
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.card,
      borderColor: colors.grid,
      textStyle: { color: colors.foreground, fontSize: 12 },
      formatter: (params: unknown) => {
        const item = params as { dataIndex: number };
        const snap = snapshots[item.dataIndex];
        if (!snap) return '';

        const phaseColor = getPhaseColor(snap.phase, snap.conflicts, colors);
        const phaseName = getPhaseLabel(snap.phase, snap.conflicts);

        let html = `<div style="font-weight:600;margin-bottom:4px;">Landscape Step ${snap.step}</div>`;
        html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${phaseColor};"></span>
          <span><strong>${phaseName}</strong></span>
        </div>`;
        html += `<div><strong>Objective h(s):</strong> ${snap.conflicts} conflicts</div>`;

        if (snap.move) {
          html += `<div style="color:${colors.muted};font-size:11px;margin-top:2px;">
            Queen col ${snap.move.column}: row ${snap.move.fromRow} &rarr; ${snap.move.toRow}
            (Δ = ${snap.move.deltaConflicts}, evaluated ${snap.move.evaluatedMoves} moves)
          </div>`;
        }

        if (snap.restartCount > 0) {
          html += `<div style="color:${colors.restart};font-size:11px;">
            Restart #${snap.restartCount} · step ${snap.iterationInRestart}
          </div>`;
        }

        return html;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      top: '12%',
      bottom: '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: 'Step Iteration',
      nameLocation: 'middle',
      nameGap: 24,
      nameTextStyle: { color: colors.axis, fontSize: 11 },
      min: 0,
      max: Math.max(1, steps.length - 1),
      axisLine: { lineStyle: { color: colors.grid } },
      axisLabel: { color: colors.axis, fontSize: 11 },
      splitLine: { show: true, lineStyle: { color: colors.grid, type: 'dotted' } },
    },
    yAxis: {
      type: 'value',
      name: 'Conflicts (Attacking Pairs)',
      nameTextStyle: { color: colors.axis, fontSize: 11, align: 'left' },
      axisLine: { lineStyle: { color: colors.grid } },
      axisLabel: { color: colors.axis, fontSize: 11 },
      splitLine: { lineStyle: { color: colors.grid } },
      // Pinned to the full-run max (see yAxisMaxConflicts above). The
      // `scale: false` makes the intent explicit — we never want the
      // Y-axis to "auto-fit" the visible X window.
      min: 0,
      max: yAxisMaxConflicts,
      scale: false,
    },
    series: [
      {
        name: 'Trajectory Path',
        type: 'line',
        data: snapshots.map((s) => [s.step, s.conflicts]),
        smooth: false,
        showSymbol: false,
        lineStyle: {
          color: colors.primary,
          width: 2,
          opacity: 0.6,
        },
        markLine: {
          symbol: ['none', 'none'],
          data: [
            {
              xAxis: currentStep,
              lineStyle: {
                color: colors.improving,
                type: 'solid' as const,
                width: 2,
              },
              label: {
                formatter: `Step ${currentStep}`,
                color: colors.improving,
                fontSize: 10,
                position: 'end' as const,
              },
            },
          ],
          silent: true,
        },
      },
      {
        name: 'Search States',
        type: 'scatter',
        data: scatterData,
        z: 3,
      },
    ],
  };
}
