'use client';

import * as React from 'react';
import { useSimulationStore } from '@/store';
import { ChartWrapper, useChartThemeColors } from './chart-wrapper';
import { buildLandscapeChartOption } from './chart-helpers';

export interface LandscapeChartProps {
  height?: string | number;
  className?: string;
  /**
   * Saved X-axis zoom range from the parent (AnalyticsPanel). Lifted up
   * so the zoom level survives tab switches — see AnalyticsPanel for
   * the full rationale. When `null`, the chart starts at the full 0–100
   * range.
   */
  zoomRange: { start: number; end: number; runKey: number } | null;
  /**
   * Called when the user changes the X-axis zoom. The parent tags the
   * range with the current run's totalSteps and feeds it back as the
   * `zoomRange` prop, so the run-key check can decide whether to preserve
   * or reset on the next option build.
   */
  onZoomChange: (range: { start: number; end: number }) => void;
}

export function LandscapeChart({
  height = '260px',
  className = '',
  zoomRange,
  onZoomChange,
}: LandscapeChartProps) {
  const result = useSimulationStore((s) => s.result);
  const currentStep = useSimulationStore((s) => s.currentStep);
  const jumpTo = useSimulationStore((s) => s.jumpTo);
  const colors = useChartThemeColors();

  // Run-key invalidation — see ConvergenceChart for the full rationale.
  // The parent owns the zoom state and tags it with the run's totalSteps;
  // we only return a non-null effective range when the saved runKey still
  // matches the current run.
  const effectiveZoomRange = React.useMemo(() => {
    if (!zoomRange || !result) return null;
    if (zoomRange.runKey !== result.totalSteps) return null;
    return { start: zoomRange.start, end: zoomRange.end };
  }, [zoomRange, result]);

  const option = React.useMemo(() => {
    if (!result || result.snapshots.length === 0) {
      return {};
    }
    return buildLandscapeChartOption(result.snapshots, currentStep, colors, effectiveZoomRange);
  }, [result, currentStep, colors, effectiveZoomRange]);

  if (!result || result.snapshots.length === 0) {
    return (
      <div
        data-testid="landscape-chart-empty"
        className="flex h-[260px] w-full items-center justify-center rounded-xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground"
      >
        No simulation data available. Start or configure a run above.
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col ${className}`} data-testid="landscape-chart">
      <ChartWrapper
        option={option}
        height={height}
        onPointClick={(step) => {
          if (step >= 0 && step <= result.totalSteps) {
            jumpTo(step);
          }
        }}
        onZoomChange={onZoomChange}
        data-testid="landscape-echarts"
      />
    </div>
  );
}
