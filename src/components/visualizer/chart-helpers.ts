import type { Snapshot, SnapshotPhase, StrategyId } from '@/lib/engine';

export interface PhaseColors {
  improving: string;
  shoulder: string;
  worsening: string;
  restart: string;
  initial: string;
  globalMax: string;
  primary: string;
  /**
   * Color for the "current step" cursor — the vertical markLine + its
   * "Step N" label that shows where the user is in the playback. Distinct
   * from `initial` (which is the color of an algorithm snapshot in the
   * 'initial' phase). The two are conceptually different even though both
   * were previously aliased to the same value.
   */
  cursor: string;
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
  initial: '#cbd0f5', // violet-400
  globalMax: '#34d399', // emerald-400
  primary: '#8b5cf6', // violet-500
  cursor: '#cbd0f5', // pale lavender — high-contrast against dark backgrounds
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
  cursor: '#8665fc', // mid violet — visible against light backgrounds
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
      // 8px from the bottom edge of the chart (was 4) — gives the
      // slider a bit more breathing room from the bottom border and
      // reads as visually balanced against the 14% top padding.
      bottom: 8,
      height: 28,
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
        fontSize: 14,
        fontFamily: 'Chivo Mono, monospace',
        position: 'insideEndTop' as const,
      },
    }));

  // Current step indicator line
  const currentStepMarkLine = {
    xAxis: currentStep,
    lineStyle: {
      color: colors.cursor,
      type: 'solid' as const,
      width: 1,
    },
    label: {
      show: true,
      formatter: `Step ${currentStep}`,
      color: colors.cursor,
      fontFamily: 'Chivo Mono, monospace',
      fontSize: 12,
      fontWeight: 'bold' as const,
      position: 'end' as const,
    },
  };

  const markLines = [...restartMarkLines, currentStepMarkLine];

  // Per-point data with phase-specific shape, size, and glow styling.
  // Mirrors the Landscape chart's `scatterData` so the two charts feel
  // like a coherent pair. The series below is still a `type: 'line'`
  // (Approach A from the earlier plan): the line is drawn between
  // consecutive points, and the per-point symbol/itemStyle give each
  // point its own shape, size, and glow — the same way the Landscape
  // chart's scatter series does. ECharts supports per-point styling
  // in line series data items natively.
  const seriesData = snapshots.map((s) => {
    const isSolved = s.conflicts === 0;
    const isCurrent = s.step === currentStep;
    const color = getPhaseColor(s.phase, s.conflicts, colors);

    // Phase-specific shape. Solved → star (the global optimum), restart
    // → triangle, shoulder → diamond, everything else → circle. This
    // is identical to the Landscape chart's per-phase symbol logic.
    let symbol: 'star' | 'triangle' | 'diamond' | 'circle' = 'circle';
    // Baseline size: 8 for sparse runs (markers stay prominent and easy
    // to read), 6 for dense runs (>50 points — the smaller size prevents
    // the chart from becoming a blobby mass of overlapping circles).
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
    // +5 headroom for the current step. This is the same logic the
    // Landscape chart uses, so the "selected marker is bigger" affordance
    // is consistent across both analytics views.
    if (isCurrent) size += 5;

    return {
      name: `Step ${s.step}`,
      // The `as const` here is essential: without it, TypeScript widens
      // `[number, number]` to `number[]` (a generic array), which causes
      // the per-point `data` to be inferred as `{ value: number[]; ... }[]`.
      // Consumers (click handler, tooltip formatter, tests) need the
      // narrow 2-tuple so they can read `value[0]` as the step number.
      value: [s.step, s.conflicts] as [number, number],
      symbol,
      symbolSize: size,
      itemStyle: {
        color,
        // Glow effect on the current step. Identical to the Landscape
        // chart: 2px border in the foreground color, 8px shadow blur
        // in the marker color (so the glow tints with the phase).
        borderColor: isCurrent ? colors.foreground : 'transparent',
        borderWidth: isCurrent ? 2 : 0,
        shadowBlur: isCurrent ? 8 : 0,
        shadowColor: isCurrent ? color : 'transparent',
      },
    };
  });

  return {
    backgroundColor: 'transparent',
    // ──────────────────────────────────────────────────────────────────
    // Animation config (responsive playback UX)
    // ──────────────────────────────────────────────────────────────────
    // ECharts' default animation suite (animationDuration: 1000 for
    // initial render, animationDurationUpdate: 300 with cubicOut
    // easing for every subsequent data update, animationThreshold:
    // 2000) is tuned for "presentation" charts. For an interactive
    // playback scrubber that's actively driven by the user, those
    // defaults produce a perceptible lag: clicking a point advances
    // the state instantly, but the current-step mark line visibly
    // slides into its new position over 300ms; scrubbing the slider
    // triggers the same 300ms easing on every step, causing the
    // marker to trail the cursor.
    //
    // We override this for a playback-friendly profile:
    //   - animationDuration: 200     — short initial draw so the
    //     chart still feels alive when it first appears, but doesn't
    //     delay the user with a long entrance animation.
    //   - animationDurationUpdate: 0 — all updates (currentStep
    //     change, marker move, axis label re-position, grid line
    //     shift, tooltip show/hide) snap instantly with zero
    //     interpolation. The state IS the visual; there's nothing
    //     to ease toward.
    //   - animationEasingUpdate: 'linear' — defensive. With duration
    //     0 the easing is moot, but if a future change bumps the
    //     duration back up, 'linear' is the predictable choice
    //     (no cubicOut ramp that reads as "lag").
    //   - animationThreshold: 5000   — ECharts auto-disables
    //     animation when the element count exceeds this. We
    //     explicitly set it to a value well above any realistic run
    //     length (200–500 steps is typical, our largest fixtures
    //     have ~250 points) so the animation profile is consistent
    //     across short and long runs.
    animationDuration: 200,
    animationDurationUpdate: 100,
    animationEasingUpdate: 'cubicOut',
    animationThreshold: 200,
    // X-axis-only zoom — see `buildDataZoomConfig` for the rationale behind
    // `xAxisIndex: 0`, `zoomLock: true`, and `filterMode: 'filter'`.
    dataZoom: buildDataZoomConfig(colors, zoomRange),
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.card,
      borderColor: colors.grid,
      textStyle: { color: colors.foreground, fontSize: 14 },
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

        let html = `<div style="font-weight:600;margin-bottom:6px;font-family:var(--font-sora-sans), sans-serif;font-size:0.75rem;">Step ${snap.step}</div>`;
        html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;font-family:var(--font-sora-sans), sans-serif;font-size:0.6rem;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${phaseColor};"></span>
          <span>${phaseName}</span>
        </div>`;
        html += `<div style="font-family:var(--font-sora-sans), sans-serif;font-size:0.6rem;"><strong>Conflicts:</strong> ${snap.conflicts}</div>`;

        if (snap.move) {
          html += `<div style="color:${colors.muted};font-size:0.6rem;font-family:var(--font-chivo-mono), monospace;margin-top:2px;">
            Col ${snap.move.column}: Row ${snap.move.fromRow} &rarr; ${snap.move.toRow} (Δ ${snap.move.deltaConflicts})
          </div>`;
        }

        if (snap.temperature !== null) {
          html += `<div style="color:${colors.worsening};font-size:0.6rem;font-family:var(--font-chivo-mono), monospace;margin-top:2px;">
            <strong>Temp:</strong> ${snap.temperature.toFixed(3)}
          </div>`;
        }

        if (snap.restartCount > 0) {
          html += `<div style="color:${colors.restart};font-size:0.6rem;font-family:var(--font-chivo-mono), monospace;margin-top:2px;">
            <strong>Restart attempt:</strong> #${snap.restartCount} (iter ${snap.iterationInRestart})
          </div>`;
        }

        return html;
      },
    },
    grid: {
      left: '3%',
      right: hasSaData ? '6%' : '4%',
      // `top: 20%` (was 14%, originally 12%) gives the yAxis name
      // ("Conflicts h(s)" or "Temperature T") and the axisPointer
      // label plenty of room to breathe at the top of the chart. At
      // 270px chart height, 20% = ~54px, which comfortably holds the
      // axis name (12px) + the axisPointer label with its padding
      // (~25px) + breathing room.
      // `bottom: 20%` (was 12%) makes room for the xAxis name
      // ("Step") and the dataZoom slider (18px) without them
      // colliding. The yAxis names stay at the top (their natural
      // position via ECharts' default 'end' nameLocation), so the
      // bottom region only has the xAxis name and the slider — the
      // 20% bottom padding is enough.
      top: '15%',
      bottom: '20%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: steps,
      boundaryGap: false,
      axisLine: { lineStyle: { color: colors.grid } },
      axisLabel: { color: colors.axis, fontSize: 13, fontFamily: 'Chivo Mono, monospace' },
      splitLine: { show: true, lineStyle: { color: colors.grid, type: 'dotted' } },
      name: 'Step',
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: { color: colors.axis, fontSize: 12, fontFamily: 'Chivo Mono, monospace' },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Conflicts h(s)',
        // `nameGap: 30` (vs ECharts' default of 15) adds a little extra
        // vertical breathing room between this yAxis name and the top
        // of the plot area. The name sits at the top of the axis via
        // ECharts' default `nameLocation: 'end'`, so increasing
        // `nameGap` pushes the visible text label further up — exactly
        // the spacing we want between the "Conflicts h(s)" label and
        // the chart contents below it. We don't bump it higher (e.g.
        // 30+) because the yAxis name is short and the chart already
        // reserves 15% top padding via `grid.top: '15%'`.
        nameGap: 30,
        // No `nameLocation` set — we use ECharts' default ('end'), which
        // for a value axis places the name at the TOP of the axis
        // (where the high values are). This is the conventional
        // position for yAxis names. The previous attempt to move
        // yAxis names to the bottom (nameLocation: 'start') crowded
        // the xAxis name and the dataZoom slider region, so the
        // names are back at the top — and we make the top region
        // roomy enough (grid.top: '15%') to prevent collision with
        // the axisPointer label.
        nameTextStyle: {
          color: colors.axis,
          fontSize: 12,
          fontFamily: 'Chivo Mono, monospace',
          align: 'center',
          padding: [0, -30, 0, 0], // top/right/bottom/left
        },
        axisLine: { lineStyle: { color: colors.grid } },
        axisLabel: {
          color: colors.axis,
          fontSize: 13,
          fontFamily: 'Chivo Mono, monospace',
          margin: 15,
        },
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
              // `nameGap: 30` (vs ECharts' default of 15) matches the
              // primary "Conflicts h(s)" yAxis so both axis names sit
              // at a consistent vertical distance from the top of the
              // plot area. This is the gap between the visible name
              // text and the top axis line; increasing it pushes the
              // "Temperature T" label further up away from the
              // chart contents below it.
              nameGap: 30,
              // Same reasoning as the primary yAxis: no `nameLocation`
              // set so the name uses ECharts' default ('end' = top of
              // axis). The top region has been padded (grid.top: '15%')
              // to give the yAxis name and the axisPointer label plenty
              // of room to breathe. `align: 'right'` keeps the text
              // right-anchored to the right side of the chart.
              nameTextStyle: {
                color: colors.worsening,
                fontSize: 12,
                fontFamily: 'Chivo Mono, monospace',
                align: 'center',
                padding: [0, -30, 0, 0], // top/right/bottom/left
              },
              axisLine: { lineStyle: { color: colors.worsening } },
              axisLabel: {
                color: colors.worsening,
                fontSize: 13,
                fontFamily: 'Chivo Mono, monospace',
                margin: 20,
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
        // Per-point data (see seriesData above). Each data item carries
        // its own `symbol`, `symbolSize`, and `itemStyle` (including the
        // glow effect for the current step). ECharts draws the line
        // between consecutive points and renders each marker per its
        // per-point styling. The series no longer needs top-level
        // `symbol`, `symbolSize`, or `itemStyle.color` because the
        // per-point data items carry all of that information.
        data: seriesData,
        smooth: false,
        lineStyle: {
          // Mirrors the Landscape chart's "Trajectory Path" line so the two
          // analytics charts feel like a coherent pair. The thinner
          // semi-transparent line lets the per-step markers read as the
          // primary visual element rather than getting visually overpowered
          // by a thick fully-opaque line.
          color: colors.primary,
          width: 2,
          opacity: 0.6,
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
          // `animation: false` on the markLine specifically — even
          // though the top-level `animationDurationUpdate: 0` already
          // kills update animations globally, this is a defensive
          // override that pins the mark-line cursor to "snap" mode
          // permanently. The mark line is a UI cursor element, not
          // a data transition; it should never ease between positions.
          animation: { duration: 50 },
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
    // Baseline size: 8 for sparse runs (markers stay prominent and easy to
    // read), 6 for dense runs (>60 points — the smaller size prevents the
    // chart from becoming a blobby mass of overlapping circles). The +5
    // headroom below further emphasizes the current-step marker.
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
    // ──────────────────────────────────────────────────────────────────
    // Animation config (responsive playback UX)
    // ──────────────────────────────────────────────────────────────────
    // Mirrors the Convergence chart's profile. See that file's section
    // for the full rationale — in short: ECharts' default 300ms update
    // animation makes the current-step marker visibly trail the
    // playback cursor. We snap updates to zero duration so the visual
    // tracks the state exactly, while keeping a 200ms initial draw so
    // the chart still feels alive when it first appears.
    animationDuration: 200,
    animationDurationUpdate: 100,
    animationEasingUpdate: 'cubicOut',
    animationThreshold: 200,
    // X-axis-only zoom — see `buildDataZoomConfig` for the rationale behind
    // `xAxisIndex: 0`, `zoomLock: true`, and `filterMode: 'filter'`.
    dataZoom: buildDataZoomConfig(colors, zoomRange),
    tooltip: {
      // Mirror the Convergence chart's interaction model: 'axis' trigger
      // + axisPointer.snap: true gives users a vertical dashed line that
      // "sticks" to the nearest data point as the cursor moves, and shows
      // the tooltip anywhere on the plot (not only on direct marker hits).
      // With our category xAxis, snap is a no-op for the line position
      // itself — the line already snaps to category boundaries — but the
      // explicit `snap: true` documents the intent and is future-proof
      // if the xAxis type ever changes.
      //
      // The previous 'item' trigger made the chart feel "dead" between
      // markers: the tooltip only appeared when the cursor was directly
      // over an 8–13px marker, and click-to-scrub in the empty space
      // did nothing. This is exactly the UX inconsistency the user
      // flagged against the smoother Convergence chart.
      trigger: 'axis',
      backgroundColor: colors.card,
      borderColor: colors.grid,
      textStyle: { color: colors.foreground, fontSize: 12 },
      axisPointer: {
        type: 'line',
        snap: true,
        lineStyle: { color: colors.primary, width: 1.5, type: 'dashed' },
      },
      formatter: (params: unknown) => {
        // With `trigger: 'axis'`, ECharts passes an array (one entry per
        // series). The landscape chart has a single scatter series, so
        // the first element is the relevant hit. This matches the pattern
        // already used by the Convergence chart's tooltip formatter.
        const arr = params as Array<{ dataIndex: number }>;
        const item = Array.isArray(arr) ? arr[0] : (params as { dataIndex: number });
        if (!item || typeof item.dataIndex !== 'number') return '';
        const snap = snapshots[item.dataIndex];
        if (!snap) return '';

        const phaseColor = getPhaseColor(snap.phase, snap.conflicts, colors);
        const phaseName = getPhaseLabel(snap.phase, snap.conflicts);

        let html = `<div style="font-weight:600;margin-bottom:6px;font-family:var(--font-sora-sans), sans-serif;font-size:0.75rem;">Landscape Step ${snap.step}</div>`;
        html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;font-family:var(--font-sora-sans), sans-serif;font-size:0.6rem;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${phaseColor};"></span>
          <span><strong>${phaseName}</strong></span>
        </div>`;
        html += `<div style="font-family:var(--font-sora-sans), sans-serif;font-size:0.6rem;"><strong>Objective h(s):</strong> ${snap.conflicts} conflicts</div>`;

        if (snap.move) {
          html += `<div style="color:${colors.muted};font-size:0.6rem;font-family:var(--font-chivo-mono), monospace;margin-top:2px;">
            Queen col ${snap.move.column}: row ${snap.move.fromRow} &rarr; ${snap.move.toRow}
            (Δ = ${snap.move.deltaConflicts}, evaluated ${snap.move.evaluatedMoves} moves)
          </div>`;
        }

        if (snap.restartCount > 0) {
          html += `<div style="color:${colors.restart};font-size:0.6rem;font-family:var(--font-chivo-mono), monospace;margin-top:2px;">
            Restart #${snap.restartCount} · step ${snap.iterationInRestart}
          </div>`;
        }

        return html;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      // Mirrors the Convergence chart's spacing: `top: 20%` gives the
      // yAxis name ("Conflicts (Attacking Pairs)") and the
      // axisPointer label room to breathe. `bottom: 20%` makes
      // room for the xAxis name and the dataZoom slider. The
      // yAxis name stays at the top via ECharts' default 'end'
      // nameLocation.
      top: '15%',
      bottom: '20%',
      containLabel: true,
    },
    xAxis: {
      // Use a category axis (mirroring the Convergence chart) instead of a
      // value axis so the trajectory line touches the left and right edges
      // of the plot area. With `type: 'value'`, ECharts draws the line
      // only between actual data points and pads the visible window with
      // "nice" tick rounding — which leaves a visible gap on both sides
      // when the user zooms in. A category axis with `boundaryGap: false`
      // treats each step as an evenly-spaced band with no padding, so the
      // first data point sits at the leftmost edge and the last at the
      // rightmost. Tick labels become clean integers (0, 1, 2, ...).
      //
      // DataZoom still works identically: dataZoom operates on the
      // category index in the same way it operated on the value range.
      // The markLine for the current step and the tooltip's value[0] for
      // click-to-scrub are also unchanged.
      type: 'category',
      data: steps,
      boundaryGap: false,
      name: 'Step Iteration',
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: { color: colors.axis, fontSize: 12, fontFamily: 'Chivo Mono, monospace' },
      axisLine: { lineStyle: { color: colors.grid } },
      axisLabel: { color: colors.axis, fontSize: 13, fontFamily: 'Chivo Mono, monospace' },
      splitLine: { show: true, lineStyle: { color: colors.grid, type: 'dotted' } },
    },
    yAxis: {
      type: 'value',
      name: 'Conflicts (Attacking Pairs)',
      // `nameGap: 30` (vs ECharts' default of 15) adds a little extra
      // vertical breathing room between this yAxis name and the top
      // of the plot area. The name sits at the top of the axis via
      // ECharts' default `nameLocation: 'end'`, so increasing
      // `nameGap` pushes the visible text label further up — exactly
      // the spacing we want between the "Conflicts (Attacking
      // Pairs)" label and the chart contents below it. Matches the
      // value used by the Convergence chart's yAxes for visual
      // consistency across both analytics views.
      nameGap: 30,
      // No `nameLocation` set — we use ECharts' default ('end'), which
      // places the name at the TOP of the axis. The top region is
      // padded with grid.top: '15%' to give the name and the
      // axisPointer label room to breathe without collision.
      nameTextStyle: {
        color: colors.axis,
        fontSize: 12,
        align: 'center',
        fontFamily: 'Chivo Mono, monospace',
        padding: [0, 0, 0, 115], // top/right/bottom/left
      },
      axisLine: { lineStyle: { color: colors.grid } },
      axisLabel: {
        color: colors.axis,
        fontSize: 13,
        fontFamily: 'Chivo Mono, monospace',
        margin: 15,
      },
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
                color: colors.cursor,
                type: 'solid' as const,
                width: 1,
              },
              label: {
                formatter: `Step ${currentStep}`,
                color: colors.cursor,
                fontSize: 11,
                fontWeight: 'bold' as const,
                position: 'end' as const,
              },
            },
          ],
          silent: true,
          // Defensive snap-mode override for the current-step mark
          // line. See the Convergence chart's markLine comment for
          // the full rationale — the mark line is a UI cursor
          // element, not a data transition.
          animation: { duration: 50 },
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
