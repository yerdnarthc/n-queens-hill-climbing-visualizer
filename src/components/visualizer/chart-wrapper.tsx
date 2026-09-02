'use client';

import * as React from 'react';
import * as echarts from 'echarts';
import { useTheme } from 'next-themes';
import { DEFAULT_DARK_COLORS, DEFAULT_LIGHT_COLORS, type PhaseColors } from './chart-helpers';
import { computeFollowRange } from './use-follow-current-step';

export interface ChartWrapperProps {
  option: echarts.EChartsOption;
  height?: string | number;
  className?: string;
  onPointClick?: (stepIndex: number) => void;
  /**
   * Called when the user changes the X-axis zoom range via the dataZoom
   * slider or the inside-mousewheel interaction. The parent typically stores
   * this `{ start, end }` pair and feeds it back into the next option build
   * so the zoom is preserved across re-renders (e.g. animation frames).
   *
   * Not called on programmatic zoom changes or on the chart's initial state.
   */
  onZoomChange?: (range: { start: number; end: number }) => void;
  /**
   * Optional: when provided, the chart will auto-scroll the dataZoom
   * window horizontally to keep the marker at `currentStep` visible.
   *
   * The window is only **shifted** when the marker has scrolled past
   * either edge — the window width (and therefore the user's chosen
   * zoom level) is preserved across the scroll. The auto-scroll is
   * always-on: even if the user has zoomed in or panned to a custom
   * range, the chart will follow the marker. This matches the
   * "always follow" decision documented in the feature plan.
   *
   * When omitted (or when `followStep.currentStep` is out of range), the
   * wrapper does nothing and the chart's window is controlled only by
   * the user and the `option.dataZoom` config.
   */
  followStep?: {
    currentStep: number;
    firstStep: number;
    lastStep: number;
  };
  'data-testid'?: string;
}

/**
 * Reads the currently applied theme colors from the live CSS custom properties,
 * mirroring the Midnight Lab tokens. Falls back to the hardcoded theme defaults
 * when a custom property is not defined or the DOM is unavailable (SSR).
 */
function readThemeColors(isDark: boolean): PhaseColors {
  if (typeof window === 'undefined') {
    return isDark ? DEFAULT_DARK_COLORS : DEFAULT_LIGHT_COLORS;
  }

  try {
    const style = getComputedStyle(document.documentElement);
    const getVal = (varName: string, fallback: string) => {
      const val = style.getPropertyValue(varName).trim();
      return val || fallback;
    };

    const defaults = isDark ? DEFAULT_DARK_COLORS : DEFAULT_LIGHT_COLORS;

    return {
      improving: getVal('--feature-improving', defaults.improving),
      shoulder: getVal('--feature-shoulder', defaults.shoulder),
      worsening: getVal('--feature-conflict', defaults.worsening),
      restart: getVal('--feature-local-max', defaults.restart),
      initial: getVal('--primary', defaults.initial),
      globalMax: getVal('--feature-global-max', defaults.globalMax),
      primary: getVal('--primary', defaults.primary),
      grid: getVal('--chart-grid', defaults.grid),
      axis: getVal('--chart-axis', defaults.axis),
      card: getVal('--card', defaults.card),
      foreground: getVal('--foreground', defaults.foreground),
      muted: getVal('--muted-foreground', defaults.muted),
    };
  } catch {
    return isDark ? DEFAULT_DARK_COLORS : DEFAULT_LIGHT_COLORS;
  }
}

/**
 * Hook to resolve active theme colors matching Midnight Lab CSS variables.
 *
 * Watches the actual `dark`/`light` class on `<html>` and recomputes colors
 * in real time whenever it changes. This is required because `next-themes`
 * (with `attribute="class"`) flips the class on the `<html>` element in a
 * post-render effect that runs AFTER this component's own effects — and React
 * flushes child effects before parent effects. Reading `getComputedStyle`
 * during render (or in a local effect) would therefore capture the PREVIOUS
 * theme's CSS variables, leaving ECharts grid/axis colors stale until the
 * chart is remounted (e.g. by switching tabs). The MutationObserver reacts to
 * the class change itself, so it always reads the freshly-applied theme.
 */
export function useChartThemeColors(): PhaseColors {
  const { resolvedTheme } = useTheme();
  // Seed from the resolvedTheme so the first render is already correct and
  // consistent for SSR/hydration.
  const isDark = resolvedTheme === 'dark';

  const [colors, setColors] = React.useState<PhaseColors>(() => readThemeColors(isDark));

  React.useEffect(() => {
    const root = document.documentElement;
    const recompute = () => {
      setColors(readThemeColors(root.classList.contains('dark')));
    };

    // Synchronize once the component is mounted client-side (SSR guard) and
    // whenever the theme class on <html> actually changes.
    recompute();
    const observer = new MutationObserver(recompute);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return colors;
}

export function ChartWrapper({
  option,
  height: propsHeight = '280px',
  className = '',
  onPointClick,
  onZoomChange,
  followStep,
  'data-testid': testId = 'chart-wrapper',
}: ChartWrapperProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartInstanceRef = React.useRef<echarts.ECharts | null>(null);

  // Keep a ref to the latest onPointClick callback so we can register the ECharts
  // click handler exactly once (on init) while always calling the newest callback.
  // This avoids re-running the effect — and thus re-calling setOption with
  // notMerge:true on every render — when only the callback reference changes.
  const onPointClickRef = React.useRef(onPointClick);
  onPointClickRef.current = onPointClick;

  // Same stale-closure guard for the dataZoom handler. We register the
  // 'datazoom' event exactly once at init, and read the latest callback from
  // a ref at fire time so a re-render that only swaps `onZoomChange` doesn't
  // tear down + re-init the chart instance.
  const onZoomChangeRef = React.useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;

  // Track the most recent axisPointer value. ECharts dispatches
  // 'updateAxisPointer' every time the user moves the cursor over the
  // chart and the axisPointer is shown (i.e. tooltip.trigger is 'axis').
  // The payload includes `axesInfo[].value` — the snapped step number
  // for the X axis. We store it so the click handler can fall back to it
  // when the click misses a marker (the Landscape chart's scatter series
  // doesn't emit `dataIndex` for clicks on empty space).
  const lastAxisPointerValueRef = React.useRef<number | null>(null);

  // Initialize and update ECharts instance
  React.useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Create chart instance if not already present
      if (!chartInstanceRef.current) {
        const width = containerRef.current.clientWidth || 600;
        const height =
          containerRef.current.clientHeight ||
          (typeof propsHeight === 'number' ? propsHeight : parseInt(propsHeight, 10) || 280);

        chartInstanceRef.current = echarts.init(containerRef.current, undefined, {
          renderer: 'canvas',
          width,
          height,
        });

        // Track the axisPointer's snapped value as the user moves the
        // cursor. Registered once at init; reads no React state, so no
        // stale-closure concerns. ECharts emits this action via
        // `dispatchAction({ type: 'updateAxisPointer', ... })` from its
        // internal axisPointer handler on every mousemove that lands on
        // the plot area, and `chart.on('updateAxisPointer', ...)` is the
        // public API for subscribing to those dispatches.
        chartInstanceRef.current.on('updateAxisPointer', (params: unknown) => {
          const p = params as { axesInfo?: Array<{ value?: number | string }> };
          if (!Array.isArray(p.axesInfo) || p.axesInfo.length === 0) return;
          // We only care about the X axis value. The X axis is the one
          // that holds the step number; the Y axis holds the conflict
          // count and is irrelevant to click-to-scrub. axesInfo[0] is
          // conventionally the X axis when the chart has a single xAxis
          // (which is true for both of our analytics charts).
          for (const info of p.axesInfo) {
            if (typeof info.value === 'number') {
              lastAxisPointerValueRef.current = info.value;
              break;
            }
          }
        });

        // Bind click event for time travel — registered once, reads latest callback from ref
        chartInstanceRef.current.on('click', (params: unknown) => {
          const p = params as { dataIndex?: number; value?: unknown };
          const handler = onPointClickRef.current;
          if (!handler) return;
          // Path 1: the click hit a series element directly. For the
          // Convergence line series this always succeeds; for the
          // Landscape scatter series this only succeeds when the click
          // lands on a marker.
          if (typeof p.dataIndex === 'number') {
            handler(p.dataIndex);
            return;
          }
          if (Array.isArray(p.value) && typeof p.value[0] === 'number') {
            handler(p.value[0]);
            return;
          }
          // Path 2: the click landed in the empty space between markers
          // (or on the axisPointer line itself). Fall back to the last
          // known axisPointer value — the snapped step the user was
          // hovering over. This is the fix for the "click in the gaps
          // doesn't register" UX issue on the Landscape chart.
          if (lastAxisPointerValueRef.current !== null) {
            handler(lastAxisPointerValueRef.current);
          }
        });

        // Bind dataZoom event for X-axis zoom preservation — registered once.
        // The 'datazoom' event fires on both the slider drag and the
        // inside-mousewheel/pinch interactions. The payload's `batch` array
        // contains `{ start, end, startValue, endValue }` for the active
        // dataZoom components. We forward the first entry's percentage range
        // to the parent so it can be baked into the next option build.
        chartInstanceRef.current.on('datazoom', () => {
          const handler = onZoomChangeRef.current;
          if (!handler) return;
          const chart = chartInstanceRef.current;
          if (!chart) return;
          const currentOption = chart.getOption();
          // ECharts getOption() returns a plain object where dataZoom is the
          // first-class option key (or an array, depending on usage).
          const dataZoom = (currentOption as { dataZoom?: unknown }).dataZoom;
          if (!Array.isArray(dataZoom) || dataZoom.length === 0) return;
          // We use the slider entry (index 1) for the visible range since
          // it's the user-facing one; fall back to the first entry if needed.
          const sliderEntry = (dataZoom[1] ?? dataZoom[0]) as
            { start?: number; end?: number } | undefined;
          if (!sliderEntry) return;
          const start = typeof sliderEntry.start === 'number' ? sliderEntry.start : 0;
          const end = typeof sliderEntry.end === 'number' ? sliderEntry.end : 100;
          handler({ start, end });
        });
      }

      // Use merge mode (notMerge: false) instead of replacement mode (notMerge: true).
      // With notMerge: true, ECharts disposes old series data and creates new data on
      // every setOption call. If a mousemove event fires during that brief disposal
      // window on a still-present graphic element, ECharts calls getDataParams() which
      // calls getData() → returns undefined → throws:
      //   "Cannot read properties of undefined (reading 'getRawIndex')"
      // Merge mode updates data in-place, keeping getData() valid throughout.
      // See: https://github.com/apache/echarts/issues/21535
      chartInstanceRef.current.setOption(option, { notMerge: false, lazyUpdate: true });
    } catch (err) {
      // In SSR / jsdom test environments where canvas is not supported
      console.warn('ECharts initialization notice:', err);
    }
  }, [option, propsHeight]);

  // Auto-scroll the dataZoom window to keep the current-step marker
  // visible. This is the "follow the cursor" feature: as playback
  // advances and the marker would scroll off the right edge of the
  // visible plot area, we shift the dataZoom window to bring the
  // marker back into view.
  //
  // We use `dispatchAction` (not `setOption`) for two reasons:
  //   1. dispatchAction is the ECharts-blessed API for programmatic
  //      dataZoom updates. It updates the slider entry in place and
  //      does NOT rebuild the chart's option tree, so the rest of
  //      the chart (markers, axes, tooltip) is untouched.
  //   2. It avoids re-running the setOption effect above (which
  //      merges the full option) — a setOption call would also
  //      trigger an unnecessary chart re-render.
  //
  // The `dataZoomIndex: 1` selector targets the slider entry, which
  // is the same one the `datazoom` event handler reports to the
  // parent. The `inside` dataZoom (index 0) is left untouched.
  //
  // We depend on the followStep fields individually rather than the
  // object reference to avoid re-firing the effect on every parent
  // re-render — the parent (ConvergenceChart, LandscapeChart) builds
  // a new object on every render, but its fields only change when
  // the underlying data actually changes.
  React.useEffect(() => {
    if (!followStep) return;
    const chart = chartInstanceRef.current;
    if (!chart) return;

    // Read the current slider entry. This is the same fallback chain
    // the `datazoom` event handler uses (slider at index 1, or fall
    // back to the first entry if ECharts ever returns a single-entry
    // dataZoom).
    const opt = chart.getOption() as { dataZoom?: Array<{ start?: number; end?: number }> };
    const dz = opt.dataZoom?.[1] ?? opt.dataZoom?.[0];
    if (!dz) return;
    const currentStart = typeof dz.start === 'number' ? dz.start : 0;
    const currentEnd = typeof dz.end === 'number' ? dz.end : 100;

    const next = computeFollowRange({
      currentStep: followStep.currentStep,
      firstStep: followStep.firstStep,
      lastStep: followStep.lastStep,
      currentStart,
      currentEnd,
    });

    // `next === null` means the marker is already in view (or the
    // inputs are degenerate) — short-circuit to avoid a no-op
    // dispatchAction. This is the critical infinite-loop guard: the
    // dispatchAction does fire `datazoom` and propagate up to the
    // parent, but since the new range equals the current range, the
    // parent won't re-render with new data, and we won't re-fire
    // this effect.
    if (next === null) return;

    chart.dispatchAction({
      type: 'dataZoom',
      dataZoomIndex: 1,
      // Use `start`/`end` (percent) rather than `startValue`/`endValue`
      // (data values). The slider entry is on a 0–100 percent scale,
      // and `computeFollowRange` already returns percent values.
      start: next.start,
      end: next.end,
    });
  }, [followStep?.currentStep, followStep?.firstStep, followStep?.lastStep]);

  // Handle auto-resizing with ResizeObserver
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      chartInstanceRef.current?.resize();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Cleanup chart on unmount
  React.useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      className={`w-full overflow-hidden ${className}`}
      style={{
        height: propsHeight,
        minHeight: typeof propsHeight === 'number' ? `${propsHeight}px` : propsHeight,
      }}
    />
  );
}
