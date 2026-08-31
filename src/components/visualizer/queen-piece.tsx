'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
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

  return (
    <motion.div
      layout
      transition={{
        type: 'spring',
        stiffness: 450,
        damping: 32,
      }}
      className="relative flex h-full w-full items-center justify-center select-none"
      data-testid={`queen-${column}-${row}`}
    >
      {/* Halo / Glow for conflicted queens or moved queens */}
      {hasConflict ? (
        <div
          className="absolute inset-0.5 animate-pulse rounded-full bg-rose-500/25 blur-[2px]"
          aria-hidden="true"
        />
      ) : isMoved ? (
        <div
          className="absolute inset-0.5 rounded-full bg-sky-500/20 blur-[2px]"
          aria-hidden="true"
        />
      ) : null}

      {/* Main Queen Token */}
      <div
        className={cn(
          'relative z-10 flex h-[82%] w-[82%] items-center justify-center rounded-full shadow-md transition-colors duration-200',
          hasConflict
            ? 'bg-gradient-to-b from-rose-500 to-rose-700 text-white ring-2 ring-rose-300 dark:ring-rose-400'
            : isMoved
              ? 'bg-gradient-to-b from-sky-600 to-sky-800 text-white ring-2 ring-sky-300 dark:ring-sky-400'
              : 'bg-gradient-to-b from-slate-800 to-slate-950 text-amber-300 ring-1 ring-amber-400/40 dark:from-slate-900 dark:to-black dark:text-amber-400',
        )}
      >
        <Crown className="h-[65%] w-[65%] fill-current drop-shadow-xs" />

        {/* Conflict count badge on the queen if > 0 */}
        {hasConflict && (
          <span
            aria-label={`${conflictsCount} attacking pairs on this queen`}
            className={cn(
              'absolute flex items-center justify-center rounded-full bg-rose-950 font-mono font-bold text-rose-200 shadow-xs ring-1 ring-rose-400',
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
              'absolute flex items-center justify-center rounded-full font-mono font-bold text-white shadow-xs',
              isDense
                ? '-right-0.5 -bottom-0.5 h-3 min-w-3 px-0.5 text-[7.5px]'
                : '-right-1 -bottom-1 h-4 min-w-4 px-0.5 text-[9px]',
              deltaConflicts < 0
                ? 'bg-emerald-700 ring-1 ring-emerald-300'
                : deltaConflicts === 0
                  ? 'bg-amber-600 ring-1 ring-amber-300'
                  : 'bg-rose-700 ring-1 ring-rose-300',
            )}
          >
            {deltaConflicts > 0 ? `+${deltaConflicts}` : deltaConflicts}
          </span>
        )}
      </div>
    </motion.div>
  );
}
