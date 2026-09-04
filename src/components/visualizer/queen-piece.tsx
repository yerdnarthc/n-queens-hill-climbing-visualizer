'use client';

import * as React from 'react';
import { motion, useAnimate, useReducedMotion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeStepDuration } from '@/lib/animation-timings';

interface QueenPieceProps {
  column: number;
  row: number;
  conflictsCount: number;
  isMoved: boolean;
  deltaConflicts?: number;
  boardSize?: number;
  /**
   * Current playback speed in steps/sec. Drives the move-transition
   * duration (via `computeStepDuration`) so the queen's flight scales
   * with the playback clock — at 0.5× the queen arcs gracefully, at
   * 30× it snaps.
   */
  speed: number;
}

export function QueenPiece({
  column,
  row,
  conflictsCount,
  isMoved,
  deltaConflicts,
  boardSize = 8,
  speed,
}: QueenPieceProps) {
  const hasConflict = conflictsCount > 0;
  const isDense = boardSize >= 12;
  // `useReducedMotion` returns `boolean | null` — null on first render and
  // in jsdom. Coerce to a strict boolean so downstream branches are clean.
  const reduceMotion = !!useReducedMotion();

  // Animation handle for the lift + shadow-grow pulse on the queen token.
  const [scope, animate] = useAnimate();

  // Duration (ms) the queen's move should take, derived from playback
  // speed. Same value used by <MoveTrajectory /> in the parent.
  const moveDurationMs = React.useMemo(
    () => computeStepDuration(speed, reduceMotion),
    [speed, reduceMotion],
  );

  // On every move (column or row changes), fire the kinetic pulse:
  //  - scale 1 → 1.15 → 1 over the move duration ("lift" at start, "land
  //    with settle" at end)
  //  - box-shadow grows from `shadow-md` to `shadow-lg` and back (depth
  //    cue so the moving queen reads as "above" the board momentarily)
  // Skipped under reduced motion. The wrapping motion.div's `layout`
  // animation is gated separately, so position updates still happen.
  React.useEffect(() => {
    if (reduceMotion) return;
    if (moveDurationMs <= 0) return;

    const seconds = moveDurationMs / 1000;

    // Scale pulse on the queen token.
    animate(scope.current, { scale: [1, 1.15, 1] }, { duration: seconds, ease: 'easeInOut' });

    // Shadow grow (multi-stop box-shadow interpolation).
    animate(
      scope.current,
      {
        boxShadow: [
          '0 4px 6px -1px rgb(0 0 0 / 0.18), 0 2px 4px -2px rgb(0 0 0 / 0.12)',
          '0 12px 20px -2px rgb(0 0 0 / 0.32), 0 6px 10px -3px rgb(0 0 0 / 0.18)',
          '0 4px 6px -1px rgb(0 0 0 / 0.18), 0 2px 4px -2px rgb(0 0 0 / 0.12)',
        ],
      },
      { duration: seconds, ease: 'easeInOut' },
    );
  }, [column, row, moveDurationMs, reduceMotion, animate, scope]);

  // Overshoot cubic-bezier: gentle lift-off + ~20% overshoot + settle.
  // Matches the curve used by the MoveTrajectory line so queen + line
  // arrive together.
  const overshootEase = [0.2, 0.9, 0.3, 1.2] as const;

  return (
    <motion.div
      layout={!reduceMotion}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              duration: moveDurationMs / 1000,
              ease: overshootEase,
            }
      }
      className="relative flex h-full w-full items-center justify-center select-none"
      data-testid={`queen-${column}-${row}`}
    >
      {/* Halo / Glow for conflicted queens or moved queens */}
      {hasConflict ? (
        <div
          className="absolute inset-0.5 rounded-full bg-conflict/25 blur-[2px] motion-safe:animate-pulse"
          aria-hidden="true"
        />
      ) : isMoved ? (
        <div
          className="absolute inset-0.5 rounded-full bg-improving/20 blur-[2px]"
          aria-hidden="true"
        />
      ) : null}

      {/* Main Queen Token — `ref={scope}` is the animation target for the
          lift + shadow-grow pulse above. Initial box-shadow matches the
          prior `shadow-md` so the first render looks unchanged. */}
      <div
        ref={scope}
        className={cn(
          'relative z-10 flex h-[82%] w-[82%] items-center justify-center rounded-full transition-colors duration-200',
          hasConflict
            ? 'bg-gradient-to-b from-conflict to-conflict-deep text-primary-foreground ring-2 ring-conflict'
            : isMoved
              ? 'bg-gradient-to-b from-improving to-improving-deep text-primary-foreground ring-2 ring-improving'
              : 'bg-gradient-to-b from-slate-800 to-slate-950 text-amber-300 ring-1 ring-amber-400/40 dark:from-slate-900 dark:to-black dark:text-amber-400',
        )}
        style={{
          // Equivalent of `shadow-md` from Tailwind, expressed as a
          // box-shadow string so framer-motion can animate it.
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.18), 0 2px 4px -2px rgb(0 0 0 / 0.12)',
        }}
      >
        <Crown className="h-[65%] w-[65%] fill-current drop-shadow-xs" />

        {/* Conflict count badge on the queen if > 0 */}
        {hasConflict && (
          <span
            aria-label={`${conflictsCount} attacking pairs on this queen`}
            className={cn(
              'absolute flex items-center justify-center rounded-full bg-conflict-deep font-mono font-bold text-primary-foreground shadow-xs ring-1 ring-conflict',
              isDense
                ? '-top-0.5 -right-0.5 h-3 w-3 text-[7.5px]'
                : '-top-1 -right-1 h-4 w-4 text-[10px]',
            )}
          >
            {conflictsCount}
          </span>
        )}

        {/* Delta badge on recently moved queen */}
        {isMoved && deltaConflicts !== undefined && (
          <span
            className={cn(
              'absolute flex items-center justify-center rounded-full font-mono font-bold text-primary-foreground shadow-xs',
              isDense
                ? '-right-0.5 -bottom-0.5 h-3 min-w-3 px-0.5 text-[7.5px]'
                : '-right-1 -bottom-1 h-4 min-w-4 px-0.5 text-[9px]',
              deltaConflicts < 0
                ? 'bg-global-max ring-1 ring-global-max'
                : deltaConflicts === 0
                  ? 'bg-local-max ring-1 ring-local-max'
                  : 'bg-conflict-deep ring-1 ring-conflict',
            )}
          >
            {deltaConflicts > 0 ? `+${deltaConflicts}` : deltaConflicts}
          </span>
        )}
      </div>
    </motion.div>
  );
}
