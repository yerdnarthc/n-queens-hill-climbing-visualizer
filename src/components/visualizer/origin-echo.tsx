'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { computeStepDuration } from '@/lib/animation-timings';

/**
 * OriginEcho — an expanding-ring "departure pulse" rendered on the square
 * a queen just LEFT. Makes "the queen came from HERE" visually obvious in
 * tandem with the trajectory line (which points from the origin to the
 * destination).
 *
 * Re-keys on (column, fromRow, toRow) so a new move re-mounts the
 * motion.div and replays the scale/opacity animation. The duration is
 * derived from playback speed via `computeStepDuration`, matching the
 * queen's flight and the trajectory line.
 */
export interface OriginEchoProps {
  /** The most recent move (null ⇒ no echo). */
  move: { column: number; fromRow: number; toRow: number } | null;
  /** Current playback speed in steps/sec. */
  speed: number;
}

export function OriginEcho({ move, speed }: OriginEchoProps) {
  const reduceMotion = useReducedMotion();
  const durationMs = React.useMemo(
    () => computeStepDuration(speed, reduceMotion ?? false),
    [speed, reduceMotion],
  );

  if (!move) return null;
  // No echo for a no-op (shouldn't happen, but be defensive).
  if (move.fromRow === move.toRow) return null;

  // Key on the full move so re-mounting replays the animation.
  const animKey = `${move.column}-${move.fromRow}-${move.toRow}`;

  if (reduceMotion) {
    // Static indicator — no animation, just a dashed ring.
    return (
      <div
        key={animKey}
        data-testid="origin-echo"
        title={`Moved from row ${move.fromRow + 1}`}
        className="absolute inset-1.5 flex items-center justify-center rounded-full border-2 border-dashed border-improving-deep/70 bg-improving/20"
      >
        <div className="h-1.5 w-1.5 rounded-full bg-improving-deep" />
      </div>
    );
  }

  return (
    <motion.div
      key={animKey}
      data-testid="origin-echo"
      title={`Moved from row ${move.fromRow + 1}`}
      className="absolute inset-1.5 flex items-center justify-center rounded-full border-2 border-dashed border-improving-deep/70 bg-improving/20"
      initial={{ scale: 1, opacity: 1 }}
      animate={{ scale: 1.4, opacity: 0 }}
      transition={{ duration: durationMs / 1000, ease: 'easeOut' }}
    >
      <div className="h-1.5 w-1.5 rounded-full bg-improving-deep" />
    </motion.div>
  );
}
