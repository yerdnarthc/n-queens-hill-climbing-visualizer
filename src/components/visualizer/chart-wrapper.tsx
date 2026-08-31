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
 * Hook to resolve active theme colors matching Midnight Lab CSS variables.
 */
export function useChartThemeColors(): PhaseColors {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return React.useMemo(() => {
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
  }, [isDark]);
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

        // Bind click event for time travel
        if (onPointClick) {
          chartInstanceRef.current.on('click', (params: unknown) => {
            const p = params as { dataIndex?: number; value?: unknown };
            if (typeof p.dataIndex === 'number') {
              onPointClick(p.dataIndex);
            } else if (Array.isArray(p.value) && typeof p.value[0] === 'number') {
              onPointClick(p.value[0]);
            }
          });
        }
      }

      chartInstanceRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
    } catch (err) {
      // In SSR / jsdom test environments where canvas is not supported
      console.warn('ECharts initialization notice:', err);
    }
  }, [option, onPointClick, propsHeight]);

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
