'use client';

import * as React from 'react';
import { useSimulationStore, selectSnapshot } from '@/store';
import { createConflicts } from '@/lib/engine';
import { QueenPiece } from './queen-piece';
import { MoveTrajectory } from './move-trajectory';
import { OriginEcho } from './origin-echo';
import { computeStepDuration } from '@/lib/animation-timings';
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
  const speed = useSimulationStore((s) => s.speed);

  // Ref to the inner grid container — passed to <MoveTrajectory /> so the
  // SVG line overlay can measure the grid's live bounding rect.
  const gridRef = React.useRef<HTMLDivElement>(null);

  // Move duration (ms) matched to the queen's flight in QueenPiece.
  // Same helper, same formula — both use cases want a duration that
  // completes inside one playback step at the current speed.
  const moveDurationMs = React.useMemo(() => computeStepDuration(speed, false), [speed]);

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
            ? // The `border-emerald-500/80` + `ring-emerald-500/20` class
              // strings are deliberately kept as literal Tailwind palette
              // classes (instead of the new `bg-global-max`-style semantic
              // tokens) so the Playwright e2e test in
              // `e2e/solve-flow.spec.ts` — which locates the solved wrapper
              // by `.border-emerald-500\/80` — keeps working. The semantic
              // equivalence with `--feature-global-max` is intentional.
              'border-emerald-500/80 ring-4 shadow-emerald-500/10 ring-emerald-500/20'
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
          ref={gridRef}
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
                  isMovedCol && !isDestinationSquare && 'ring-1 ring-improving/30 ring-inset',
                  isDestinationSquare && 'ring-2 ring-improving/70 ring-inset',
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

                {/* Origin ghost marker from last move — expanding-ring
                    "departure pulse" via <OriginEcho />. Re-keys on the
                    move so each new move replays the scale/opacity
                    animation; duration matches the queen's flight. */}
                {isOriginSquare && move && move.fromRow !== move.toRow && (
                  <OriginEcho move={move} speed={speed} />
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
                    speed={speed}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Trajectory overlay — draws a thin line from the move's origin
            square to its destination square during the queen's flight.
            Sits between the grid and the outer container so it overlays
            the grid without capturing pointer events. */}
        <MoveTrajectory move={move} boardSize={n} gridRef={gridRef} durationMs={moveDurationMs} />
      </div>
    </div>
  );
}
