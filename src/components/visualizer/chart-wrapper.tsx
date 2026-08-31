'use client';

import * as React from 'react';
import * as echarts from 'echarts';
import { useTheme } from 'next-themes';
import { DEFAULT_DARK_COLORS, DEFAULT_LIGHT_COLORS, type PhaseColors } from './chart-helpers';

export interface ChartWrapperProps {
  option: echarts.EChartsOption;
  height?: string | number;
  className?: string;
  onPointClick?: (stepIndex: number) => void;
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

        // Bind click event for time travel — registered once, reads latest callback from ref
        chartInstanceRef.current.on('click', (params: unknown) => {
          const p = params as { dataIndex?: number; value?: unknown };
          const handler = onPointClickRef.current;
          if (!handler) return;
          if (typeof p.dataIndex === 'number') {
            handler(p.dataIndex);
          } else if (Array.isArray(p.value) && typeof p.value[0] === 'number') {
            handler(p.value[0]);
          }
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
