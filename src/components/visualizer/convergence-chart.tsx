'use client';

import * as React from 'react';
import { useSimulationStore } from '@/store';
import { ChartWrapper, useChartThemeColors } from './chart-wrapper';
import { buildConvergenceChartOption } from './chart-helpers';

export interface ConvergenceChartProps {
  height?: string | number;
  className?: string;
}

export function ConvergenceChart({ height = '260px', className = '' }: ConvergenceChartProps) {
  const result = useSimulationStore((s) => s.result);
  const currentStep = useSimulationStore((s) => s.currentStep);
  const strategy = useSimulationStore((s) => s.config.strategy);
  const jumpTo = useSimulationStore((s) => s.jumpTo);
  const colors = useChartThemeColors();

  // X-axis zoom preservation. We keep the slider/inside-zoom range across
  // re-renders (which happen on every animation frame) by feeding it back
  // into the next option build. Per design decision: when a new run starts
  // and `result.totalSteps` differs from the previously-saved range's run
  // key, we reset the range to the full 0–100 default. When the step count
  // matches (e.g. user re-runs the same seed), we keep their zoom window.
  const [zoomRange, setZoomRange] = React.useState<{
    start: number;
    end: number;
    runKey: number;
  } | null>(null);
  const effectiveZoomRange = React.useMemo(() => {
    if (!zoomRange || !result) return null;
    // Run-key mismatch: a new run with a different total step count has
    // invalidated the saved range's meaning — reset.
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
        onZoomChange={(range) => {
          // Tag the saved range with the current run's totalSteps so the
          // run-key check above can decide whether to preserve or reset on
          // the next option build.
          setZoomRange({ ...range, runKey: result.totalSteps });
        }}
        data-testid="convergence-echarts"
      />
    </div>
  );
}
