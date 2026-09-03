'use client';

import * as React from 'react';
import { Zap } from 'lucide-react';

/**
 * StatsHeader — the page-level brand strip. Renders the visualizer H1,
 * subtitle, and the Zap brand mark. The five live metric cards
 * (status / timeline / attacks / phase / temp-or-restarts) used to live
 * here too; they were relocated into the chessboard card frame as a
 * dedicated `StatsRail` (see `./stats-rail.tsx`) for a tighter visual
 * association between metrics and the board they describe.
 *
 * Theme toggle and global nav links live in `SiteNav` (per Phase 5).
 */
export function StatsHeader() {
  return (
    <header
      data-testid="stats-header"
      className="flex flex-col gap-4 border-b border-border/80 bg-card/40 px-4 pt-6 pb-2 backdrop-blur-md sm:px-6 lg:px-8 xl:px-12 2xl:px-16"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/90 to-primary/40 text-primary-foreground shadow-inner shadow-white/20">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div className="flex flex-col gap-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-3xl">
                N-Queens Hill Climbing <span className="text-muted-foreground">Visualizer</span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">Local Search Visualizer</p>
          </div>
        </div>
      </div>
    </header>
  );
}
