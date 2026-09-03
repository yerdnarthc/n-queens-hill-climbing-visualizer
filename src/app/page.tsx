'use client';

import * as React from 'react';
import { useSimulationDriver } from '@/hooks/useSimulationDriver';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUrlConfigSync } from '@/hooks/useUrlConfigSync';
import { StatsHeader } from '@/components/visualizer/stats-header';
import { PlaybackControls } from '@/components/visualizer/playback-controls';
import { ConfigPanel } from '@/components/visualizer/config-panel';
import { Chessboard } from '@/components/visualizer/chessboard';
import { AnalyticsPanel } from '@/components/visualizer/analytics-panel';
import { BookOpen } from 'lucide-react';
import { Math } from '@/components/ui/math';

/**
 * Home is wrapped in a Suspense boundary because the URL sync bridge uses
 * `useSearchParams()` (via nuqs) — Next.js requires it for static prerendering.
 * During prerender the fallback is emitted; the client hydrates into the full
 * visualizer. Hook order inside `HomeContent` matters: the URL ⇆ store bridge
 * runs before the playback driver so the bootstrap run uses the hydrated config.
 */
export default function Home() {
  return (
    <React.Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </React.Suspense>
  );
}

function HomeFallback() {
  return (
    <div
      role="status"
      aria-label="Loading visualizer"
      className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground"
    >
      Loading visualizer…
    </div>
  );
}

function HomeContent() {
  // URL ⇆ store bridge FIRST so the driver's bootstrap run uses the hydrated config.
  useUrlConfigSync();
  // Then the single playback driver heartbeat + keyboard shortcuts for the page.
  useSimulationDriver();
  useKeyboardShortcuts();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header with Stats & Metrics */}
      <StatsHeader />

      {/* Main Visualizer Workspace */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left / Center: Interactive Board & Playback Scrubber (7 cols on lg) */}
          <div className="flex flex-col gap-5 lg:col-span-7">
            {/* Chessboard Card */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card/40 p-4 shadow-sm backdrop-blur-sm sm:p-6">
              <Chessboard />
            </div>

            {/* Playback Controls & Timeline Scrubber */}
            <PlaybackControls />

            {/* Semantic Visual Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/30 p-3 px-25 text-[0.65rem] text-muted-foreground">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Solved (0 Attacks)</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Conflicted Queen</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span>Moved Queen</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Plateau / Shoulder</span>
              </div>
            </div>
          </div>

          {/* Right: Configuration & Concept Guides (5 cols on lg) */}
          <div className="flex flex-col gap-5 lg:col-span-5">
            {/* Simulation Config Panel */}
            <ConfigPanel />

            {/* AI Concept Card */}
            <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-card/50 p-5 shadow-xs">
              {/* Header: icon + title + subtitle */}
              <div className="mb-4 flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground">
                    About Hill-Climbing Local Search
                  </h3>
                  <p className="text-[0.7rem] text-muted-foreground">
                    How the algorithm hunts for a zero-conflict solution.
                  </p>
                </div>
              </div>

              {/* Concept 1 — State representation */}
              <div className="flex flex-col gap-4 rounded-lg border border-border/50 bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="whitespace-pre">1. The state</span>
                </div>
                <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
                  In the <strong className="font-semibold text-foreground">N-Queens puzzle</strong>,
                  one queen per column is stored as a row index. A <em>move</em> relocates a queen
                  within its own column.
                </p>
                <div className="rounded-md border border-border/40 bg-background/60 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                      Representation
                    </span>
                    <span className="font-mono text-[0.7rem] text-muted-foreground">
                      N = board size
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-col items-center gap-1">
                    <Math block>rows[col] = row</Math>
                  </div>
                </div>
                <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
                  Each move explores a neighbor space of size{' '}
                  <span className="inline-block rounded bg-background/70 px-1.5 py-0.5 align-middle">
                    <Math>N(N-1)</Math>
                  </span>
                  .
                </p>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-border/50" />

              {/* Concept 2 — Heuristic objective */}
              <div className="flex flex-col gap-4 rounded-lg border border-border/50 bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="whitespace-pre">2. The objective</span>
                </div>
                <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
                  The heuristic{' '}
                  <span className="inline-block rounded bg-background/70 px-1.5 py-0.5 align-middle">
                    <Math>h(s)</Math>
                  </span>{' '}
                  counts the number of attacking queen pairs (row and diagonal collisions). The
                  algorithm chooses moves that{' '}
                  <strong className="font-semibold text-foreground">minimize</strong> it.
                </p>
                <div className="rounded-md border border-border/40 bg-background/60 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                      Termination
                    </span>
                    <span className="font-mono text-[0.7rem] text-emerald-600 dark:text-emerald-400">
                      solved
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-col items-center gap-1">
                    <Math block>h(s) = 0</Math>
                  </div>
                </div>
                <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
                  When the search reaches a global optimum{' '}
                  <span className="inline-block rounded bg-background/70 px-1.5 py-0.5 align-middle">
                    <Math>h = 0</Math>
                  </span>
                  , the puzzle is solved. Otherwise it gets stuck at{' '}
                  <em className="text-foreground">local maxima</em> or{' '}
                  <em className="text-foreground">plateaus</em> — which is why the strategy selector
                  above exists.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Full-Width Section: Analytics & Optimization Charts (12 cols on lg) */}
          <div className="lg:col-span-12">
            <AnalyticsPanel />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 bg-card/30 px-6 py-4">
        <div className="flex flex-col items-center justify-between gap-2 text-[0.7rem] text-muted-foreground sm:flex-row">
          <span>
            N-Queens Hill Climbing Visualizer · Built with Next.js 15, React 19, Tailwind CSS v4 &
            Zustand
          </span>
          <a
            href="/how-it-works"
            className="font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works →
          </a>
        </div>
      </footer>
    </div>
  );
}
