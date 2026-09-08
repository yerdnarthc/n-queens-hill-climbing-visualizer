'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { motionTokens } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';

/**
 * QueenGlyph — the queen artwork from `src/assets/icons/chess-queen.svg`
 * (via SVG Repo), inlined as path data so it themes with the token.
 *
 * The source is a single solid silhouette (crown with ball tips, collar
 * bar, base bar) on a 512×512 grid — no strokes, no detail layer — so this
 * component is one `<path>` filling `currentColor`. Set size + ink via
 * `className` (e.g. `"h-4/5 w-4/5 text-stone-100"`); glow follows the glyph
 * shape itself, so no container is needed — the queen IS the glyph.
 * Always `aria-hidden`: state meaning lives in the badges/labels, never
 * in this decoration.
 *
 * Why a crossfading overlay instead of animating `filter`: fading a
 * drop-shadow in/out means interpolating its *color*, and Motion does
 * that math in straight (non-premultiplied) RGBA — `transparent`
 * (= rgba(0,0,0,0)) fading to red passes through a dark maroon midpoint,
 * i.e. the black flash. (Browsers would premultiply correctly, but the
 * filter string is driven from JS here.) So the glow layer is a second
 * copy of the silhouette carrying its FINAL colored filter at all times,
 * and only its *opacity* animates (0↔1) — a single number, no color math,
 * nothing that can flash. Red→cyan crossfades via AnimatePresence.
 */
interface QueenGlyphProps {
  /** Size + silhouette ink (inherits `currentColor`, e.g. `text-white`). */
  className?: string;
  /** Glow follows the glyph shape itself, not a container. */
  glow?: 'conflict' | 'improving' | 'none';
}

const PATH_D =
  'M477.518 181.966a25 25 0 0 1-34.91 23l-62.29 150.26h-248.92l-62.24-150.19a25 25 0 1 1 9.73-7.29l87 71.2 20.92-126.4a25 25 0 1 1 14.7-1.85l54.31 117 54.42-117.3a25 25 0 1 1 14.58 2.08l20.93 126.42 87.26-71.3a25 25 0 1 1 44.51-15.63zm-71.66 241.25h-300v60h300v-60zm-27.75-52h-244.22v36h244.22v-36z';

const CONFLICT_FILTER =
  'drop-shadow(0 0 6px color-mix(in oklab, var(--feature-conflict) 70%, transparent)) drop-shadow(0 0 14px color-mix(in oklab, var(--feature-conflict) 80%, transparent))';
const IMPROVING_FILTER =
  'drop-shadow(0 0 6px color-mix(in oklab, var(--feature-improving) 70%, transparent)) drop-shadow(0 0 14px color-mix(in oklab, var(--feature-improving) 50%, transparent))';

function GlyphArt() {
  return (
    <path
      fill="currentColor"
      stroke="#000000"
      strokeWidth="20"
      strokeLinejoin="round"
      strokeLinecap="round"
      paintOrder="stroke"
      d={PATH_D}
    />
  );
}

export function QueenGlyph({ className, glow = 'none' }: QueenGlyphProps) {
  const reduceMotion = !!useReducedMotion();
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: motionTokens.duration.instant, ease: motionTokens.easing.linear };

  return (
    <span
      className={cn('relative inline-block', className)}
      aria-hidden="true"
      data-testid="queen-glyph"
    >
      {/* Base silhouette — always fully visible, never filtered. */}
      <svg viewBox="0 0 512 512" className="block h-full w-full" aria-hidden="true">
        <GlyphArt />
      </svg>
      {/* Glow copy — same art, final colored filter baked in; only opacity
          animates, so no color interpolation can ever flash. */}
      <AnimatePresence initial={false}>
        {glow !== 'none' && (
          <motion.svg
            key={glow}
            viewBox="0 0 512 512"
            className="absolute inset-0 block h-full w-full"
            aria-hidden="true"
            style={{ filter: glow === 'conflict' ? CONFLICT_FILTER : IMPROVING_FILTER }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            <GlyphArt />
          </motion.svg>
        )}
      </AnimatePresence>
    </span>
  );
}
