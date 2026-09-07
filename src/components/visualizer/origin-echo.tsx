'use client';

import { motion } from 'motion/react';
import { QueenGlyph } from './queen-glyph';
import { motionTokens } from '@/lib/motion-tokens';

/**
 * OriginEcho — "the queen was HERE" marker rendered on the square a queen
 * just LEFT. Three layers work together so the departure reads instantly:
 *
 *  1. Halo — a rounded square with a solid `ring-2` + `ring-offset` edge.
 *     The offset ring draws a contrasting outline that pops on BOTH the
 *     light (`#f0d9b5`) and dark (`#b88f6e`) warm-wood squares, in both
 *     themes. It blooms outward (scale 1 → 1.22) while fading.
 *  2. Ghost — a dissolving flat queen silhouette (same `QueenGlyph` as the
 *     board, one color, no details) that shrinks and fades. Shape (not
 *     just color) carries the meaning, so it stays legible for colorblind
 *     users and at a glance during fast play.
 *  3. Label pill — a tiny `R{row}` tag pinned to the square's corner naming
 *     the origin row, for first-time users.
 *
 * Re-keys on (column, fromRow, toRow) in the parent so a new move re-mounts
 * and replays the animation. Duration is injected (already gated: fast
 * while playing, fixed while stepping, 0 under reduced motion).
 */
export interface OriginEchoProps {
  /** The most recent move (null ⇒ no echo). */
  move: { column: number; fromRow: number; toRow: number } | null;
  /** Travel duration in ms, shared with the queen's flight. */
  durationMs: number;
  /** `prefers-reduced-motion` — render a static marker, no animation. */
  reducedMotion: boolean;
}

export function OriginEcho({ move, durationMs, reducedMotion }: OriginEchoProps) {
  if (!move) return null;
  // No echo for a no-op (shouldn't happen, but be defensive).
  if (move.fromRow === move.toRow) return null;

  const title = `Moved from row ${move.fromRow + 1}`;

  if (reducedMotion) {
    // Static indicator — same visual language, frozen mid-departure.
    return (
      <div
        data-testid="origin-echo"
        title={title}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div
          className="absolute inset-1 rounded-md bg-improving/25 ring-2 ring-improving-deep/80 ring-offset-1 ring-offset-background"
          aria-hidden="true"
        />
        <QueenGlyph className="relative h-1/2 w-1/2 text-improving-deep opacity-40" />
        <span className="absolute right-0.5 bottom-0.5 rounded-sm bg-card px-1 font-mono text-[8px] leading-4 font-bold text-improving-deep ring-1 ring-improving-deep/60">
          R{move.fromRow + 1}
        </span>
      </div>
    );
  }

  const seconds = durationMs / 1000;

  return (
    <motion.div
      data-testid="origin-echo"
      title={title}
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0.95 }}
      animate={{ opacity: 0 }}
      transition={{ duration: seconds, ease: motionTokens.easing.smooth }}
    >
      {/* Halo bloom */}
      <motion.div
        className="absolute inset-1 rounded-md bg-improving/25 ring-2 ring-improving-deep/80 ring-offset-1 ring-offset-background"
        aria-hidden="true"
        initial={{ scale: 1 }}
        animate={{ scale: 1.22 }}
        transition={{ duration: seconds, ease: 'easeOut' }}
      />
      {/* Dissolving crown ghost */}
      <motion.div
        className="relative flex h-full w-full items-center justify-center"
        aria-hidden="true"
        initial={{ scale: 1, opacity: 0.55 }}
        animate={{ scale: 0.88, opacity: 0.15 }}
        transition={{ duration: seconds, ease: 'easeOut' }}
      >
        <QueenGlyph className="h-1/2 w-1/2 text-improving-deep" />
      </motion.div>
      {/* Origin-row label */}
      <span className="absolute right-0.5 bottom-0.5 rounded-sm bg-card px-1 font-mono text-[8px] leading-4 font-bold text-improving-deep ring-1 ring-improving-deep/60">
        R{move.fromRow + 1}
      </span>
    </motion.div>
  );
}
