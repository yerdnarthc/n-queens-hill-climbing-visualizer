/**
 * Motion tokens — the single source of truth for animation durations,
 * easings, and queen-travel constants.
 *
 * Per the vendored `motion-foundations` skill (Rules 5–6), components must
 * NOT inline `duration:` / `ease:` numbers — every value comes from here so
 * the whole board shares one feel and there is exactly one place to tune it.
 *
 * ── Knobs you (the user) will most likely want to tweak ──
 * - `QUEEN_STEPPER_MS` … travel time for a SINGLE frame-step while paused.
 * - `QUEEN_ARC_LIFT_PX` … how high the queen arcs mid-flight (px).
 * - `motionTokens.easing.overshoot` … the settle curve (4th value = overshoot
 *   amount: 1.2 ≈ 20% past the target; 1.0 = no overshoot).
 */

/** A cubic-bezier easing curve as Motion expects it: [x1, y1, x2, y2]. */
export type BezierEase = [number, number, number, number];

export const motionTokens = {
  /** Durations in SECONDS (Motion's `transition.duration` unit). */
  duration: {
    instant: 0.08,
    fast: 0.18,
    normal: 0.35,
    slow: 0.6,
    crawl: 1.0,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1] as BezierEase,
    sharp: [0.4, 0, 0.2, 1] as BezierEase,
    bounce: [0.34, 1.56, 0.64, 1] as BezierEase,
    linear: [0, 0, 1, 1] as BezierEase,
    /**
     * Overshoot: gentle lift-off, ~20% overshoot past the destination,
     * then settle. Carried over from Phase 10's inline
     * `[0.2, 0.9, 0.3, 1.2]` curve — now a shared token so the queen's
     * travel and its lift pulse arrive together.
     */
    overshoot: [0.2, 0.9, 0.3, 1.2] as BezierEase,
  },
  scale: {
    subtle: 0.98,
    press: 0.95,
    pop: 1.04,
    /** Queen lift pulse peak (was hardcoded `1.15` in queen-piece). */
    queenLift: 1.5,
    /** Hovered-queen emphasis — clearly bigger, still below pinned. */
    queenHover: 1.08,
    /** Pinned-queen emphasis — the largest resting scale on the board. */
    queenPinned: 1.14,
  },
};

/**
 * Fixed queen-travel duration in MILLISECONDS used when the user steps
 * frame-by-frame (paused / scrubbing / arrow keys).
 *
 * Deliberately NOT derived from playback `speed`: at 30× the speed-aware
 * formula yields 50 ms (a blink), which is unreadable when YOU control the
 * stepping pace. 220 ms sits between the `fast` (180 ms) and `normal`
 * (350 ms) tokens — long enough to read as travel, short enough that rapid
 * scrubbing never queues up.
 *
 * ★ Change this number if stepping feels too slow/fast. ★
 */
export const QUEEN_STEPPER_MS = 270;

/**
 * How high (px) the queen arcs above the straight origin→destination line
 * at mid-flight. The arc is what sells "travelling" instead of "sliding".
 *
 * The arc is vertical-only (queens move within their own column) and peaks
 * exactly halfway. Set to 0 for a perfectly straight slide.
 *
 * ★ Change this number to tune the arc height. ★
 */
export const QUEEN_ARC_LIFT_PX = 12;

/**
 * How much LONGER the origin echo (ghost marker) lingers compared to the
 * queen's travel, as a multiplier of the shared travel duration.
 *
 * The echo replays on every move, so at high playback speeds a 1× echo
 * (e.g. 50 ms at 30×) is over before you can register it. 2× keeps it
 * readable without outliving the next step at normal speeds.
 *
 * ★ Change this number to make the ghost linger longer/shorter. ★
 */
export const ORIGIN_ECHO_DURATION_MULTIPLIER = 1.5;

/**
 * Settle easing scaled by travel distance (in squares).
 *
 * A fixed 20% overshoot looks playful on a 1-square hop but reads as a
 * stall-and-slam on a 12-square flight (100+ px past the target, then a
 * slow crawl back). So the overshoot fades with distance: full
 * `[0.2, 0.9, 0.3, 1.2]` at ≤ 1 square, easing to a clean
 * `[0.2, 0.9, 0.3, 1.0]` (no overshoot, still snappy) at ≥ 6 squares,
 * linearly interpolated between. Pair with an `easeIn` rise so velocity
 * stays continuous through the arc apex at ANY distance.
 */
export function easeForTravel(distanceSquares: number): BezierEase {
  const d = Number.isFinite(distanceSquares) ? Math.max(0, distanceSquares) : 0;
  const fade = Math.min(1, Math.max(0, (d - 1) / 5));
  const overshoot = 1.2 - 0.2 * fade;
  return [0.2, 0.9, 0.3, Math.round(overshoot * 100) / 100];
}

/** Resting shadow of the queen token (= Tailwind `shadow-md`). */
export const QUEEN_SHADOW_REST =
  '0 4px 6px -1px rgb(0 0 0 / 0.18), 0 2px 4px -2px rgb(0 0 0 / 0.12)';

/** Aloft shadow at lift peak (= Tailwind `shadow-lg`, grown). */
export const QUEEN_SHADOW_LIFT =
  '0 12px 20px -2px rgb(0 0 0 / 0.32), 0 6px 10px -3px rgb(0 0 0 / 0.18)';

/**
 * Release glide for the draggable tour tooltip (`dragTransition`).
 *
 * Motion's defaults (`power: 0.8`, `timeConstant: 700`) make a fast flick
 * drift a long way with a floaty "less gravity" feel — wrong for a dialog
 * whose whole job is staying where the user put it (usually: off the
 * spotlight). These minimized values keep a hint of physical settle
 * instead of a dead stop, roughly: flick it and it glides a few dozen px,
 * not a few hundred.
 *
 * ★ Change these numbers to tune the drift (`power` scales how much of
 * the release velocity carries over, `timeConstant` in ms sets how fast
 * it decays). To kill inertia ENTIRELY, set `dragMomentum={false}` on
 * the tooltip in `onboarding-tour.tsx` instead — the tooltip then stops
 * dead on release. ★
 */
export const TOUR_TOOLTIP_DRAG_GLIDE = {
  power: 0.2,
  timeConstant: 150,
} as const;
