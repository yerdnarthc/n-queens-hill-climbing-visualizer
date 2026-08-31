'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import {
  CheckCircle2,
  AlertTriangle,
  Flame,
  Snowflake,
  RotateCcw,
  Sun,
  Moon,
  TrendingDown,
  Minus,
  TrendingUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
      'bg-emerald-600 hover:bg-emerald-600/90 text-white border-emerald-500 shadow-xs dark:bg-emerald-500 dark:text-emerald-950 font-semibold',
    icon: CheckCircle2,
  },
  stagnated: {
    label: 'Stagnated (Local Max)',
    variant: 'outline',
    className:
      'border-amber-500/80 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold',
    icon: AlertTriangle,
  },
  exhausted: {
    label: 'Step Limit Hit',
    variant: 'destructive',
    className: 'bg-rose-500/15 border-rose-500/50 text-rose-600 dark:text-rose-400 font-semibold',
    icon: Flame,
  },
  frozen: {
    label: 'Frozen (SA Tmin)',
    variant: 'outline',
    className: 'border-sky-500/80 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold',
    icon: Snowflake,
  },
};

const PHASE_CONFIG: Record<
  SnapshotPhase,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  initial: {
    label: 'Initial Board',
    className: 'bg-muted text-muted-foreground border-border',
    icon: Sparkles,
  },
  improving: {
    label: 'Improving Move (Δ < 0)',
    className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    icon: TrendingDown,
  },
  shoulder: {
    label: 'Plateau / Shoulder (Δ = 0)',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    icon: Minus,
  },
  worsening: {
    label: 'Metropolis Uphill (Δ > 0)',
    className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    icon: TrendingUp,
  },
  restart: {
    label: 'Random Restart',
    className: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    icon: RotateCcw,
  },
};

export function StatsHeader() {
  const result = useSimulationStore(selectResult);
  const snapshot = useSimulationStore(selectSnapshot);
  const totalSteps = useSimulationStore(selectTotalSteps);
  const currentStep = useSimulationStore((s) => s.currentStep);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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
    <header className="flex flex-col gap-4 border-b border-border/80 bg-card/40 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/90 to-primary/40 text-primary-foreground shadow-inner shadow-white/20">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                N-Queens Hill Climbing
              </h1>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Local Search Visualizer
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              AIMA Ch. 4 & 6 · Deterministic Seeded Simulation · Time-Travel State
            </p>
          </div>
        </div>

        {/* Global actions & theme */}
        <div className="flex items-center gap-2">
          {mounted && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 rounded-lg"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Live State & Metrics Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {/* Run Status */}
        <div className="flex flex-col justify-center rounded-lg border border-border/60 bg-card/60 p-2.5 shadow-2xs">
          <span className="text-[11px] font-medium text-muted-foreground">Run Status</span>
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
        <div className="flex flex-col justify-center rounded-lg border border-border/60 bg-card/60 p-2.5 shadow-2xs">
          <span className="text-[11px] font-medium text-muted-foreground">Timeline Cursor</span>
          <div className="mt-1 flex items-baseline gap-1 font-mono text-sm font-semibold">
            <span className="text-foreground">{currentStep}</span>
            <span className="text-xs text-muted-foreground">/ {totalSteps} steps</span>
          </div>
        </div>

        {/* Conflicts */}
        <div className="flex flex-col justify-center rounded-lg border border-border/60 bg-card/60 p-2.5 shadow-2xs">
          <span className="text-[11px] font-medium text-muted-foreground">Attacking Pairs</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`font-mono text-base font-bold ${
                isSolved
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {conflicts}
            </span>
            <span className="text-[11px] text-muted-foreground">
              (best: <strong className="font-mono text-foreground">{bestConflicts}</strong>)
            </span>
          </div>
        </div>

        {/* Move Phase */}
        <div className="flex flex-col justify-center rounded-lg border border-border/60 bg-card/60 p-2.5 shadow-2xs">
          <span className="text-[11px] font-medium text-muted-foreground">Step Phase</span>
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
        <div className="col-span-2 flex flex-col justify-center rounded-lg border border-border/60 bg-card/60 p-2.5 shadow-2xs sm:col-span-4 lg:col-span-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            {snapshot?.temperature !== null ? 'Annealing Temp (T)' : 'Restarts'}
          </span>
          <div className="mt-1 font-mono text-sm font-semibold text-foreground">
            {snapshot?.temperature !== null && snapshot?.temperature !== undefined ? (
              <span className="text-sky-600 dark:text-sky-400">
                {snapshot.temperature.toFixed(3)}
              </span>
            ) : (
              <span>
                {snapshot?.restartCount ?? 0}{' '}
                <span className="text-xs font-normal text-muted-foreground">restarts</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
