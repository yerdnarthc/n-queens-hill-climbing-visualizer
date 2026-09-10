'use client';

import * as React from 'react';
// `animateMotionValue` is Motion's standalone imperative animator (drives
// MotionValues); `animate` below (from `useAnimate`) drives DOM nodes.
// Different targets, hence the alias.
import { animate as animateMotionValue, motion, useAnimate, useMotionValue } from 'motion/react';
import { QueenGlyph } from './queen-glyph';
import { cn } from '@/lib/utils';
import { easeForTravel, motionTokens, QUEEN_ARC_LIFT_PX } from '@/lib/motion-tokens';

interface QueenPieceProps {
  column: number;
  row: number;
  conflictsCount: number;
  isMoved: boolean;
  deltaConflicts?: number;
  boardSize?: number;
  /** Whether THIS queen is pinned (tapped/clicked). Drives aria-pressed + pinned visuals. */
  isInspected?: boolean;
  /** Whether THIS queen is hover/focus-targeted (transient, unpinned). Drives hover visuals. */
  isHovered?: boolean;
  /**
   * Force the glyph glow off even when conflicted. The tour sets this
   * during the chessboard intro so the board opens calm; clearing it on
   * the "Red Glow Means Attacked" substep reveals the glow through the
   * existing crossfade. Badges are unaffected.
   */
  suppressGlow?: boolean;
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
  isHovered = false,
  suppressGlow = false,
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
  // mid-flight (no pile-up at 20×). Under reduced motion (or 0 duration)
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

    // Scale pulse on the queen glyph (transparent token — no container to
    // shadow, so only scale lifts; the glyph's own SVG glow handles state).
    animate(
      scope.current,
      { scale: [1, motionTokens.scale.queenLift, 1] },
      { duration: seconds, ease: motionTokens.easing.smooth },
    );
  }, [column, row, durationMs, reducedMotion, animate, scope]);

  // Glyph-level glow — no container, no halo div, no drop-shadow on the
  // button. The queen IS the glyph, so conflict/improving glow follows
  // the silhouette itself via an SVG filter on the path.
  // Suppression wins over everything (tour intro staging); otherwise
  // conflict beats moved, exactly as before.
  let glyphGlow: 'conflict' | 'improving' | 'none' = 'none';
  if (!suppressGlow) {
    if (hasConflict) glyphGlow = 'conflict';
    else if (isMoved) glyphGlow = 'improving';
  }

  // Hover/pinned emphasis — scale + brightness on the glyph wrapper (NOT
  // the button: the travel lift-pulse owns the button's scale, and nested
  // transforms compose). Pinned wins over hovered when both are true.
  const emphasisScale = isInspected
    ? motionTokens.scale.queenPinned
    : isHovered
      ? motionTokens.scale.queenHover
      : 1;
  const emphasisBrightness = isInspected ? 'brightness-125' : isHovered ? 'brightness-110' : '';

  return (
    <motion.div
      style={{ x: travelX, y: travelY, width: size, height: size, willChange: 'transform' }}
      className="absolute top-0 left-0 flex touch-manipulation items-center justify-center select-none"
      data-testid={`queen-${column}-${row}`}
    >
      {/* Pinned ring — persistent white outline marking the tapped/clicked
          queen. White reads as "selected" without colliding with the red
          (conflict) / blue (moved) state language. Sits outside the glyph. */}
      {isInspected && (
        <div
          data-testid="queen-pinned-ring"
          className="absolute -inset-1 rounded-full border-2 border-white/90"
          aria-hidden="true"
        />
      )}
      {/* Main Queen Token — transparent container: no disc, no halo div, no
          box-shadow. The lift animation still targets this button (scale
          only — see effect above), but the visual glow lives on the glyph
          itself. */}
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
          'relative z-10 flex h-full w-full cursor-pointer items-center justify-center bg-transparent transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card focus-visible:outline-none',
        )}
      >
        <motion.span
          className={cn('flex h-full w-full items-center justify-center', emphasisBrightness)}
          initial={false}
          animate={{ scale: emphasisScale }}
          transition={{
            duration: reducedMotion ? 0 : motionTokens.duration.fast,
            ease: motionTokens.easing.smooth,
          }}
        >
          <QueenGlyph className="h-full w-full text-white" glow={glyphGlow} />
        </motion.span>

        {/* Conflict count badge on the queen if > 0.
            Sized for legibility: min-width + nowrap so double-digit counts
            (common at N=16) never clip or wrap; leading-none keeps digits
            vertically centered. */}
        {hasConflict && (
          <span
            aria-label={`${conflictsCount} attacking pairs on this queen`}
            className={cn(
              'absolute flex items-center justify-center rounded-full bg-conflict-deep font-mono font-bold whitespace-nowrap text-primary-foreground tabular-nums shadow-xs ring-1 ring-conflict',
              isDense
                ? '-top-0.5 -right-0.5 h-3.5 min-w-3.5 px-1 text-[11px] leading-none'
                : '-top-1 -right-1 h-5 min-w-5 px-1 text-[13px] leading-none',
            )}
          >
            {conflictsCount}
          </span>
        )}

        {/* Delta badge on recently moved queen */}
        {isMoved && deltaConflicts !== undefined && (
          <span
            aria-label={`Move changed conflicts by ${deltaConflicts}`}
            className={cn(
              'absolute flex items-center justify-center rounded-full font-mono font-bold whitespace-nowrap text-primary-foreground tabular-nums shadow-xs',
              isDense
                ? '-right-0.5 -bottom-0.5 h-3.5 min-w-3.5 px-1 text-[11px] leading-none'
                : '-right-1 -bottom-1 h-6 min-w-6 px-1 text-[13px] leading-none',
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
