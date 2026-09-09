'use client';

import { useReducedMotion } from 'motion/react';
import { useSimulationStore } from '@/store';
import { computeStepDuration } from '@/lib/animation-timings';
import { QUEEN_STEPPER_MS } from '@/lib/motion-tokens';

/**
 * useQueenDurationMs — the single source for "how long should the queen's
 * travel animation take right now" (milliseconds).
 *
 * Design rule (must-implement): the animation tracks playback `speed` ONLY
 * while the simulation is PLAYING. When the user steps frame-by-frame
 * (step buttons, arrow keys, scrubber, jump actions) the sim is paused, so
 * a fixed, readable duration is used no matter what speed is configured —
 * at 20× the speed-aware formula would give 50 ms (an unreadable blink).
 *
 * - reduced motion → 0 (instant snap; callers skip pulses too)
 * - playing → `computeStepDuration(speed)` — 50…400 ms speed-aware curve
 * - paused/stepping → `QUEEN_STEPPER_MS` (tweak it in `@/lib/motion-tokens`)
 */
export function useQueenDurationMs(speed: number): number {
  const reduceMotion = useReducedMotion();
  const isPlaying = useSimulationStore((s) => s.isPlaying);

  if (reduceMotion) return 0;
  if (!isPlaying) return QUEEN_STEPPER_MS;
  return computeStepDuration(speed, false);
}
