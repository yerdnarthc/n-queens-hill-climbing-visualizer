'use client';

import * as React from 'react';
import { useSimulationStore, selectSnapshot } from '@/store';
import { createConflicts } from '@/lib/engine';
import { QueenPiece } from './queen-piece';
import { cn } from '@/lib/utils';

const FILE_LABELS = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
];

export function Chessboard() {
  const snapshot = useSimulationStore(selectSnapshot);
  const config = useSimulationStore((s) => s.config);

  const n = snapshot ? snapshot.board.length : config.boardSize;
  const board = snapshot?.board ?? null;
  const move = snapshot?.move ?? null;

  // Compute per-queen attacking conflict counts
  const queenConflictCounts = React.useMemo(() => {
    if (!board || board.length === 0) return new Array(n).fill(0);
    try {
      const evaluator = createConflicts(board);
      return board.map((_, col) => evaluator.queenConflicts(col));
    } catch {
      return new Array(n).fill(0);
    }
  }, [board, n]);

  const totalConflicts = snapshot?.conflicts ?? 0;
  const isSolved = board !== null && totalConflicts === 0;

  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      {/* Chessboard Outer Container */}
      <div
        className={cn(
          'relative aspect-square w-full max-w-[700px] min-w-[260px] rounded-2xl border-4 p-2 shadow-2xl transition-all duration-300',
          isSolved
            ? 'border-emerald-500/80 ring-4 shadow-emerald-500/10 ring-emerald-500/20'
            : totalConflicts > 0
              ? 'border-border/90 bg-card/80 shadow-black/20'
              : 'border-border bg-card/60',
        )}
        style={{
          backgroundColor: 'color-mix(in oklab, var(--card) 90%, transparent)',
        }}
      >
        {/* Inner Grid */}
        <div
          className="grid h-full w-full overflow-hidden rounded-xl border border-black/20 shadow-inner"
          style={{
            gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${n}, minmax(0, 1fr))`,
          }}
          data-testid="chessboard-grid"
        >
          {Array.from({ length: n * n }).map((_, idx) => {
            const row = Math.floor(idx / n);
            const col = idx % n;
            const isLightSquare = (row + col) % 2 === 0;
            const hasQueen = board !== null && board[col] === row;
            const isOriginSquare = move !== null && move.column === col && move.fromRow === row;
            const isDestinationSquare = move !== null && move.column === col && move.toRow === row;
            const isMovedCol = move !== null && move.column === col;

            const queenConflicts = hasQueen ? queenConflictCounts[col] : 0;

            return (
              <div
                key={`sq-${col}-${row}`}
                data-testid={`square-${col}-${row}`}
                className={cn(
                  'relative flex items-center justify-center transition-colors duration-150',
                  isLightSquare
                    ? 'bg-[#f0d9b5] text-[#b58863] dark:bg-[#f0d9b5] dark:text-[#8a6549]'
                    : 'bg-[#b88f6e] text-[#f0d9b5] dark:bg-[#b88f6e] dark:text-[#d9c3a3]',
                  isMovedCol && !isDestinationSquare && 'ring-1 ring-sky-500/30 ring-inset',
                  isDestinationSquare && 'ring-2 ring-sky-500/70 ring-inset',
                )}
              >
                {/* Rank label on left edge */}
                {col === 0 && (
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 font-mono font-bold opacity-60 select-none sm:left-1',
                      n >= 12 ? 'text-[7.5px]' : 'text-[9px]',
                    )}
                  >
                    {n - row}
                  </span>
                )}

                {/* File label on bottom edge */}
                {row === n - 1 && (
                  <span
                    className={cn(
                      'absolute right-0.5 bottom-0.5 font-mono font-bold opacity-60 select-none sm:right-1',
                      n >= 12 ? 'text-[7.5px]' : 'text-[9px]',
                    )}
                  >
                    {FILE_LABELS[col] ?? col + 1}
                  </span>
                )}

                {/* Origin ghost marker from last move */}
                {isOriginSquare && (
                  <div
                    title={`Moved from row ${n - row}`}
                    className="absolute inset-1.5 flex items-center justify-center rounded-full border-2 border-dashed border-sky-600/70 bg-sky-500/20 motion-safe:animate-pulse"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-sky-600" />
                  </div>
                )}

                {/* Queen Piece */}
                {hasQueen && (
                  <QueenPiece
                    column={col}
                    row={row}
                    conflictsCount={queenConflicts}
                    isMoved={isDestinationSquare}
                    deltaConflicts={isDestinationSquare ? move?.deltaConflicts : undefined}
                    boardSize={n}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
