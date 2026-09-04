'use client';

import * as React from 'react';
import type { MoveDetail } from '@/lib/engine';

/**
 * MoveTrajectory — a thin SVG line drawn from the origin square to the
 * destination square during a queen move, making the "from → to" direction
 * visually unmistakable (the user's "where is the queen going?" pain point).
 *
 * The line draws itself via `stroke-dashoffset` over the move duration
 * (passed in as a prop by the parent so it can be matched to the queen's
 * own flight duration — see `computeStepDuration` in `@/lib/animation-timings`).
 * Reduced-motion users get a static line at full strength (no animation).
 *
 * Mounted as a sibling of the chessboard grid, absolutely positioned over
 * the grid; `pointer-events-none` so it never blocks clicks on squares.
 */
export interface MoveTrajectoryProps {
  /** The most recent move (null when no move has happened yet, e.g. step 0). */
  move: MoveDetail | null;
  /** Board side length — used to compute square center coordinates. */
  boardSize: number;
  /**
   * Ref to the grid container (`<div data-testid="chessboard-grid">`).
   * Used to read the live bounding rect; the line follows the grid even
   * when the board resizes (window resize, breakpoints).
   */
  gridRef: React.RefObject<HTMLDivElement | null>;
  /** Total move duration in ms. Use `computeStepDuration(speed)` to derive. */
  durationMs: number;
  /** Pass `true` to skip the draw animation (for `prefers-reduced-motion`). */
  reducedMotion?: boolean;
}

export function MoveTrajectory({
  move,
  boardSize,
  gridRef,
  durationMs,
  reducedMotion = false,
}: MoveTrajectoryProps) {
  // Read the grid's live bounding rect. Re-measure on resize.
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  React.useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    setRect(el.getBoundingClientRect());
    const ro = new ResizeObserver(() => setRect(el.getBoundingClientRect()));
    ro.observe(el);
    return () => ro.disconnect();
  }, [gridRef]);

  // No active move ⇒ render nothing (don't even occupy a layer in the DOM).
  if (!move) return null;
  if (!rect) return null; // wait for the first measurement
  if (boardSize <= 0) return null;

  // Convert (col, fromRow / toRow) to pixel coordinates of the square centers.
  // `rows[col] = row` means row 0 is at the TOP of the grid; we flip Y so
  // the SVG (where Y grows downward) matches the visual.
  const cellW = rect.width / boardSize;
  const cellH = rect.height / boardSize;
  const cx = (col: number) => (col + 0.5) * cellW;
  const cy = (row: number) => (row + 0.5) * cellH;

  const x1 = cx(move.column);
  const y1 = cy(move.fromRow);
  const x2 = cx(move.column);
  const y2 = cy(move.toRow);

  // The line is purely vertical (a queen moves within its own column), but we
  // use `<line>` with start/end coords anyway so the gradient renders correctly.
  // Compute the line length for the dasharray draw effect.
  const lineLength = Math.hypot(x2 - x1, y2 - y1);

  // Re-key on the move step so a new move re-mounts the line and replays the
  // draw animation. `fromRow` + `toRow` distinguishes same-step restarts
  // (theoretically possible if a step were emitted twice with different rows,
  // but a defensive key change costs nothing).
  const animKey = `${move.column}-${move.fromRow}-${move.toRow}`;

  return (
    <svg
      data-testid="move-trajectory"
      className="pointer-events-none absolute inset-0 z-0"
      width={rect.width}
      height={rect.height}
      viewBox={`0 0 ${rect.width} ${rect.height}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="trajectory-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--feature-improving)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--feature-improving-deep)" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {reducedMotion ? (
        // Static line at full strength — no draw animation, no overshoot.
        <line
          key={animKey}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="url(#trajectory-gradient)"
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.7}
        />
      ) : (
        // Animated line: the dasharray is the full length, dashoffset starts
        // at `length` (invisible) and animates to 0 (fully drawn). This is
        // the classic "draw the line" SVG technique.
        <line
          key={animKey}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="url(#trajectory-gradient)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={lineLength}
          strokeDashoffset={lineLength}
          opacity={0.85}
          style={{
            animation: `trajectory-draw ${durationMs}ms cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards`,
          }}
        />
      )}
    </svg>
  );
}
