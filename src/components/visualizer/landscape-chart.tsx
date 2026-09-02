'use client';

import * as React from 'react';
import { useSimulationStore } from '@/store';
import { ChartWrapper, useChartThemeColors } from './chart-wrapper';
import { buildLandscapeChartOption } from './chart-helpers';

export interface LandscapeChartProps {
  height?: string | number;
  className?: string;
}

export function LandscapeChart({ height = '260px', className = '' }: LandscapeChartProps) {
  const result = useSimulationStore((s) => s.result);
  const currentStep = useSimulationStore((s) => s.currentStep);
  const jumpTo = useSimulationStore((s) => s.jumpTo);
  const colors = useChartThemeColors();

  // X-axis zoom preservation — see ConvergenceChart for the full rationale.
  // Each chart owns its own zoom state because Radix Tabs unmounts the
  // inactive tab's chart instance, so the ranges are tab-local by design.
  const [zoomRange, setZoomRange] = React.useState<{
    start: number;
    end: number;
    runKey: number;
  } | null>(null);
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
        onZoomChange={(range) => {
          setZoomRange({ ...range, runKey: result.totalSteps });
        }}
        data-testid="landscape-echarts"
      />
    </div>
  );
}
