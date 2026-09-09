'use client';
/* eslint-disable react-hooks/refs -- synchronous direction latch for gap-free reverse trail (see isReversingRef below) */

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useSimulationStore, selectSnapshot } from '@/store';
import { createConflicts } from '@/lib/engine';
import { QueenPiece } from './queen-piece';
import { QueenRays } from './queen-rays';
import { OriginEcho } from './origin-echo';
import { useQueenDurationMs } from './useQueenDuration';
import { motionTokens, ORIGIN_ECHO_DURATION_MULTIPLIER } from '@/lib/motion-tokens';
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

  // Reverse-scrub handling: when stepping backwards we show the *undone*
  // move's path animating in reverse, with origin tint included. This
  // makes scrubbing feel like a reversible video, not a jump to a
  // different queen's trail.
  const currentStep = useSimulationStore((s) => s.currentStep);
  const result = useSimulationStore((s) => s.result);
  const nextMove = result?.snapshots[currentStep + 1]?.move ?? null;
  // Direction-persistent refs: we need the *last scrub direction* to stay
  // stable across re-renders at the same step, otherwise the trail flicks
  // back to forward on the next frame. Updating both refs synchronously
  // during render keeps the reverse trail seamless (no one-frame gap).
  const prevStepRef = React.useRef(currentStep);
  const isReversingRef = React.useRef(false);
  if (prevStepRef.current !== currentStep) {
    isReversingRef.current = prevStepRef.current > currentStep;
    prevStepRef.current = currentStep;
  }
  const isReversing = isReversingRef.current;
  // At step 0 there is no trail — initial position never had a move. This
  // also suppresses the "first queen's trail at reset" bug where a
  // backward jump to 0 would otherwise show nextMove (move 1) as a trail.
  const isAtInitial = currentStep === 0;
  const displayedMove =
    !isAtInitial && isReversing && nextMove ? nextMove : (snapshot?.move ?? null);
  // For the trail we include the origin square (where the queen started)
  // and animate direction-aware. Destination gets an outline, not a tint.
  const isTrailReversed = !isAtInitial && isReversing && nextMove !== null;
  // Ghost follows the DISPLAYED move, not the raw snapshot move — this is
  // the reported bug: on a backward scrub to k-1, snapshot.move is move_{k-1}
  // (the previous queen's path), while the trail shows the undone move_k in
  // reverse. Swapping rows when reversed keeps OriginEcho dumb: its
  // "fromRow" always means "the square the queen just left".
  const echoMove =
    displayedMove && displayedMove.fromRow !== displayedMove.toRow
      ? isTrailReversed
        ? {
            column: displayedMove.column,
            fromRow: displayedMove.toRow,
            toRow: displayedMove.fromRow,
          }
        : {
            column: displayedMove.column,
            fromRow: displayedMove.fromRow,
            toRow: displayedMove.toRow,
          }
      : null;

  // ── Attack-ray inspector state (transient UI — not the store) ──
  const [hovered, setHovered] = React.useState<{ col: number; row: number } | null>(null);
  const [pinned, setPinned] = React.useState<{ col: number; row: number } | null>(null);
  // Pinned rays survive manual scrubbing but must clear the instant
  // playback resumes (per user-approved heuristic: "animation stays clean").
  const isPlaying = useSimulationStore((s) => s.isPlaying);
  React.useEffect(() => {
    if (isPlaying && pinned !== null) {
      // Play resuming clears pinned rays (explicit user heuristic — keeps
      // animation clean while preserving manual-scrub pinning).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPinned(null);
    }
  }, [isPlaying, pinned]);
  // Pinned column's queen may have moved columns? In our engine a queen
  // never changes column, so pin-by-col is stable. But if the board
  // shape changed (N slider), pin must clear — stale (col,row) would
  // dangle.
  React.useEffect(() => {
    if (pinned !== null && (board === null || pinned.col >= board.length)) {
      // Dangling pin after N shrinks — eagerly clear it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPinned(null);
    }
    // Include board so N changes also clear dangling hover; currentStep
    // is included only for the "scrub while pinned" recompute (rays track
    // the pinned queen's new row on each step — don't clear here, that's
    // `isPlaying`'s job).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, currentStep]);

  // Keep pinned in sync with the queen's current row (rows[col] may change
  // as the user scrubs while paused — rays should follow the pinned queen).
  const effectivePinned =
    pinned !== null && board !== null && pinned.col < board.length
      ? { col: pinned.col, row: board[pinned.col]! }
      : null;
  const inspected = pinned !== null ? effectivePinned : hovered;

  // Hit-set for hover-tooltips on attacked queens: col → "Attacked by Q…".
  // Computed here (not inside each QueenPiece) so the parent owns the
  // "truth" and the discs stay pure rendering. Only while rays are
  // visible — otherwise no hit queen shows a stale title.
  const hitTitles = React.useMemo(() => {
    if (!inspected || !board) return new Map<number, string>();
    // Local import-like lazy: mirrors QueenRays' classification of hits,
    // but without importing the SVG file into the board-rendering hot
    // path. The ray arithmetic itself lives in the single pure helper.
    const label = `${FILE_LABELS[inspected.col] ?? inspected.col}${n - inspected.row}`;
    // Reuse the same ray geometry the overlay uses (cheap for n ≤ 16).
    // We import the helper dynamically via the already-bundled module so
    // no runtime require is needed — `computeAttackRays` is already
    // tree-shaken in. For clarity over micro-optimisation, inline the
    // small dual: we already have `board`, so a single pass over every
    // col ≠ inspected.col is equivalent to the ray hit test and cheaper
    // to read. Both are correct; pick the board scan (mirrors the brute
    // oracle, and explains the "Attacked by" sentence directly).
    const map = new Map<number, string>();
    for (let col = 0; col < board.length; col++) {
      if (col === inspected.col) continue;
      const r = board[col]!;
      const sameRow = r === inspected.row;
      const sameDiag = Math.abs(col - inspected.col) === Math.abs(r - inspected.row);
      if (!sameRow && !sameDiag) continue;
      const colLabel = FILE_LABELS[col] ?? col;
      const rowNum = n - r;
      const dir = sameRow ? 'along row' : 'along diagonal';
      map.set(col, `Attacked by Q${label} ${dir} — paired with Q${colLabel}${rowNum}`);
    }
    return map;
  }, [inspected, board, n]);

  // Esc clears pins (and the transient hover, for completeness).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (pinned !== null || hovered !== null)) {
        setPinned(null);
        setHovered(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pinned, hovered]);

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

  const showEcho = echoMove !== null;

  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      {/* Chessboard Outer Container */}
      <div
        className={cn(
          'relative aspect-square w-full max-w-175 min-w-65 rounded-xs border-x p-2 shadow-md transition-all duration-300',
          isSolved
            ? // The `border-emerald-500/80` + `ring-emerald-500/20` class
              // strings are deliberately kept as literal Tailwind palette
              // classes (instead of the new `bg-global-max`-style semantic
              // tokens) so the Playwright e2e test in
              // `e2e/solve-flow.spec.ts` — which locates the solved wrapper
              // by `.border-emerald-500\/80` — keeps working. The semantic
              // equivalence with `--feature-global-max` is intentional.
              'border-emerald-500 ring-8 shadow-emerald-500/50 ring-emerald-500/50'
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
            from the grid's bounding rect line up exactly with squares.
            The 1px border lives on THIS box, not the grid: the overlay
            math divides the measured rect by N, so any border on the
            measured element leaks 2px into every cell computation and
            the tints drift up to ~2px off the true squares at the far
            edge (relatively worse the larger N gets). Borderless grid ⇒
            border-box == cells area exactly. */}
        <div className="relative h-full w-full rounded-xs border border-black/20">
          {/* Inner Grid — squares only. Queens live in the overlay below,
              positioned by x/y transforms (never `layout`). Borderless
              by design (see above) — keep `rounded-xs overflow-hidden`
              so the corner squares still clip inside the box border. */}
          <div
            ref={gridRef}
            className="grid h-full w-full overflow-hidden rounded-xs shadow-inner"
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
              // Displayed move respects scrub direction: forward shows the
              // current snapshot's move, backward shows the undone move in
              // reverse so the trail rewinds instead of jumping to a
              // different queen.
              const dm = displayedMove;
              const isDestinationSquare =
                dm !== null &&
                dm.column === col &&
                (isTrailReversed ? dm.fromRow === row : dm.toRow === row);
              // Trail includes the origin square (where the queen started)
              // plus intermediates, exclusive of the landing square which
              // gets an outline instead.
              const isOnMovePath =
                dm !== null &&
                dm.fromRow !== dm.toRow &&
                col === dm.column &&
                (isTrailReversed
                  ? row !== dm.fromRow &&
                    ((dm.fromRow < dm.toRow && row > dm.fromRow && row <= dm.toRow) ||
                      (dm.fromRow > dm.toRow && row < dm.fromRow && row >= dm.toRow))
                  : row !== dm.toRow &&
                    ((dm.fromRow < dm.toRow && row >= dm.fromRow && row < dm.toRow) ||
                      (dm.fromRow > dm.toRow && row <= dm.fromRow && row > dm.toRow)));
              // Order along the trail for staggered animation (0 = nearest source
              // in the displayed direction; reversed when scrubbing backwards)
              const trailIndex = isOnMovePath
                ? isTrailReversed
                  ? Math.abs(row - dm!.toRow)
                  : Math.abs(row - dm!.fromRow)
                : -1;

              return (
                <div
                  key={`sq-${col}-${row}`}
                  data-testid={`square-${col}-${row}`}
                  className={cn(
                    'relative flex items-center justify-center transition-colors duration-150',
                    isLightSquare
                      ? 'bg-[#f0d9b5] text-[#b58863] dark:bg-[#f0d9b5] dark:text-[#8a6549]'
                      : 'bg-[#c29b7a] text-[#f0d9b5] dark:bg-[#c29b7a] dark:text-[#d9c3a3]',
                  )}
                >
                  {/* Trail tint — animated along the queen's vertical path.
                      Cyan (improving) to match the moved glow + legend, same
                      opacity light/dark like the conflict glow. Resets every
                      move via key on the animated div. */}
                  {isOnMovePath && (
                    <motion.div
                      key={`${dm!.column}-${dm!.fromRow}-${dm!.toRow}-${col}-${row}`}
                      initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: motionTokens.duration.fast,
                        ease: motionTokens.easing.smooth,
                        delay: reduceMotion ? 0 : Math.max(0, trailIndex) * 0.035,
                      }}
                      className="pointer-events-none absolute inset-px rounded-[2px] bg-improving/35"
                      aria-hidden="true"
                    />
                  )}
                  {/* Landing — outline/border, not a fill. Animates only after the queen lands. */}
                  {isDestinationSquare && (
                    <motion.div
                      key={`${dm!.column}-${dm!.fromRow}-${dm!.toRow}-dest`}
                      initial={
                        reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.86 }
                      }
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: motionTokens.duration.fast,
                        ease: motionTokens.easing.smooth,
                        delay: reduceMotion ? 0 : durationMs / 1000,
                      }}
                      className="pointer-events-none absolute inset-0 rounded-[3px] border-2 border-improving shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--feature-improving)_90%,transparent)]"
                      aria-hidden="true"
                    />
                  )}
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
              {/* Attack-ray overlay — behind the queen tokens so tokens stay
                  fully legible; rays are pointer-events-none so they never
                  swallow hover/tap on a queen. */}
              <QueenRays
                inspected={inspected}
                board={board}
                cellW={cellW}
                cellH={cellH}
                n={n}
                reducedMotion={reduceMotion}
              />
              {board.map((row, col) => {
                // Moved-queen glow follows the DISPLAYED move like everything
                // else: on a backward scrub the undone queen (sitting at the
                // reversed origin) glows, not the previous step's queen.
                const dm = displayedMove;
                const isDestinationSquare =
                  dm !== null &&
                  dm.column === col &&
                  (isTrailReversed ? dm.fromRow === row : dm.toRow === row);
                const isPinned = pinned !== null && pinned.col === col;
                const isHoverTarget =
                  hovered !== null && hovered.col === col && hovered.row === row;
                const hitTitle = hitTitles.get(col);
                return (
                  <QueenPiece
                    key={col}
                    column={col}
                    row={row}
                    conflictsCount={queenConflictCounts[col]}
                    isInspected={isPinned}
                    isHovered={isHoverTarget}
                    hitTitle={hitTitle}
                    onInspectStart={() => setHovered({ col, row })}
                    onInspectEnd={() => setHovered(null)}
                    onTogglePin={() =>
                      setPinned((prev) => (prev !== null && prev.col === col ? null : { col, row }))
                    }
                    isMoved={isDestinationSquare}
                    deltaConflicts={
                      isDestinationSquare && dm
                        ? // Negated in reverse: undoing a Δ move changes
                          // conflicts by −Δ from the viewer's perspective.
                          isTrailReversed
                          ? -dm.deltaConflicts
                          : dm.deltaConflicts
                        : undefined
                    }
                    boardSize={n}
                    x={col * cellW}
                    y={row * cellH}
                    size={cellW}
                    durationMs={durationMs}
                    reducedMotion={reduceMotion}
                  />
                );
              })}

              {/* Origin marker from the displayed move — "the queen was HERE".
                  Positioned over the displayed origin (fromRow forward,
                  toRow in reverse); re-keys per move AND direction so each
                  scrub replays the departure animation. */}
              {showEcho && echoMove !== null && (
                <div
                  className="absolute"
                  style={{
                    left: echoMove.column * cellW,
                    top: echoMove.fromRow * cellH,
                    width: cellW,
                    height: cellH,
                  }}
                >
                  <OriginEcho
                    key={`${echoMove.column}-${echoMove.fromRow}-${echoMove.toRow}`}
                    move={echoMove}
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
