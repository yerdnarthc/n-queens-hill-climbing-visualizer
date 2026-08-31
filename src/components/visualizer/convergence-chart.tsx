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

  const option = React.useMemo(() => {
    if (!result || result.snapshots.length === 0) {
      return {};
    }
    return buildConvergenceChartOption(result.snapshots, currentStep, strategy, colors);
  }, [result, currentStep, strategy, colors]);

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
        data-testid="convergence-echarts"
      />
    </div>
  );
}
