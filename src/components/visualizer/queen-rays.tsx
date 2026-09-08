'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { computeAttackRays, partitionRayByBoard } from '@/lib/attack-rays';
import { motionTokens } from '@/lib/motion-tokens';
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

interface QueenRaysProps {
  /** Hovered queen in board coords, or null (hidden). */
  inspected: { col: number; row: number } | null;
  /** Current snapshot board: `board[col] = row`. */
  board: readonly number[] | null;
  /** Pre-snapshot: queen → pixel center ({x: col*cellW+cellW/2}) is derived here. */
  cellW: number;
  cellH: number;
  /** Board dimension (for edge-clamping, also feeds the ray helper). */
  n: number;
  /** Reduced-motion gate: skip draw-on animation when true. */
  reducedMotion: boolean;
}

/**
 * QueenRays — 8 sight-line rays from the inspected queen to every board
 * edge, with a crisp ring on every *other* queen a ray passes through and
 * a small "Qe4 ↔ Qb2" pair-pill naming the attacking relationship.
 *
 * Flat ink only (no gradients): rays that hit a queen glow in the conflict
 * token up to the first blocker (`--feature-conflict`), the remainder
 * ghost at ~30 % as a solid low-opacity line (per user: blocked-but-
 * visible, solid not dashed). Beyond-hit markers keep a ring + the pair
 * label even though the underlying ray ghosts.
 *
 * Uses the shared grid→pixel math from Chessboard's overlay, so no new
 * measurement is introduced.
 */
export function QueenRays({ inspected, board, cellW, cellH, n, reducedMotion }: QueenRaysProps) {
  const motionOff = !!useReducedMotion() || reducedMotion;

  if (!inspected || !board || board.length === 0 || cellW === 0 || cellH === 0) return null;

  const rays = computeAttackRays(inspected.col, inspected.row, n);

  // Center of the inspected queen in overlay pixels.
  const cx = inspected.col * cellW + cellW / 2;
  const cy = inspected.row * cellH + cellH / 2;

  // Accumulate which queens get hit at all (deduped by col — at most one
  // queen per column, so hit columns are unique).
  const hitCols = new Set<number>();

  return (
    <svg
      data-testid="queen-rays"
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
      // Keep svg in sync with the overlay's measured size.
      width={n * cellW}
      height={n * cellH}
      viewBox={`0 0 ${n * cellW} ${n * cellH}`}
      style={{ overflow: 'visible' }}
    >
      {rays.map((ray, index) => {
        if (ray.cells.length === 0) return null;
        const { hits } = partitionRayByBoard(board, inspected, ray);

        // Remember every hit col for the marker pass.
        hits.forEach((c) => hitCols.add(c.col));

        // Ray endpoint: center of the last cell in the ray.
        const last = ray.cells[ray.cells.length - 1]!;
        const ex = last.col * cellW + cellW / 2;
        const ey = last.row * cellH + cellH / 2;

        // First blocker center (if any): where the ghost segment starts.
        const blocker = hits[0] ?? null;
        const bx = blocker ? blocker.col * cellW + cellW / 2 : null;
        const by = blocker ? blocker.row * cellH + cellH / 2 : null;

        const hasHit = hits.length > 0;

        return (
          <g key={index}>
            {/* Segment A: solid — inspected center → blocker (or full ray if no hit). */}
            <motion.line
              x1={cx}
              y1={cy}
              x2={hasHit ? bx! : ex}
              y2={hasHit ? by! : ey}
              strokeLinecap="round"
              className={hasHit ? 'stroke-conflict' : 'stroke-muted-foreground/55'}
              strokeWidth={hasHit ? 2.5 : 2}
              style={{ opacity: hasHit ? 0.9 : 0.6 }}
              initial={
                motionOff ? { pathLength: 1, opacity: hasHit ? 0.9 : 0.6 } : { pathLength: 0 }
              }
              animate={{ pathLength: 1 }}
              transition={{
                duration: motionTokens.duration.fast,
                ease: motionTokens.easing.smooth,
                delay: motionOff ? 0 : index * 0.025,
              }}
            />
            {/* Segment B: ghost — blocker → board edge (only when this ray hit something). */}
            {hasHit && blocker && (
              <motion.line
                x1={bx! + (ex - bx!) * 0.01 /* nudge past blocker center */}
                y1={by! + (ey - by!) * 0.01}
                x2={ex}
                y2={ey}
                strokeLinecap="round"
                className="stroke-muted-foreground/55"
                strokeWidth={2}
                style={{ opacity: 0.3 }}
                initial={motionOff ? { pathLength: 1, opacity: 0.3 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: motionTokens.duration.fast,
                  ease: motionTokens.easing.smooth,
                  delay: motionOff ? 0 : index * 0.025 + 0.04,
                }}
              />
            )}
          </g>
        );
      })}

      {/* Convergence markers on every hit queen: ring + pair label. */}
      {(() => {
        const seen = new Set<number>();
        return rays.flatMap((ray) => {
          const { hits } = partitionRayByBoard(board, inspected, ray);
          return hits.filter((c) => {
            const firstTime = !seen.has(c.col);
            if (firstTime) seen.add(c.col);
            return firstTime;
          });
        });
      })().map((cell) => {
        const x = cell.col * cellW + cellW / 2;
        const y = cell.row * cellH + cellH / 2;
        const targetLabel = `${FILE_LABELS[cell.col] ?? cell.col}${n - cell.row}`;
        const sourceLabel = `${FILE_LABELS[inspected.col] ?? inspected.col}${n - inspected.row}`;
        const pill = `${sourceLabel} ↔ ${targetLabel}`;
        return (
          <g
            key={`hit-${cell.col}-${cell.row}`}
            data-testid={`queen-ray-hit-${cell.col}-${cell.row}`}
            // Ring: crisp, non-animated (calm at 30×).
          >
            {/* `circle` ring sized to hug the token disc (~82% of a square). */}
            <circle
              cx={x}
              cy={y}
              r={cellW * 0.42}
              fill="none"
              strokeWidth={2.5}
              strokeLinecap="round"
              className="stroke-conflict"
              style={{ opacity: 0.95 }}
            />
            {/* Small pair-pill — centered below the attacked queen, with a
                hook for the hover-tooltip payload (consumed in Chessboard on
                the queen token itself). */}
            <g transform={`translate(${x} ${y + cellH * 0.52})`}>
              <rect
                x={-Math.max(34, pill.length * 3.4)}
                y={-7}
                width={Math.max(68, pill.length * 6.8)}
                height={14}
                rx={7}
                className="fill-card stroke-conflict"
                strokeWidth={1}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-conflict font-mono text-[7px] font-bold"
                style={{ fontSize: '7px' }}
              >
                {pill}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

// Unused import guard (cn retained for future hit-pill variants if needed).
void cn;
