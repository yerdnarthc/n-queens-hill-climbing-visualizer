'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { useSimulationStore, selectResult, selectSnapshot, selectTotalSteps } from '@/store';
import type { RunStatus, SnapshotPhase } from '@/lib/engine';

/**
 * StatsRail — the five live metric cards that ride alongside the chessboard.
 *
 * Two layout variants:
 *   - "rail"    : vertical flex of 5 equally-tall cards (used on lg+ inside
 *                 the chessboard card, taking the left ~28% of the frame).
 *   - "compact" : horizontal single-row strip of 5 condensed chips (used on
 *                 <lg viewports above the board, horizontally scrollable).
 *
 * No icons inside the cards — color + text do the work. The status/phase
 * badges already carry semantic color encoding (emerald = solved, amber =
 * stagnated, rose = worsening, sky = improving, violet = restart) which
 * reads cleanly without the icon clutter.
 */

const STATUS_CONFIG: Record<
  RunStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
  }
> = {
  solved: {
    label: 'Solved (Global Opt)',
    variant: 'default',
    className:
      'bg-green-pill hover:bg-green-pill/90 text-white shadow-xs dark:bg-green-pill dark:text-white font-medium text-[0.7rem] px-2.5 py-0.5',
  },
  stagnated: {
    label: 'Stagnated (Local Max)',
    variant: 'outline',
    className:
      'border-amber-500/20 bg-yellow-500/15 text-amber-600 dark:text-amber-400 text-[0.7rem] font-medium px-2.5 py-0.5',
  },
  exhausted: {
    label: 'Step Limit Hit',
    variant: 'destructive',
    className:
      'bg-rose-pill/8 border-rose-500/10 text-rose-600 dark:bg-rose-pill/20 dark:text-rose-ls-200 font-medium text-[0.7rem] px-2.5 py-0.5',
  },
  frozen: {
    label: 'Frozen (SA Tmin)',
    variant: 'outline',
    className:
      'border-blue-ls-200/20 bg-sky-500/10 text-sky-600 dark:text-blue-ls-200 font-medium text-[0.7rem] px-2.5 py-0.5',
  },
};

const PHASE_CONFIG: Record<SnapshotPhase, { label: string; className: string }> = {
  initial: {
    label: 'Initial Board',
    className:
      'bg-muted text-muted-foreground border-border font-medium text-[0.6rem] px-2.5 py-0.5',
  },
  improving: {
    label: 'Improving (Δ < 0)',
    className:
      'bg-sky-500/15 text-sky-600 dark:text-blue-ls-200 border-blue-ls-200/20 font-medium text-[0.6rem] px-2.5 py-0.5',
  },
  shoulder: {
    label: 'Plateau / Shoulder (Δ = 0)',
    className:
      'border-amber-500/20 bg-yellow-500/15 text-amber-600 dark:text-amber-400 text-[0.6rem] font-medium px-2.5 py-0.5',
  },
  worsening: {
    label: 'Worsening / Exploration (Δ > 0)',
    className:
      'bg-rose-pill/8 border-rose-500/10 text-rose-600 dark:bg-rose-pill/20 dark:text-rose-ls-200 font-medium text-[0.6rem] px-2.5 py-0.5',
  },
  restart: {
    label: 'Random Restart',
    className:
      'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/10 font-medium text-[0.6rem] px-2.5 py-0.5',
  },
};

export interface StatsRailProps {
  /**
   * - "rail": vertical flex of 5 equal-height cards. Used inside the
   *   workspace card's left sidebar.
   * - "compact": horizontal row of 5 condensed chips. Used on <lg viewports
   *   above the board, in a horizontal scroll wrapper.
   * - "context": a denser dashboard layout — 2×2 grid of small cards
   *   (Timeline / Phase / Attacks / Restarts) with a full-width horizontal
   *   "Run Status" hero card underneath. Wrapped in an outer card frame
   *   to sit as a sibling panel next to the AnalyticsPanel.
   */
  variant?: 'rail' | 'compact' | 'context';
}

export function StatsRail({ variant = 'rail' }: StatsRailProps) {
  const result = useSimulationStore(selectResult);
  const snapshot = useSimulationStore(selectSnapshot);
  const totalSteps = useSimulationStore(selectTotalSteps);
  const currentStep = useSimulationStore((s) => s.currentStep);

  const status = result?.status ?? 'stagnated';
  const statusMeta = STATUS_CONFIG[status];

  const phase = snapshot?.phase ?? 'initial';
  const phaseMeta = PHASE_CONFIG[phase];

  const conflicts = snapshot?.conflicts ?? (result ? result.finalConflicts : 0);
  const bestConflicts = result?.bestConflicts ?? conflicts;
  const isSolved = conflicts === 0;

  const isCompact = variant === 'compact';
  const isContext = variant === 'context';

  const cardBase = isCompact
    ? // Compact: tighter, horizontal, no border (sits in a horizontal strip)
      'flex shrink-0 flex-col justify-center -space-y-1 rounded-md bg-card/60 px-3 py-1.5 shadow-2xs min-w-[120px]'
    : isContext
      ? // Context: solid bordered cards, no flex-1 (each card sizes to its grid cell)
        'flex min-h-0 flex-col justify-center gap-y-0.5 rounded-lg border border-border/60 bg-card/60 px-3 py-2 shadow-2xs'
      : // Rail: solid bordered cards, equal height via flex-1
        'flex min-h-0 flex-1 flex-col justify-center -space-y-0 rounded-lg border border-border/60 bg-card/60 py-0 px-4 shadow-2xs';

  const labelClass = isCompact
    ? 'font-mono text-[10px] font-medium tracking-wide text-muted-foreground uppercase'
    : isContext
      ? 'font-mono text-[10px] font-medium tracking-wide text-muted-foreground uppercase'
      : 'font-mono text-[0.7rem] font-medium text-muted-foreground';

  // ─── Context variant — dashboard layout with outer card frame + 2×2 grid + hero Run Status ───
  if (isContext) {
    return (
      <div
        data-testid="stats-rail"
        data-variant="context"
        className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm sm:p-5"
      >
        {/* 2×2 grid of small metric cards (Timeline, Phase, Attacks, Restarts) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Timeline Cursor */}
          <div className={cardBase}>
            <span className={labelClass}>Timeline Cursor</span>
            <div className="mt-0.5 flex items-baseline gap-1 font-sans text-sm font-semibold">
              <span className="text-foreground">{currentStep}</span>
              <span className="text-muted-foreground">/ {totalSteps} steps</span>
            </div>
          </div>

          {/* Step Phase */}
          <div className={cardBase}>
            <span className={labelClass}>Step Phase</span>
            <div className="mt-0.5">
              <span
                className={`inline-block rounded-md border text-[0.65rem] font-medium ${phaseMeta.className}`}
              >
                {phaseMeta.label}
              </span>
            </div>
          </div>

          {/* Attacking Pairs */}
          <div className={cardBase}>
            <span className={labelClass}>Attacking Pairs</span>
            <div className="mt-0.5 flex items-baseline gap-1.5 font-sans text-sm font-semibold">
              <span
                className={`font-bold ${
                  isSolved
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-ls-200 dark:text-rose-ls-200'
                }`}
              >
                {conflicts}
              </span>
              <span className="text-muted-foreground">
                (best: <strong className="text-foreground">{bestConflicts}</strong>)
              </span>
            </div>
          </div>

          {/* Restarts or Temperature */}
          <div className={cardBase}>
            <span className={labelClass}>
              {snapshot?.temperature !== null && snapshot?.temperature !== undefined
                ? 'Annealing Temp (T)'
                : 'Restarts'}
            </span>
            <div className="mt-0.5 font-sans text-sm font-bold text-foreground">
              {snapshot?.temperature !== null && snapshot?.temperature !== undefined ? (
                <span className="text-sky-600 dark:text-sky-600">
                  {snapshot.temperature.toFixed(3)}
                </span>
              ) : (
                <span>
                  {snapshot?.restartCount ?? 0}{' '}
                  <span className="text-xs font-semibold text-muted-foreground">restarts</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Full-width Run Status hero card — horizontal layout: badge left, context right */}
        <div className={cardBase}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-5">
              <span className="font-mono text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                Run Status
              </span>
              <Badge variant={statusMeta.variant} className={statusMeta.className}>
                <span>{result ? statusMeta.label : 'Initializing…'}</span>
              </Badge>
            </div>
            <div className="shrink-0 text-right font-mono text-[0.65rem] text-muted-foreground">
              <span>
                h(s) ={' '}
                <strong
                  className={`font-semibold ${
                    isSolved ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                  }`}
                >
                  {conflicts}
                </strong>
              </span>
              <span className="mx-1.5">·</span>
              <span>
                Step <strong className="font-semibold text-foreground">{currentStep}</strong> /{' '}
                {totalSteps}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="stats-rail"
      data-variant={variant}
      className={isCompact ? 'flex flex-row items-stretch gap-2' : 'flex h-100 flex-col gap-2.5'}
    >
      {/* Run Status */}
      <div className={cardBase}>
        <span className={labelClass}>Run Status</span>
        <div className={isCompact ? 'mt-0.5' : 'mt-1'}>
          <Badge variant={statusMeta.variant} className={statusMeta.className}>
            <span>{result ? statusMeta.label : 'Initializing…'}</span>
          </Badge>
        </div>
      </div>

      {/* Timeline Cursor */}
      <div className={cardBase}>
        <span className={labelClass}>Timeline Cursor</span>
        <div
          className={
            isCompact
              ? 'mt-0.5 flex items-baseline gap-1 font-sans text-xs font-semibold'
              : 'mt-1 flex items-baseline gap-1 font-sans text-sm font-semibold'
          }
        >
          <span className="text-foreground">{currentStep}</span>
          <span className="text-muted-foreground">/ {totalSteps} steps</span>
        </div>
      </div>

      {/* Attacking Pairs */}
      <div className={cardBase}>
        <span className={labelClass}>Attacking Pairs</span>
        <div
          className={
            isCompact
              ? 'mt-0.5 flex items-baseline gap-1.5 font-sans text-xs font-semibold'
              : 'mt-1 flex items-baseline gap-2 font-sans text-sm font-semibold'
          }
        >
          <span
            className={`font-bold ${
              isSolved
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-ls-200 dark:text-rose-ls-200'
            }`}
          >
            {conflicts}
          </span>
          <span className="text-muted-foreground">
            (best: <strong className="text-foreground">{bestConflicts}</strong>)
          </span>
        </div>
      </div>

      {/* Step Phase */}
      <div className={cardBase}>
        <span className={labelClass}>Step Phase</span>
        <div className={isCompact ? 'mt-0.5' : 'mt-1'}>
          <span
            className={`inline-block rounded-md border text-xs font-medium ${phaseMeta.className}`}
          >
            {phaseMeta.label}
          </span>
        </div>
      </div>

      {/* Restarts or Temperature */}
      <div className={cardBase}>
        <span className={labelClass}>
          {snapshot?.temperature !== null && snapshot?.temperature !== undefined
            ? 'Annealing Temp (T)'
            : 'Restarts'}
        </span>
        <div
          className={
            isCompact
              ? 'mt-0.5 font-sans text-xs font-bold text-foreground'
              : 'mt-1 font-sans text-sm font-bold text-foreground'
          }
        >
          {snapshot?.temperature !== null && snapshot?.temperature !== undefined ? (
            <span className="text-sky-600 dark:text-sky-600">
              {snapshot.temperature.toFixed(3)}
            </span>
          ) : (
            <span>
              {snapshot?.restartCount ?? 0}{' '}
              <span className="text-sm font-semibold text-muted-foreground">restarts</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
