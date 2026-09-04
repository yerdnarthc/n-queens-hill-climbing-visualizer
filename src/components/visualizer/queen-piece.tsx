'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QueenPieceProps {
  column: number;
  row: number;
  conflictsCount: number;
  isMoved: boolean;
  deltaConflicts?: number;
  boardSize?: number;
}

export function QueenPiece({
  column,
  row,
  conflictsCount,
  isMoved,
  deltaConflicts,
  boardSize = 8,
}: QueenPieceProps) {
  const hasConflict = conflictsCount > 0;
  const isDense = boardSize >= 12;
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      layout={!reduceMotion}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              type: 'spring',
              stiffness: 450,
              damping: 32,
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

      {/* Main Queen Token */}
      <div
        className={cn(
          'relative z-10 flex h-[82%] w-[82%] items-center justify-center rounded-full shadow-md transition-colors duration-200',
          hasConflict
            ? 'bg-gradient-to-b from-conflict to-conflict-deep text-primary-foreground ring-2 ring-conflict'
            : isMoved
              ? 'bg-gradient-to-b from-improving to-improving-deep text-primary-foreground ring-2 ring-improving'
              : 'bg-gradient-to-b from-slate-800 to-slate-950 text-amber-300 ring-1 ring-amber-400/40 dark:from-slate-900 dark:to-black dark:text-amber-400',
        )}
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
