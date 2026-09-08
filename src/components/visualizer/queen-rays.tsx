'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { computeAttackRays, partitionRayByBoard } from '@/lib/attack-rays';
import { motionTokens } from '@/lib/motion-tokens';

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
 * QueenRays — pure square-tint attack overlay (no lines).
 *
 * Every square on the inspected queen's 8 sight-lines gets a bold
 * conflict tint (`fill-conflict/25`, `dark:fill-conflict/30`) with a
 * crisp inset edge; squares beyond the first queen hit on a line drop
 * to a lighter ghost tint (`fill-conflict/10`, `dark:fill-conflict/15`).
 * Hit queens keep a crisp ring + `Qc3 ↔ Qf6` pair pill (names the
 * relationship for colorblind users and dense boards).
 *
 * Chess.com-style language: the tint IS the ray. No beams, no hatch, no
 * gradients — flat fills only. Uses the shared grid→pixel math from
 * Chessboard's overlay, so no new measurement is introduced.
 */
export function QueenRays({ inspected, board, cellW, cellH, n, reducedMotion }: QueenRaysProps) {
  const motionOff = !!useReducedMotion() || reducedMotion;

  if (!inspected || !board || board.length === 0 || cellW === 0 || cellH === 0) return null;

  const rays = computeAttackRays(inspected.col, inspected.row, n);

  // Per-ray split: solid cells before the first hit, ghost cells after.
  // Deduped across rays so shared cells (only the source, excluded) render once.
  const seen = new Set<string>();
  const solidCells: { col: number; row: number; delay: number }[] = [];
  const ghostCells: { col: number; row: number; delay: number }[] = [];
  rays.forEach((ray, rayIdx) => {
    const { ghostFrom } = partitionRayByBoard(board, inspected, ray);
    ray.cells.forEach((cell, idx) => {
      const key = `${cell.col},${cell.row}`;
      if (seen.has(key)) return;
      seen.add(key);
      const entry = { ...cell, delay: rayIdx * 0.03 + idx * 0.008 };
      if (idx < ghostFrom) solidCells.push(entry);
      else ghostCells.push(entry);
    });
  });

  // Hit queens, deduped by column (at most one queen per column).
  const seenHit = new Set<number>();
  const hits: { col: number; row: number }[] = [];
  for (const ray of rays) {
    const { hits: rayHits } = partitionRayByBoard(board, inspected, ray);
    for (const h of rayHits) {
      if (!seenHit.has(h.col)) {
        seenHit.add(h.col);
        hits.push(h);
      }
    }
  }

  return (
    <svg
      data-testid="queen-rays"
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
      width={n * cellW}
      height={n * cellH}
      viewBox={`0 0 ${n * cellW} ${n * cellH}`}
      style={{ overflow: 'visible' }}
    >
      {/* Solid attack tint — the ray itself. */}
      {solidCells.map((cell) => (
        <motion.rect
          key={`tint-${cell.col}-${cell.row}`}
          x={cell.col * cellW + 1}
          y={cell.row * cellH + 1}
          width={cellW - 2}
          height={cellH - 2}
          rx={cellW * 0.14}
          className="fill-conflict/25 stroke-conflict/40 dark:fill-conflict/30"
          style={{ strokeWidth: 1 } as React.CSSProperties}
          initial={motionOff ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: motionTokens.duration.fast,
            ease: motionTokens.easing.smooth,
            delay: motionOff ? 0 : cell.delay,
          }}
        />
      ))}
      {/* Ghost tint beyond the first blocker — same hue, clearly quieter. */}
      {ghostCells.map((cell) => (
        <motion.rect
          key={`ghost-${cell.col}-${cell.row}`}
          x={cell.col * cellW + 1}
          y={cell.row * cellH + 1}
          width={cellW - 2}
          height={cellH - 2}
          rx={cellW * 0.14}
          className="fill-conflict/10 dark:fill-conflict/15"
          initial={motionOff ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: motionTokens.duration.fast,
            ease: motionTokens.easing.smooth,
            delay: motionOff ? 0 : cell.delay + 0.05,
          }}
        />
      ))}

      {/* Convergence markers on every hit queen: ring + pair label. */}
      {hits.map((cell) => {
        const x = cell.col * cellW + cellW / 2;
        const y = cell.row * cellH + cellH / 2;
        const targetLabel = `${FILE_LABELS[cell.col] ?? cell.col}${n - cell.row}`;
        const sourceLabel = `${FILE_LABELS[inspected.col] ?? inspected.col}${n - inspected.row}`;
        const pill = `${sourceLabel} ↔ ${targetLabel}`;
        return (
          <g
            key={`hit-${cell.col}-${cell.row}`}
            data-testid={`queen-ray-hit-${cell.col}-${cell.row}`}
          >
            <motion.circle
              cx={x}
              cy={y}
              r={cellW * 0.42}
              fill="none"
              strokeWidth={2.7}
              className="stroke-conflict"
              style={{ opacity: 0.96 }}
              initial={motionOff ? { scale: 1, opacity: 0.96 } : { scale: 0.82, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.96 }}
              transition={{
                duration: motionTokens.duration.fast,
                ease: motionTokens.easing.smooth,
                delay: motionOff ? 0 : 0.16,
              }}
            />
            <motion.circle
              cx={x}
              cy={y}
              r={cellW * 0.49}
              fill="none"
              strokeWidth={1.2}
              className="stroke-conflict/30"
              initial={motionOff ? { opacity: 0.35 } : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 0.35, scale: 1 }}
              transition={{
                duration: motionTokens.duration.fast,
                ease: motionTokens.easing.smooth,
                delay: motionOff ? 0 : 0.2,
              }}
            />
            <motion.g
              transform={`translate(${x} ${y + cellH * 0.54})`}
              initial={motionOff ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: motionTokens.duration.fast,
                ease: motionTokens.easing.smooth,
                delay: motionOff ? 0 : 0.18,
              }}
            >
              <rect
                x={-Math.max(36, pill.length * 3.5)}
                y={-7}
                width={Math.max(72, pill.length * 7)}
                height={14}
                rx={7}
                className="fill-card stroke-conflict shadow-sm"
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
            </motion.g>
          </g>
        );
      })}
    </svg>
  );
}
