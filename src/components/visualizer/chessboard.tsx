'use client';

import * as React from 'react';
import { useReducedMotion } from 'motion/react';
import { useSimulationStore, selectSnapshot } from '@/store';
import { createConflicts } from '@/lib/engine';
import { QueenPiece } from './queen-piece';
import { OriginEcho } from './origin-echo';
import { useQueenDurationMs } from './useQueenDuration';
import { ORIGIN_ECHO_DURATION_MULTIPLIER } from '@/lib/motion-tokens';
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
  const reduceMotion = !!useReducedMotion();

  // Ref to the inner grid container — measured live so the queen overlay
  // can convert (column, row) into exact pixel positions, even on window
  // resize or breakpoint changes.
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [gridRect, setGridRect] = React.useState<DOMRect | null>(null);

  React.useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    setGridRect(el.getBoundingClientRect());
    const ro = new ResizeObserver(() => setGridRect(el.getBoundingClientRect()));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Single travel duration for every animated element on the board.
  // Speed-aware ONLY while playing; fixed while stepping (see
  // `useQueenDurationMs`). One call site — queens and the origin echo all
  // receive this value as a prop instead of deriving it themselves.
  const durationMs = useQueenDurationMs(speed);

  const n = snapshot ? snapshot.board.length : config.boardSize;
  const board = snapshot?.board ?? null;
  const move = snapshot?.move ?? null;

  const cellW = gridRect ? gridRect.width / n : 0;
  const cellH = gridRect ? gridRect.height / n : 0;

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

  const showEcho = move !== null && move.fromRow !== move.toRow;

  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      {/* Chessboard Outer Container */}
      <div
        className={cn(
          'relative aspect-square w-full max-w-175 min-w-65 rounded-2xl border-1 p-2 shadow-md transition-all duration-300',
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
        {/* Board box — the grid plus the queen overlay stacked on top.
            The overlay is inset-0 over the grid so pixel positions derived
            from the grid's bounding rect line up exactly with squares. */}
        <div className="relative h-full w-full">
          {/* Inner Grid — squares only. Queens live in the overlay below,
              positioned by x/y transforms (never `layout`). */}
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
              const isDestinationSquare =
                move !== null && move.column === col && move.toRow === row;
              const isMovedCol = move !== null && move.column === col;

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
                </div>
              );
            })}
          </div>

          {/* Queen overlay — one absolutely-positioned queen per column.
              Rendered once the grid has been measured so x/y pixel positions
              are exact. Each queen keeps a stable `key={col}` (queens never
              change column) so Motion tweens travel instead of remounting. */}
          {board !== null && gridRect !== null && (
            <div className="absolute inset-0" aria-hidden={false}>
              {board.map((row, col) => {
                const isDestinationSquare =
                  move !== null && move.column === col && move.toRow === row;
                return (
                  <QueenPiece
                    key={col}
                    column={col}
                    row={row}
                    conflictsCount={queenConflictCounts[col]}
                    isMoved={isDestinationSquare}
                    deltaConflicts={isDestinationSquare ? move?.deltaConflicts : undefined}
                    boardSize={n}
                    x={col * cellW}
                    y={row * cellH}
                    size={cellW}
                    durationMs={durationMs}
                    reducedMotion={reduceMotion}
                  />
                );
              })}

              {/* Origin marker from the last move — "the queen was HERE".
                  Positioned over the origin square; re-keys per move so each
                  new move replays the departure animation. */}
              {showEcho && move !== null && (
                <div
                  className="absolute"
                  style={{
                    left: move.column * cellW,
                    top: move.fromRow * cellH,
                    width: cellW,
                    height: cellH,
                  }}
                >
                  <OriginEcho
                    key={`${move.column}-${move.fromRow}-${move.toRow}`}
                    move={move}
                    // The echo lingers LONGER than the queen's flight (see
                    // ORIGIN_ECHO_DURATION_MULTIPLIER in
                    // `@/lib/motion-tokens`) so the departure stays
                    // readable even at high playback speeds.
                    durationMs={durationMs * ORIGIN_ECHO_DURATION_MULTIPLIER}
                    reducedMotion={reduceMotion}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
