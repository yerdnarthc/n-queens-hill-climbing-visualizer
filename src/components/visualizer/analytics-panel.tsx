'use client';

import * as React from 'react';
import { useSimulationStore } from '@/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConvergenceChart } from './convergence-chart';
import { LandscapeChart } from './landscape-chart';
import { useChartThemeColors } from './chart-wrapper';
import { computeRunAnalytics, getPhaseColor, getPhaseLabel } from './chart-helpers';
import { downloadRunCsv } from '@/lib/csv-export';
import { Math } from '@/components/ui/math';
import {
  Activity,
  LineChart,
  Mountain,
  TrendingDown,
  MousePointerClick,
  Info,
  Download,
} from 'lucide-react';

export interface AnalyticsPanelProps {
  /**
   * `bare` strips the outer card chrome (rounded border, padding, header
   * block with the "Analytics & Optimization" title) so the panel can be
   * nested inside another container — e.g. the workspace card on the
   * visualizer home page, where the board + analytics share one frame.
   *
   * Default `false` keeps the original full chrome (used by tests and
   * any future context that hosts the panel standalone).
   *
   * The `data-testid="analytics-panel"` is ALWAYS present (so test
   * selectors keep working), but the class on the outer wrapper changes
   * based on `bare`.
   */
  bare?: boolean;
}

export function AnalyticsPanel({ bare = false }: AnalyticsPanelProps = {}) {
  const result = useSimulationStore((s) => s.result);
  const currentStep = useSimulationStore((s) => s.currentStep);
  const strategy = useSimulationStore((s) => s.config.strategy);
  const colors = useChartThemeColors();

  const currentSnapshot = result?.snapshots[currentStep] ?? null;

  const analytics = React.useMemo(() => {
    if (!result) return null;
    return computeRunAnalytics(
      result.snapshots,
      result.totalEvaluatedMoves,
      result.bestConflicts,
      result.restarts,
    );
  }, [result]);

  const activePhaseColor = currentSnapshot
    ? getPhaseColor(currentSnapshot.phase, currentSnapshot.conflicts, colors)
    : colors.primary;

  const activePhaseLabel = currentSnapshot
    ? getPhaseLabel(currentSnapshot.phase, currentSnapshot.conflicts)
    : 'Ready';

  // Shared zoom range for the analytics charts. Lifted up from the chart
  // components so the zoom level survives tab switches — Radix Tabs
  // unmounts the inactive tab's chart by default, which would otherwise
  // destroy the chart's local useState and reset the dataZoom to the
  // full 0–100 range whenever the user toggled between Convergence and
  // Landscape. Owning the state here (where it never unmounts) preserves
  // it across tab switches.
  //
  // The `runKey` tagging is preserved from the chart components' original
  // implementation: when a new run produces a different total step
  // count, the saved range's meaning is invalidated and the chart resets
  // to the full range. When the user re-runs the same seed, the range
  // is preserved.
  const [sharedZoomRange, setSharedZoomRange] = React.useState<{
    start: number;
    end: number;
    runKey: number;
  } | null>(null);

  const handleZoomChange = React.useCallback(
    (range: { start: number; end: number }) => {
      const totalSteps = result?.totalSteps ?? 0;
      setSharedZoomRange({ ...range, runKey: totalSteps });
    },
    [result?.totalSteps],
  );

  return (
    <div
      data-testid="analytics-panel"
      data-bare={bare ? 'true' : 'false'}
      className={
        bare
          ? // Nested inside the workspace card — no extra border / padding.
            'flex flex-col gap-3'
          : // Standalone card chrome (default).
            'flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm backdrop-blur-sm sm:p-5'
      }
    >
      {/* Header with Title & Quick Active State Badges — hidden when bare */}
      {!bare && (
        <div className="flex items-center gap-3 border-b border-border/50 pr-2">
          {/* Left side: title block + current-state indicators grouped together.
              `min-w-0` lets the cluster shrink (and the inner sub-label
              truncate if needed) instead of forcing the row to wrap; the
              right-side button is `shrink-0` and `ml-auto` so it always
              stays pinned to the right edge regardless of cluster width. */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LineChart className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Analytics & Optimization</h2>
                <p className="text-[0.65rem] text-muted-foreground">
                  Real-time heuristic convergence, energy trajectory & phase diagnostics
                </p>
              </div>
            </div>
          </div>

          {/* Right side: Export CSV button alone. `shrink-0` keeps it from
              being squashed if the left cluster gets wide; `ml-auto` pins
              it to the right edge of the row. The outer row's `pr-2` adds
              the requested generous padding from the container's right
              edge so it doesn't over-bleed. `disabled` handles the
              no-result case. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => result && downloadRunCsv(result)}
            disabled={!result}
            aria-label="Export run as CSV"
            title="Download the full snapshot history as CSV"
            className="ml-auto h-7 shrink-0 gap-1.5 rounded-lg px-2.5 text-[0.65rem]"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      )}

      {/* Current State Indicator (only when a result exists) */}
      {currentSnapshot && (
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 border-border/80 bg-card/1 px-2.5 py-1 text-[0.65rem]"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activePhaseColor }} />
            <span className="font-medium">{activePhaseLabel}</span>
          </Badge>
          <Badge variant="secondary" className="bg-card/1 px-2 py-1 text-[0.65rem]">
            h(s) = <strong className="ml-1 text-foreground">{currentSnapshot.conflicts}</strong>
          </Badge>
        </div>
      )}

      {/* Bare-mode compact toolbar: shows the active phase badge + CSV export
          when the panel is nested inside the workspace card (no big header). */}
      {bare && currentSnapshot && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 border-border/80 bg-card/1 px-2.5 py-1 text-[0.65rem]"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activePhaseColor }} />
            <span className="font-medium">{activePhaseLabel}</span>
          </Badge>
          <Badge variant="secondary" className="bg-card/1 px-2 py-1 text-[0.65rem]">
            h(s) = <strong className="ml-1 text-foreground">{currentSnapshot.conflicts}</strong>
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => result && downloadRunCsv(result)}
            disabled={!result}
            aria-label="Export run as CSV"
            title="Download the full snapshot history as CSV"
            className="h-7 gap-1.5 rounded-lg px-2.5 text-[0.65rem]"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      )}

      {/* Tabs: Convergence Curve vs Landscape View vs Diagnostics */}
      <Tabs defaultValue="convergence" className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="grid grid-cols-3 bg-card/1">
            <TabsTrigger value="convergence" className="gap-1.5 text-[0.65rem]">
              <TrendingDown className="h-3 w-3" />
              <span>Convergence</span>
            </TabsTrigger>
            <TabsTrigger value="landscape" className="gap-1.5 text-[0.65rem]">
              <Mountain className="h-3 w-3" />
              <span>Landscape</span>
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="gap-1.5 text-[0.65rem]">
              <Activity className="h-3 w-3" />
              <span>Diagnostics</span>
            </TabsTrigger>
          </TabsList>

          <div className="hidden items-center gap-1 text-[0.65rem] text-muted-foreground sm:flex">
            <MousePointerClick className="h-3 w-3" />
            <span>Click chart to scrub step</span>
          </div>
        </div>

        {/* 1. Convergence Chart Content */}
        <TabsContent value="convergence" className="mt-3 flex flex-col gap-2">
          <div className="rounded-xl border border-border/40 bg-card p-2 dark:bg-background/70">
            <ConvergenceChart
              height={420}
              zoomRange={sharedZoomRange}
              onZoomChange={handleZoomChange}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-18 text-[0.65rem] text-muted-foreground">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Conflicts <Math>h(s)</Math>
              </span>
              {strategy === 'simulated-annealing' && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-conflict" /> Temp <Math>T</Math>
                </span>
              )}
              {result && result.restarts > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-local-max" /> Restarts
                </span>
              )}
            </div>
            <span>
              Trajectory baseline at <Math>h=0</Math> (Global Optimum)
            </span>
          </div>
        </TabsContent>

        {/* 2. Optimization Landscape Content */}
        <TabsContent value="landscape" className="mt-3 flex flex-col gap-2">
          <div className="rounded-xl border border-border/40 bg-card p-2 dark:bg-background/70">
            <LandscapeChart
              height={420}
              zoomRange={sharedZoomRange}
              onZoomChange={handleZoomChange}
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 px-10 text-[0.65rem] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-6">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-improving" /> Improving
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-shoulder" /> Shoulder
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-conflict" /> Exploration
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-local-max" /> Restart
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-global-max" /> Solved
              </span>
            </div>
          </div>
        </TabsContent>

        {/* 3. Run Diagnostics & Metrics Breakdown */}
        <TabsContent value="diagnostics" className="mt-3 flex flex-col gap-3">
          {analytics ? (
            <div className="flex flex-col gap-4">
              {/* Stat Summary Grid */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="flex flex-col rounded-xl border border-border/10 bg-card/1 p-3">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                    Initial Conflicts
                  </span>
                  <span className="text-xl font-semibold text-foreground">
                    {analytics.initialConflicts}
                  </span>
                  <span className="font-mono text-[0.6rem] text-muted-foreground">
                    Starting seed board
                  </span>
                </div>

                <div className="flex flex-col rounded-xl border border-border/50 bg-background/30 p-3">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                    Best Reached
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-semibold text-green-pill">
                      {analytics.bestConflicts}
                    </span>
                    {analytics.bestConflicts === 0 && (
                      <Badge
                        variant="default"
                        className="bg-global-max px-1 py-0 text-[0.6rem] text-primary-foreground"
                      >
                        SOLVED
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-[0.6rem] text-muted-foreground">
                    Δ {analytics.conflictDelta} reduction
                  </span>
                </div>

                <div className="flex flex-col rounded-xl border border-border/10 bg-card/1 p-3">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                    Total Steps
                  </span>
                  <span className="text-xl font-semibold text-foreground">
                    {analytics.totalSteps}
                  </span>
                  <span className="font-mono text-[0.6rem] text-muted-foreground">
                    Across all attempts
                  </span>
                </div>

                <div className="flex flex-col rounded-xl border border-border/50 bg-background/30 p-3">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                    Avg Eval / Step
                  </span>
                  <span className="text-xl font-semibold text-foreground">
                    {analytics.avgEvaluatedPerStep}
                  </span>
                  <span className="font-mono text-[0.6rem] text-muted-foreground">
                    Neighbour moves checked
                  </span>
                </div>
              </div>

              {/* Phase Distribution Breakdown */}
              <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-background/30 p-3.5">
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-foreground">
                  <span className="flex items-center gap-1.5">
                    <span>Search Phase Breakdown</span>
                  </span>
                  <span className="font-mono text-[0.7rem] text-muted-foreground">
                    {analytics.distribution.totalMoves} total moves
                  </span>
                </div>

                {/* Progress Bar Stack */}
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    style={{ width: `${analytics.distribution.improvingPct}%` }}
                    className="bg-improving transition-all"
                    title={`Improving: ${analytics.distribution.improving} (${analytics.distribution.improvingPct}%)`}
                  />
                  <div
                    style={{ width: `${analytics.distribution.shoulderPct}%` }}
                    className="bg-shoulder transition-all"
                    title={`Shoulder: ${analytics.distribution.shoulder} (${analytics.distribution.shoulderPct}%)`}
                  />
                  <div
                    style={{ width: `${analytics.distribution.worseningPct}%` }}
                    className="bg-conflict transition-all"
                    title={`Worsening: ${analytics.distribution.worsening} (${analytics.distribution.worseningPct}%)`}
                  />
                  <div
                    style={{ width: `${analytics.distribution.restartPct}%` }}
                    className="bg-local-max transition-all"
                    title={`Restarts: ${analytics.distribution.restart} (${analytics.distribution.restartPct}%)`}
                  />
                </div>

                {/* Legend & Percentages */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[0.7rem] sm:grid-cols-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-improving" />
                    <span>
                      Improving: <strong>{analytics.distribution.improvingPct}%</strong> (
                      {analytics.distribution.improving})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-shoulder" />
                    <span>
                      Shoulder: <strong>{analytics.distribution.shoulderPct}%</strong> (
                      {analytics.distribution.shoulder})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-conflict" />
                    <span>
                      Worsening: <strong>{analytics.distribution.worseningPct}%</strong> (
                      {analytics.distribution.worsening})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-local-max" />
                    <span>
                      Restarts: <strong>{analytics.distribution.restartPct}%</strong> (
                      {analytics.distribution.restart})
                    </span>
                  </div>
                </div>
              </div>

              {/* Informational Footer */}
              <div className="flex items-center gap-2 rounded-lg border border-border/10 bg-card/1 p-2.5 text-[0.6rem] text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  Deterministic replay guaranteed. Every simulation step is captured immutably with
                  its full board state, conflict evaluator delta, and move cost metrics.
                </span>
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              Run simulation to view diagnostics.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
