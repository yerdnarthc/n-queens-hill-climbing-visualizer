import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Dices,
  LineChart,
  Mountain,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { STRATEGY_IDS } from '@/lib/engine';
import { STRATEGY_INFO, POLICY_INFO } from '@/lib/strategy-info';

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'A friendly introduction to the N-Queens puzzle, hill-climbing local search, and the five strategies your visualizer can run.',
};

const LANDSCAPE_FEATURES = [
  {
    key: 'improving',
    label: 'Improving move',
    className: 'bg-improving',
    text: 'A downhill step — a queen moves and the number of attacking pairs drops. Hill climbing always takes these when it can.',
  },
  {
    key: 'shoulder',
    label: 'Plateau / shoulder',
    className: 'bg-shoulder',
    text: 'A flat step — the conflict count stays the same. Sideways moves let the search walk across a shoulder to keep going.',
  },
  {
    key: 'localMax',
    label: 'Local maximum',
    className: 'bg-local-max',
    text: 'A bowl you can’t get out of by going downhill — every move increases conflicts. The classic hill-climbing failure mode.',
  },
  {
    key: 'globalMax',
    label: 'Global maximum',
    className: 'bg-global-max',
    text: 'The solution — zero attacking pairs. Every queen is safe, and the puzzle is solved.',
  },
  {
    key: 'conflict',
    label: 'Conflicting queens',
    className: 'bg-conflict',
    text: 'Queens that attack each other along a row or diagonal. Visualized directly on the board with a red glow.',
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <BookOpen className="h-4 w-4" />
            <span className="rounded-md bg-primary/10 px-2 py-1">Educational Guide</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How Hill Climbing Solves the N-Queens Puzzle
          </h1>
          <p className="max-w-3xl leading-relaxed text-muted-foreground">
            Welcome! If you&apos;re new to AI or just new to this visualizer, you&apos;re in the
            right place. This page explains, in plain language, what the puzzle is, what &ldquo;hill
            climbing&rdquo; means, and what every strategy on this site is actually doing under the
            hood. No math degree required.
          </p>
        </section>

        {/* ── 1. The puzzle ────────────────────────────────────── */}
        <section className="mt-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Zap className="h-4 w-4" />
            </span>
            <h2>1 · The N-Queens puzzle</h2>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            Place <strong>N queens</strong> on an <strong>N × N chessboard</strong> so that no two
            queens attack each other. A queen attacks along its <em>row</em>, its <em>column</em>,
            and both <em>diagonals</em>.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/50 p-4">
              <span className="text-2xl font-bold text-primary">4×4</span>
              <span className="text-xs text-muted-foreground">
                The smallest board with a real challenge — try it in the visualizer.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/50 p-4">
              <span className="text-2xl font-bold text-primary">8×8</span>
              <span className="text-xs text-muted-foreground">
                The classic chessboard — the app&apos;s default, and the one AIMA uses.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/50 p-4">
              <span className="text-2xl font-bold text-primary">16×16</span>
              <span className="text-xs text-muted-foreground">
                Big enough to show how hill climbing can struggle without restarts.
              </span>
            </div>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            This puzzle is a classic <strong>constraint satisfaction problem</strong> (CSP) from AI
            textbooks (AIMA ch. 4 &amp; 6). It&apos;s small enough to reason about, yet big enough
            that a brute-force search of all placements becomes hopeless — which is exactly why
            local search heuristics shine.
          </p>
        </section>

        {/* ── 2. The objective ─────────────────────────────────── */}
        <section className="mt-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingDown className="h-4 w-4" />
            </span>
            <h2>2 · One simple number: h(s)</h2>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            Instead of judging an entire board, the algorithm collapses a board into a single score,
            called the <strong>heuristic objective</strong>, written <code>h(s)</code>:
          </p>
          <div className="rounded-xl border border-border/70 bg-card/60 p-4 text-center">
            <p className="font-mono text-sm">
              h(s) = number of attacking <span className="text-conflict">queen pairs</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Lower is better. A solved board has <strong>h(s) = 0</strong>.
            </p>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            Each queen&apos;s position is stored as <code>rows[col] = row</code> — one queen per
            column. A <strong>move</strong> relocates a single queen within its column, giving{' '}
            <strong>N·(N−1)</strong> neighboring boards to consider. This is the
            &ldquo;landscape&rdquo; the charts explore: every legal move is a step in a hilly
            terrain where height = conflicts.
          </p>
        </section>

        {/* ── 3. The landscape ─────────────────────────────────── */}
        <section className="mt-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mountain className="h-4 w-4" />
            </span>
            <h2>3 · The optimization landscape</h2>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            Picture hiking downhill toward <strong>h(s) = 0</strong> at the valley floor. Because
            high scores mean more attacks, we&apos;re actually hunting the <em>lowest</em> point —
            the charts flip this upside down and call it a landscape of maxima. Along the way
            you&apos;ll meet these features:
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {LANDSCAPE_FEATURES.map((feature) => (
              <div
                key={feature.key}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 p-3.5"
              >
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${feature.className}`} />
                <div>
                  <span className="text-sm font-semibold">{feature.label}</span>
                  <p className="text-xs leading-relaxed text-muted-foreground">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="leading-relaxed text-muted-foreground">
            The <strong>Landscape tab</strong> colors every step of your run with exactly these
            concepts, so you can watch the algorithm walk downhill, traverse shoulders, get stuck at
            a local max — or sprint all the way to the global optimum.
          </p>
        </section>

        {/* ── 4. The strategies ────────────────────────────────── */}
        <section className="mt-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2>4 · The five hill-climbing strategies</h2>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            Each strategy answers one question differently: <em>which move should we take next?</em>{' '}
            You can switch between them live in the configuration panel to compare.
          </p>
          <div className="flex flex-col gap-2.5">
            {STRATEGY_IDS.map((id, index) => {
              const strat = STRATEGY_INFO[id];
              return (
                <div
                  key={id}
                  className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold">{strat.name}</span>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"></span>
                  </div>
                  <p className="pl-8 text-xs leading-relaxed text-muted-foreground">
                    {strat.description}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="leading-relaxed text-muted-foreground">
            On top of these five strategies, the orchestrator adds two <strong>policies</strong>{' '}
            that any strategy can use to escape trouble:
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {POLICY_INFO.map((policy) => (
              <div
                key={policy.name}
                className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/50 p-3.5"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {policy.name}
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {policy.tag}
                  </span>
                </span>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {policy.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. Determinism ───────────────────────────────────── */}
        <section className="mt-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Dices className="h-4 w-4" />
            </span>
            <h2>5 · Why the same seed always gives the same run</h2>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            Randomness makes these strategies work — so the app uses a{' '}
            <strong>seeded random generator</strong> (mulberry32). Instead of a coin flip you
            can&apos;t repeat, every random choice is derived from a single{' '}
            <strong>seed number</strong>.
          </p>
          <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="flex items-start gap-2 text-sm">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span>
                Same seed + same settings ⇒ <strong>identical run</strong>, step for step. Share the
                seed with a friend and you&apos;re literally looking at the same simulation.
              </span>
            </p>
            <p className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span>
                This is what powers the <strong>time-travel scrubber</strong> and the charts: the
                whole run is precomputed deterministically, then you replay any moment of it.
              </span>
            </p>
            <p className="flex items-start gap-2 text-sm">
              <LineChart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                The <strong>Convergence tab</strong> plots h(s) across every step; the{' '}
                <strong>Diagnostics tab</strong> breaks down how much time each phase took.
              </span>
            </p>
          </div>
        </section>

        {/* ── 6. Try it ────────────────────────────────────────── */}
        <section className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card/40 p-6 text-center">
          <h2 className="text-xl font-bold tracking-tight">Ready to see it in action?</h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Open the visualizer, pick a strategy, and press <strong>Space</strong> to watch hill
            climbing hunt for the solution. Use <strong className="text-foreground">← / →</strong>{' '}
            to step, <strong className="text-foreground">R</strong> to reset, and click anywhere on
            a chart to jump to that moment of the run.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            Open the Visualizer
            <ChevronRight className="h-4 w-4" />
          </Link>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Teaching note: try Steepest-Ascent on N=8 without restarts — then flip on Random
            Restarts and watch it escape local maxima.
          </p>
        </section>
      </main>
    </div>
  );
}
