'use client';

import * as React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Flame,
  Snowflake,
  RotateCcw,
  TrendingDown,
  Minus,
  TrendingUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSimulationStore, selectResult, selectSnapshot, selectTotalSteps } from '@/store';
import type { RunStatus, SnapshotPhase } from '@/lib/engine';

const STATUS_CONFIG: Record<
  RunStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  solved: {
    label: 'Solved (Global Opt)',
    variant: 'default',
    className:
      'bg-green-pill hover:bg-green-pill/90 text-white shadow-xs dark:bg-green-pill dark:text-white font-medium text-[0.7rem] px-4 py-1',
    icon: CheckCircle2,
  },
  stagnated: {
    label: 'Stagnated (Local Max)',
    variant: 'outline',
    className:
      'border-amber-500/20 bg-yellow-500/15 text-amber-600 dark:text-amber-400 text-[0.7rem] font-medium px-4 py-1',
    icon: AlertTriangle,
  },
  exhausted: {
    label: 'Step Limit Hit',
    variant: 'destructive',
    className:
      'bg-rose-pill/8 border-rose-500/10 text-rose-600 dark:bg-rose-pill/20 dark:text-rose-ls-200 font-medium text-[0.7rem] px-4 py-1',
    icon: Flame,
  },
  frozen: {
    label: 'Frozen (SA Tmin)',
    variant: 'outline',
    className:
      'border-blue-ls-200/20 bg-sky-500/10 text-sky-600 dark:text-blue-ls-200 font-medium text-[0.7rem] px-4 py-1',
    icon: Snowflake,
  },
};

const PHASE_CONFIG: Record<
  SnapshotPhase,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  initial: {
    label: 'Initial Board',
    className: 'bg-muted text-muted-foreground border-border font-medium text-[0.7rem] px-4 py-1',
    icon: Sparkles,
  },
  improving: {
    label: 'Improving Move (Δ < 0)',
    className:
      'bg-sky-500/15 text-sky-600 dark:text-blue-ls-200 border-blue-ls-200/20 font-medium text-[0.7rem] px-4 py-1',
    icon: TrendingDown,
  },
  shoulder: {
    label: 'Plateau / Shoulder (Δ = 0)',
    className:
      'border-amber-500/20 bg-yellow-500/15 text-amber-600 dark:text-amber-400 text-[0.7rem] font-medium px-4 py-1',
    icon: Minus,
  },
  worsening: {
    label: 'Metropolis Uphill (Δ > 0)',
    className:
      'bg-rose-pill/8 border-rose-500/10 text-rose-600 dark:bg-rose-pill/20 dark:text-rose-ls-200 font-medium text-[0.7rem] px-4 py-1',
    icon: TrendingUp,
  },
  restart: {
    label: 'Random Restart',
    className:
      'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/10 font-medium text-[0.7rem] px-4 py-1',
    icon: RotateCcw,
  },
};

export function StatsHeader() {
  const result = useSimulationStore(selectResult);
  const snapshot = useSimulationStore(selectSnapshot);
  const totalSteps = useSimulationStore(selectTotalSteps);
  const currentStep = useSimulationStore((s) => s.currentStep);

  const status = result?.status ?? 'stagnated';
  const statusMeta = STATUS_CONFIG[status];
  const StatusIcon = statusMeta.icon;

  const phase = snapshot?.phase ?? 'initial';
  const phaseMeta = PHASE_CONFIG[phase];
  const PhaseIcon = phaseMeta.icon;

  const conflicts = snapshot?.conflicts ?? (result ? result.finalConflicts : 0);
  const bestConflicts = result?.bestConflicts ?? conflicts;
  const isSolved = conflicts === 0;

  return (
    <header className="flex flex-col gap-4 border-b border-border/80 bg-card/40 px-4 py-6 backdrop-blur-md sm:min-h-[17rem] sm:px-6 lg:min-h-[13rem] lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/90 to-primary/40 text-primary-foreground shadow-inner shadow-white/20">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div className="flex flex-col gap-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-4xl">
                N-Queens Hill Climbing <span className="text-muted-foreground">Visualizer</span>
              </h1>
            </div>
            <p className="text-base text-muted-foreground">Local Search Visualizer</p>
          </div>
        </div>
      </div>

      {/* Live State & Metrics Bar */}
      <div className="grid min-h-24 grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {/* Run Status */}
        <div className="flex flex-col justify-center gap-y-1 rounded-lg border border-border/60 bg-card/60 p-4 shadow-2xs">
          <span className="font-mono text-xs font-medium text-muted-foreground">Run Status</span>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge
              variant={statusMeta.variant}
              className={`flex items-center gap-1.5 px-2 py-0.5 text-xs ${statusMeta.className}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              <span>{result ? statusMeta.label : 'Initializing...'}</span>
            </Badge>
          </div>
        </div>

        {/* Step Progress */}
        <div className="flex flex-col justify-center gap-y-1 rounded-lg border border-border/60 bg-card/60 p-4 shadow-2xs">
          <span className="font-mono text-xs font-medium text-muted-foreground">
            Timeline Cursor
          </span>
          <div className="mt-1 flex items-baseline gap-1 font-sans text-base font-semibold">
            <span className="text-foreground">{currentStep}</span>
            <span className="text-muted-foreground">/ {totalSteps} steps</span>
          </div>
        </div>

        {/* Conflicts */}
        <div className="flex flex-col justify-center gap-y-1 rounded-lg border border-border/60 bg-card/60 p-2.5 shadow-2xs">
          <span className="font-mono text-xs font-medium text-muted-foreground">
            Attacking Pairs
          </span>
          <div className="mt-1 flex items-baseline gap-2 font-sans text-base font-semibold">
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

        {/* Move Phase */}
        <div className="flex flex-col justify-center gap-y-1 rounded-lg border border-border/60 bg-card/60 p-2.5 shadow-2xs">
          <span className="font-mono text-xs font-medium text-muted-foreground">Step Phase</span>
          <div className="mt-1">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${phaseMeta.className}`}
            >
              <PhaseIcon className="h-3 w-3" />
              <span>{phaseMeta.label}</span>
            </span>
          </div>
        </div>

        {/* Restarts or Temperature */}
        <div className="col-span-2 flex flex-col justify-center gap-y-1 rounded-lg border border-border/60 bg-card/60 p-2.5 shadow-2xs sm:col-span-4 lg:col-span-1">
          <span className="font-mono text-xs font-medium text-muted-foreground">
            {snapshot?.temperature !== null ? 'Annealing Temp (T)' : 'Restarts'}
          </span>
          <div className="mt-1 font-sans text-base font-bold text-foreground">
            {snapshot?.temperature !== null && snapshot?.temperature !== undefined ? (
              <span className="text-sky-600 dark:text-sky-600">
                {snapshot.temperature.toFixed(3)}
              </span>
            ) : (
              <span>
                {snapshot?.restartCount ?? 0}{' '}
                <span className="text-base font-semibold text-muted-foreground">restarts</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
