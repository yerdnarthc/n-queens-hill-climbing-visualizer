'use client';

import * as React from 'react';
import { useSimulationStore } from '@/store';
import { ChartWrapper, useChartThemeColors } from './chart-wrapper';
import { buildConvergenceChartOption } from './chart-helpers';

export interface ConvergenceChartProps {
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

export function ConvergenceChart({
  height = '260px',
  className = '',
  zoomRange,
  onZoomChange,
}: ConvergenceChartProps) {
  const result = useSimulationStore((s) => s.result);
  const currentStep = useSimulationStore((s) => s.currentStep);
  const strategy = useSimulationStore((s) => s.config.strategy);
  const jumpTo = useSimulationStore((s) => s.jumpTo);
  const colors = useChartThemeColors();

  // Run-key invalidation: the parent tags the saved range with the run's
  // totalSteps. If the user starts a new run with a different step count,
  // the range's meaning is invalidated — reset to the full 0–100 default
  // by returning null. When the user re-runs the same seed, the step
  // count matches and the range is preserved across tab switches.
  const effectiveZoomRange = React.useMemo(() => {
    if (!zoomRange || !result) return null;
    if (zoomRange.runKey !== result.totalSteps) return null;
    return { start: zoomRange.start, end: zoomRange.end };
  }, [zoomRange, result]);

  const option = React.useMemo(() => {
    if (!result || result.snapshots.length === 0) {
      return {};
    }
    return buildConvergenceChartOption(
      result.snapshots,
      currentStep,
      strategy,
      colors,
      effectiveZoomRange,
    );
  }, [result, currentStep, strategy, colors, effectiveZoomRange]);

  if (!result || result.snapshots.length === 0) {
    return (
      <div
        data-testid="convergence-chart-empty"
        className="flex h-[260px] w-full items-center justify-center rounded-xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground"
      >
        No simulation data available. Start or configure a run above.
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col ${className}`} data-testid="convergence-chart">
      <ChartWrapper
        option={option}
        height={height}
        onPointClick={(step) => {
          if (step >= 0 && step <= result.totalSteps) {
            jumpTo(step);
          }
        }}
        onZoomChange={onZoomChange}
        data-testid="convergence-echarts"
      />
    </div>
  );
}
