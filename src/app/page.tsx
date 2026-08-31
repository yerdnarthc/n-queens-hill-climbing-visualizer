'use client';

import * as React from 'react';
import { useSimulationDriver } from '@/hooks/useSimulationDriver';
import { StatsHeader } from '@/components/visualizer/stats-header';
import { PlaybackControls } from '@/components/visualizer/playback-controls';
import { ConfigPanel } from '@/components/visualizer/config-panel';
import { Chessboard } from '@/components/visualizer/chessboard';
import { BookOpen, ShieldCheck } from 'lucide-react';

export default function Home() {
  // Mount the single playback driver heartbeat for the page
  useSimulationDriver();

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
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/30 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Solved (0 Attacks)</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span>Conflicted Queen</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                <span>Moved Queen</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span>Plateau / Shoulder</span>
              </div>
            </div>
          </div>

          {/* Right: Configuration & Concept Guides (5 cols on lg) */}
          <div className="flex flex-col gap-5 lg:col-span-5">
            {/* Simulation Config Panel */}
            <ConfigPanel />

            {/* AI Concept Card */}
            <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/50 p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>About Hill-Climbing Local Search</span>
              </div>
              <div className="flex flex-col gap-2 text-[12px] leading-relaxed text-muted-foreground">
                <p>
                  In the <strong>N-Queens puzzle</strong>, the state representation places one queen
                  per column ($rows[col] = row$). A move relocates a queen within its column,
                  exploring a neighbor space of size $N(N-1)$.
                </p>
                <p>
                  The heuristic objective $h(s)$ counts the number of attacking queen pairs
                  (horizontal and diagonal). The algorithm iteratively chooses moves to minimize
                  $h(s)$ until reaching a global optimum ($h = 0$) or encountering local maxima /
                  plateaus.
                </p>
              </div>

              <div className="flex items-center gap-1.5 border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>100% Deterministic · Seeded mulberry32 RNG</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 bg-card/30 px-6 py-4 text-center text-xs text-muted-foreground">
        <span>
          N-Queens Hill Climbing Visualizer · Built with Next.js 15, React 19, Tailwind CSS v4 &
          Zustand
        </span>
      </footer>
    </div>
  );
}
