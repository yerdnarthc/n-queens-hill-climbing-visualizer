'use client';

import * as React from 'react';
// `animateMotionValue` is Motion's standalone imperative animator (drives
// MotionValues); `animate` below (from `useAnimate`) drives DOM nodes.
// Different targets, hence the alias.
import { animate as animateMotionValue, motion, useAnimate, useMotionValue } from 'motion/react';
import { QueenGlyph } from './queen-glyph';
import { cn } from '@/lib/utils';
import {
  easeForTravel,
  motionTokens,
  QUEEN_ARC_LIFT_PX,
  QUEEN_SHADOW_LIFT,
  QUEEN_SHADOW_REST,
} from '@/lib/motion-tokens';

interface QueenPieceProps {
  column: number;
  row: number;
  conflictsCount: number;
  isMoved: boolean;
  deltaConflicts?: number;
  boardSize?: number;
  /** Whether THIS queen is the currently inspected (hovered/pinned) queen. */
  isInspected?: boolean;
  /** Native-title payload on hit queens: "Attacked by Qc3 along row". */
  hitTitle?: string;
  /** Hover/focus/tap wiring from the parent (transient UI — not the store). */
  onInspectStart?: () => void;
  onInspectEnd?: () => void;
  onTogglePin?: () => void;
  /**
   * Top-left pixel position of this queen's square inside the board overlay.
   * The queen travels by tweening `x`/`y` transforms (GPU-composited) —
   * never `layout`, which would force the browser to re-measure the whole
   * grid on every step.
   */
  x: number;
  y: number;
  /** Square size in px — the queen token fills exactly one square. */
  size: number;
  /**
   * Travel duration in ms. Injected by the parent (already gated by
   * `useQueenDurationMs`: speed-aware while playing, fixed `QUEEN_STEPPER_MS`
   * while stepping frame-by-frame, 0 under reduced motion).
   */
  durationMs: number;
  /** `prefers-reduced-motion` — collapse travel to instant, skip the pulse. */
  reducedMotion: boolean;
}

export function QueenPiece({
  column,
  row,
  conflictsCount,
  isMoved,
  deltaConflicts,
  boardSize = 8,
  isInspected = false,
  hitTitle,
  onInspectStart,
  onInspectEnd,
  onTogglePin,
  x,
  y,
  size,
  durationMs,
  reducedMotion,
}: QueenPieceProps) {
  const hasConflict = conflictsCount > 0;
  const isDense = boardSize >= 12;

  // Animation handle for the lift + shadow-grow pulse on the queen token.
  const [scope, animate] = useAnimate();

  // Explicit travel state. MotionValues are written imperatively and read
  // only inside effects (never during render — the `react-hooks/refs`
  // lint rule forbids ref reads in render).
  const travelX = useMotionValue(x);
  const travelY = useMotionValue(y);

  // Travel: x goes straight; y arcs upward mid-flight by QUEEN_ARC_LIFT_PX
  // (tweak it in `@/lib/motion-tokens`) so the move reads as "flying"
  // rather than "sliding". Fires only when the target square changes;
  // stopping the previous controls lets a new move cleanly take over
  // mid-flight (no pile-up at 30×). Under reduced motion (or 0 duration)
  // the queen snaps to the square instead.
  React.useEffect(() => {
    if (reducedMotion || durationMs <= 0) {
      travelX.set(x);
      travelY.set(y);
      return;
    }
    const seconds = durationMs / 1000;
    const fromY = travelY.get();
    const arcing = fromY !== y;
    // Squares travelled — drives the settle easing. A fixed overshoot
    // stalls long flights (huge bounce-back), so `easeForTravel` fades it
    // with distance (see `@/lib/motion-tokens`).
    const distanceSquares = size > 0 ? Math.abs(y - fromY) / size : 0;
    const yTarget = arcing ? [fromY, (fromY + y) / 2 - QUEEN_ARC_LIFT_PX, y] : y;
    const controls = [
      animateMotionValue(travelX, x, {
        duration: seconds,
        ease: motionTokens.easing.overshoot,
      }),
      animateMotionValue(travelY, yTarget, {
        duration: seconds,
        // Per-segment easings for the 2-segment arc, tuned so velocity
        // stays CONTINUOUS through the apex at any distance: `easeIn`
        // accelerates off the origin (no liftoff stall) and is still
        // steep at the apex, where the fall segment starts steep too —
        // no brake-then-surge hitch. The fall's overshoot itself is
        // distance-scaled (`easeForTravel`): full bounce on short hops,
        // clean settle on long flights. Straight moves (no arc) keep the
        // plain overshoot curve.
        ease: arcing
          ? ['easeIn' as const, easeForTravel(distanceSquares)]
          : motionTokens.easing.overshoot,
      }),
    ];
    return () => {
      controls.forEach((c) => c.stop());
    };
  }, [x, y, size, durationMs, reducedMotion, travelX, travelY]);

  // On every ACTUAL move, fire the kinetic pulse:
  //  - scale 1 → lift → 1 ("lift" at start, "land with settle" at end)
  //  - box-shadow grows and back (depth cue: queen reads as "above" the
  //    board momentarily)
  // Skipped under reduced motion or when duration is 0. Gated on position
  // change (not just prop change) so toggling play/pause or re-rendering
  // for badge updates never replays the pulse. `useAnimate` cancels an
  // in-flight pulse when a new move fires mid-flight (fast playback).
  const lastPulsed = React.useRef({ column, row });
  React.useEffect(() => {
    const movedNow = lastPulsed.current.column !== column || lastPulsed.current.row !== row;
    lastPulsed.current = { column, row };
    if (!movedNow) return;
    if (reducedMotion) return;
    if (durationMs <= 0) return;

    const seconds = durationMs / 1000;

    // Scale pulse on the queen token.
    animate(
      scope.current,
      { scale: [1, motionTokens.scale.queenLift, 1] },
      { duration: seconds, ease: motionTokens.easing.smooth },
    );

    // Shadow grow (multi-stop box-shadow interpolation).
    animate(
      scope.current,
      { boxShadow: [QUEEN_SHADOW_REST, QUEEN_SHADOW_LIFT, QUEEN_SHADOW_REST] },
      { duration: seconds, ease: motionTokens.easing.smooth },
    );
  }, [column, row, durationMs, reducedMotion, animate, scope]);

  return (
    <motion.div
      style={{ x: travelX, y: travelY, width: size, height: size, willChange: 'transform' }}
      className="absolute top-0 left-0 flex touch-manipulation items-center justify-center select-none"
      data-testid={`queen-${column}-${row}`}
    >
      {/* State glow — soft halo behind the token (no solid disc: the queen
          is a transparent glyph floating on the square, chess.com-style).
          Red = attacked, blue = just moved; calm static glow, no pulse, so
          it stays readable at 30× playback. Lives on this separate layer so
          it never fights the lift-pulse box-shadow animation on the button. */}
      {hasConflict ? (
        <div
          className="absolute inset-[10%] rounded-full shadow-[0_0_16px_6px_color-mix(in_oklab,var(--feature-conflict)_55%,transparent)]"
          aria-hidden="true"
        />
      ) : isMoved ? (
        <div
          className="absolute inset-[10%] rounded-full shadow-[0_0_14px_5px_color-mix(in_oklab,var(--feature-improving)_50%,transparent)]"
          aria-hidden="true"
        />
      ) : null}

      {/* Main Queen Token — `ref={scope}` is the animation target for the
          lift + shadow-grow pulse above. Transparent by design: no disc, no
          ring fills — just the glyph floating on the square. The glyph is
          dark espresso (`text-stone-900`, readable on both warm-wood tones
          in both themes since board colors never change) with a stacked
          drop-shadow: dark contact depth underneath + soft white keyline on
          top so it separates from light AND dark squares. */}
      <button
        type="button"
        ref={scope}
        tabIndex={0}
        role="button"
        aria-label={`Queen at ${String.fromCharCode(97 + column)}${boardSize - row}, ${conflictsCount} attacker${conflictsCount === 1 ? '' : 's'}`}
        aria-pressed={isInspected}
        title={hitTitle}
        onMouseEnter={onInspectStart}
        onMouseLeave={onInspectEnd}
        onFocus={onInspectStart}
        onBlur={onInspectEnd}
        onClick={onTogglePin}
        className={cn(
          'relative z-10 flex h-[82%] w-[82%] cursor-pointer items-center justify-center rounded-full bg-transparent transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none',
        )}
        style={{
          // Equivalent of `shadow-md` from Tailwind, expressed as a
          // box-shadow string so Motion can animate it (see motion-tokens).
          boxShadow: QUEEN_SHADOW_REST,
        }}
      >
        <span className="drop-shadow-[0_0_1.5px_rgb(255_255_255/0.85)] drop-shadow-[0_1px_1px_rgb(0_0_0/0.45)]">
          <QueenGlyph className="h-[80%] w-[80%] text-stone-900" />
        </span>

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
      </button>
    </motion.div>
  );
}
