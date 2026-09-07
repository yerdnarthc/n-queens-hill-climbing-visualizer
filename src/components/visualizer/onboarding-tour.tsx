'use client';

/**
 * OnboardingTour — first-visit spotlight walkthrough of the visualizer page.
 *
 * Shows once per browser (persisted in `localStorage` under a versioned key,
 * so closing the tab does NOT re-trigger it), then never again unless the
 * user replays it ("Replay tour" button) or visits with `?tour=1`.
 *
 * UX contract (from the plan the user approved):
 * - Rounded-rect spotlight cut around each target; the rest of the page is
 *   dimmed with four backdrop panels. Clicking empty (dimmed) space advances.
 * - Steps cover every key knob: board N → strategy → seed → plateau policy →
 *   restarts → (SA cooling, conditional) → board → playback → analytics →
 *   stats → share/export.
 * - The tour forces `strategy: 'steepest-ascent'` on entry (so every step's
 *   target exists deterministically) and restores the user's strategy on exit.
 * - The "Advanced Policy Knobs" collapsible is auto-opened for the policy
 *   steps and restored afterwards — the tour never leaves the user's UI
 *   in a different state than it found it.
 *
 * Motion notes (vendored skills):
 * - `motion/react` only; all numbers from `@/lib/motion-tokens` (foundations
 *   Rules 1 + 5). The spotlight itself is NOT animated (foundations Rule 4
 *   bans top/left/width/height in `animate`) — it cuts instantly while the
 *   tooltip fades with opacity only. Reduced motion collapses even that.
 * - Dialog pattern per `motion-patterns` Rule 6: role="dialog", aria-modal,
 *   Escape to close. AnimatePresence + key + exit per Rules 1–2.
 * - Drag per `motion-advanced`: the tooltip is free-draggable with
 *   `dragControls` started from non-button areas only, so button clicks
 *   never turn into drags. Release uses a minimized glide
 *   (`TOUR_TOOLTIP_DRAG_GLIDE`) instead of Motion's floaty defaults — a
 *   dialog must stay where the user put it. Drag offsets are transforms;
 *   a step change remounts the tooltip (key={step.id}) and re-anchors it.
 */
import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import { GripVertical, Move, X } from 'lucide-react';
import { simulationStore } from '@/store';
import type { StrategyId } from '@/lib/engine';
import { useScrollLock } from '@/hooks/useScrollLock';
import { motionTokens, TOUR_TOOLTIP_DRAG_GLIDE } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';

/** Versioned so a future tour redesign can re-show once (`:v2`). */
export const TOUR_STORAGE_KEY = 'nqueens-tour:v1';
/** Dispatch `window.dispatchEvent(new CustomEvent(REOPEN_TOUR_EVENT))` to replay. */
export const REOPEN_TOUR_EVENT = 'nqueens:reopen-tour';

export function reopenOnboardingTour(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REOPEN_TOUR_EVENT));
  }
}

export interface TourStepDef {
  /** Stable id, also used for the "policy block" (auto-expand) check. */
  id: string;
  /** Selector chain — first match wins (lets steps survive layout variants). */
  selectors: string[];
  title: string;
  body: string;
}

/** Policy steps need the Advanced collapsible open (auto-managed by the tour). */
const POLICY_STEP_IDS = new Set(['plateau', 'restarts', 'cooling']);

export const ONBOARDING_TOUR_STEPS: TourStepDef[] = [
  {
    id: 'board-size',
    selectors: ['[data-tour="board-size"]'],
    title: 'Board size (N × N)',
    body: 'One queen per column; a move slides a queen within its own column, so each step picks from N·(N−1) neighbors. N = 4–16: small boards solve fast, large ones show real plateaus.',
  },
  {
    id: 'strategy',
    selectors: ['[data-tour="strategy"]'],
    title: 'Hill-climbing variant',
    body: 'Five strategies pick the next move differently — greedy, first-found, random-among-best, conflict-targeted, or annealing. Same seed, different journey.',
  },
  {
    id: 'seed',
    selectors: ['[data-tour="seed"]'],
    title: 'Seed = reproducibility',
    body: 'The seeded RNG is the only randomness in the app. Same seed + same config ⇒ a bit-identical run — share the URL and anyone replays your exact run.',
  },
  {
    id: 'plateau',
    selectors: ['[data-tour="plateau"]'],
    title: 'Allow Plateau Moves (Δ = 0)',
    body: 'Not spatial! This allows equal-cost moves that keep the conflict count flat, so the search can walk across shoulders instead of stopping. Queens still move only vertically. The Max Plateau Streak slider below caps consecutive plateau moves (default 100, per AIMA).',
  },
  {
    id: 'restarts',
    selectors: ['[data-tour="restarts"]'],
    title: 'Random restarts',
    body: 'When the search gets stuck at a local maximum, it abandons the board and starts fresh from a new random placement — up to the Max Restarts limit.',
  },
  {
    id: 'cooling',
    selectors: ['[data-tour="cooling"]'],
    title: 'Cooling rate (α)',
    body: 'Simulated-annealing only: how fast the temperature decays per proposal. Closer to 1 cools slower and explores longer.',
  },
  {
    id: 'chessboard',
    selectors: ['[data-testid="chessboard-grid"]'],
    title: 'The board',
    body: 'Queens move only within their column — never across columns, never diagonally (the textbook rows[col] = row formulation). Rings mark conflicted queens, badges show the last move’s Δ, and the ghost marks where the queen just left.',
  },
  {
    id: 'playback',
    selectors: ['[data-tour="playback"]'],
    title: 'Playback & time travel',
    body: 'Play/pause, step frame-by-frame with ←/→, or scrub the timeline to any step. Jump straight to the best board, and tune speed from 0.5× to 30×. Click anywhere dimmed to continue.',
  },
  {
    id: 'analytics',
    selectors: ['[data-testid="analytics-panel"]'],
    title: 'Analytics',
    body: 'Convergence curve, optimization landscape, and run diagnostics. Zoom is shared across tabs and auto-follows the cursor — click any chart to scrub there.',
  },
  {
    id: 'stats',
    selectors: [
      '[data-testid="stats-rail"][data-variant="context"]',
      '[data-testid="stats-header"]',
    ],
    title: 'Live metrics',
    body: 'Run status, timeline cursor, attacking pairs h(s), step phase, and restarts-or-temperature — updating with every step you play or scrub.',
  },
  {
    id: 'share',
    selectors: ['[data-tour="share"]'],
    title: 'Share & export',
    body: 'Copy this button’s link to share the exact run (config lives in the URL). Export CSV in the Analytics header downloads the full snapshot history. That’s the tour — happy hill-climbing!',
  },
];

interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TOOLTIP_WIDTH = 320;
const TOOLTIP_GAP = 12;
const VIEWPORT_MARGIN = 12;

/**
 * Pure tooltip placement: prefer below the spotlight, flip above when there
 * is no room, and clamp horizontally into the viewport. Kept pure (no DOM)
 * so it is unit-testable in isolation.
 */
export function placeTourTooltip(
  rect: SpotRect,
  viewportWidth: number,
  viewportHeight: number,
): { top: number; left: number } {
  const estimatedHeight = 240;
  const belowTop = rect.top + rect.height + TOOLTIP_GAP;
  const aboveTop = rect.top - estimatedHeight - TOOLTIP_GAP;
  const top =
    belowTop + estimatedHeight <= viewportHeight - VIEWPORT_MARGIN
      ? belowTop
      : Math.max(VIEWPORT_MARGIN, aboveTop);
  const idealLeft = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  const left = Math.min(
    Math.max(VIEWPORT_MARGIN, idealLeft),
    Math.max(VIEWPORT_MARGIN, viewportWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN),
  );
  return { top, left };
}

function readStoredTourState(): string | null {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return null;
    return window.localStorage.getItem(TOUR_STORAGE_KEY);
  } catch {
    // Private mode / blocked storage: behave as "already seen" so we never
    // nag a user we cannot remember.
    return '1';
  }
}

function writeStoredTourState(value: '1' | 'forever'): void {
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, value);
  } catch {
    // Storage unavailable — the tour just won't be remembered. Non-fatal.
  }
}

function resolveStepElement(step: TourStepDef): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  for (const selector of step.selectors) {
    const el = document.querySelector(selector);
    if (el instanceof HTMLElement) return el;
  }
  return null;
}

function measureElement(el: HTMLElement): SpotRect {
  const r = el.getBoundingClientRect();
  const pad = 12;
  return {
    top: Math.max(0, r.top - pad),
    left: Math.max(0, r.left - pad),
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  };
}

export function OnboardingTour() {
  const reduceMotion = !!useReducedMotion();
  const [open, setOpen] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [rect, setRect] = React.useState<SpotRect | null>(null);
  // Steps whose targets actually exist in this layout (missing ones are
  // skipped — e.g. cooling when SA isn't selected, context rail on odd widths).
  const [activeSteps, setActiveSteps] = React.useState<TourStepDef[]>(ONBOARDING_TOUR_STEPS);
  // Hard scroll lock while the tour is open: the page must not move under
  // the spotlight (user scrolls fought the rect tracking and could strand
  // it off-screen). The tour's own `scrollIntoView` calls below stay the
  // single source of scroll truth; Esc/close restores the exact scrollY.
  // (Placed after state so `open` is initialized — no TDZ.)
  useScrollLock(open);
  const nextButtonRef = React.useRef<HTMLButtonElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  // Drag controls for the tooltip. `dragListener={false}` below means Motion
  // only starts a drag when `controls.start(e)` is called — the root
  // pointerdown handler calls it for presses that did NOT land on a button,
  // so Next/Back/Skip/Don't-show-again always click cleanly and every other
  // press grabs the tooltip. Keyboard users are unaffected (all actions
  // stay on buttons; auto-placement is the fallback position).
  const dragControls = useDragControls();
  // Restore bookkeeping: the tour must leave no trace in the user's UI.
  const prevStrategyRef = React.useRef<StrategyId | null>(null);
  const openedAdvancedRef = React.useRef(false);

  const step = activeSteps[Math.min(stepIndex, activeSteps.length - 1)] ?? null;

  const close = React.useCallback((mark: '1' | 'forever') => {
    // Restore the strategy we may have forced, and re-collapse Advanced if
    // we auto-opened it — the tour leaves the UI exactly as it found it.
    if (prevStrategyRef.current !== null) {
      const prev = prevStrategyRef.current;
      prevStrategyRef.current = null;
      if (simulationStore.getState().config.strategy !== prev) {
        simulationStore.getState().setConfig({ strategy: prev });
      }
    }
    if (openedAdvancedRef.current) {
      openedAdvancedRef.current = false;
      const trigger = document.querySelector('[data-tour="advanced-trigger"]');
      if (trigger instanceof HTMLElement && trigger.dataset.state === 'open') {
        trigger.click();
      }
    }
    writeStoredTourState(mark);
    setOpen(false);
    setRect(null);
  }, []);

  const goToStep = React.useCallback(
    (index: number) => {
      if (index >= activeSteps.length) {
        close('1');
        return;
      }
      setStepIndex(index);
    },
    [activeSteps.length, close],
  );

  const start = React.useCallback(() => {
    // Snapshot + force the canonical strategy so every step target exists.
    // (Cooling only renders under simulated-annealing, so it is skipped on
    // the forced path — the step definition stays for direct SA tours.)
    const current = simulationStore.getState().config.strategy;
    prevStrategyRef.current = current;
    if (current !== 'steepest-ascent') {
      simulationStore.getState().setConfig({ strategy: 'steepest-ascent' });
    }
    // Resolve targets now (post-force, the DOM has settled by next frame —
    // the measure effect below re-resolves per step anyway).
    setActiveSteps(
      ONBOARDING_TOUR_STEPS.filter((s) => s.id !== 'cooling' || current === 'simulated-annealing'),
    );
    setStepIndex(0);
    setOpen(true);
  }, []);

  // Mount: auto-open for first-time visitors; listen for manual replays.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('tour');
    const shouldOpen = forced === '1' || (forced !== '0' && readStoredTourState() === null);
    if (shouldOpen) {
      // Mount-time hydration of the localStorage/URL gate into state —
      // runs once, not a render cascade (same exception family as the
      // next-themes `mounted` pattern in `site-nav.tsx`, see D-041).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      start();
    }
  }, [start]);

  // Manual replay hook (footer "Replay tour" button dispatches this event).
  React.useEffect(() => {
    const onReopen = () => start();
    window.addEventListener(REOPEN_TOUR_EVENT, onReopen);
    return () => window.removeEventListener(REOPEN_TOUR_EVENT, onReopen);
  }, [start]);

  // Per-step: auto-manage the Advanced collapsible, scroll the target into
  // view, and measure the spotlight. Missing targets are skipped forward.
  React.useEffect(() => {
    if (!open || !step) return;
    const el = resolveStepElement(step);
    if (!el) {
      // Missing target (e.g. a step whose anchor unmounted on resize):
      // skip forward on the next frame. Deferred — not a synchronous
      // render-derived update — so the set-state-in-effect rule stays quiet.
      const skip = requestAnimationFrame(() => goToStep(stepIndex + 1));
      return () => cancelAnimationFrame(skip);
    }
    const needsAdvanced = POLICY_STEP_IDS.has(step.id);
    const trigger = document.querySelector('[data-tour="advanced-trigger"]');
    if (needsAdvanced && trigger instanceof HTMLElement && trigger.dataset.state !== 'open') {
      openedAdvancedRef.current = true;
      trigger.click();
    } else if (!needsAdvanced && openedAdvancedRef.current) {
      openedAdvancedRef.current = false;
      if (trigger instanceof HTMLElement && trigger.dataset.state === 'open') {
        trigger.click();
      }
    }
    // `scrollIntoView` doesn't exist in jsdom — optional-call it.
    // `block: 'center'` (not 'nearest'): with user scrolling locked out,
    // the tour owns positioning, so every target lands deterministically
    // mid-viewport where the tooltip gap math expects it.
    el.scrollIntoView?.({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    const measure = () => {
      const target = resolveStepElement(step);
      if (target) setRect(measureElement(target));
    };
    // Measure now + next frame (lets the collapsible toggle settle), then
    // track resize/scroll/size changes while this step is active. The
    // scroll listener stays deliberately: with user scrolling locked out,
    // the only scrolls are the tour's own smooth `scrollIntoView`s, and
    // the spotlight must follow each frame until they settle.
    measure();
    const raf = requestAnimationFrame(measure);
    const onViewportChange = () => measure();
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, { capture: true, passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, { capture: true });
      ro?.disconnect();
    };
  }, [open, step, stepIndex, goToStep, reduceMotion]);

  // Move focus to Next on step change (screen-reader users follow the tour).
  React.useEffect(() => {
    if (open) nextButtonRef.current?.focus();
  }, [open, stepIndex]);

  const onTooltipKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close('1');
    } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      goToStep(stepIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToStep(Math.max(0, stepIndex - 1));
    } else if (e.key === 'Tab') {
      // Light focus trap: cycle Tab within the tooltip buttons.
      const root = tooltipRef.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled])'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (first && last && document.activeElement && !root.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first && last) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last && first) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  // SSR guard: portals need `document`. The mount flag keeps the server
  // render (null) and the first client render (null) identical, avoiding a
  // hydration mismatch — the canonical pattern (cf. `mounted` in
  // `site-nav.tsx`, D-041), hence the targeted rule exception.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical SSR mount guard, runs once.
    setMounted(true);
  }, []);
  if (!mounted || !open || !step || !rect) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tip = placeTourTooltip(rect, vw, vh);
  const isLast = stepIndex >= activeSteps.length - 1;

  const backdropClass = 'fixed z-50 bg-black/60 backdrop-blur-[1px] motion-reduce:bg-black/60';

  const overlay = (
    <>
      {/* Four dimmed panels around the spotlight — stable across steps
          (they reposition in place, no remount), so backdrop testids stay
          unique. Clicking any advances. */}
      <div
        data-testid="onboarding-tour-backdrop-top"
        aria-hidden="true"
        onClick={() => goToStep(stepIndex + 1)}
        className={backdropClass}
        style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }}
      />
      <div
        data-testid="onboarding-tour-backdrop-bottom"
        aria-hidden="true"
        onClick={() => goToStep(stepIndex + 1)}
        className={backdropClass}
        style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }}
      />
      <div
        data-testid="onboarding-tour-backdrop-left"
        aria-hidden="true"
        onClick={() => goToStep(stepIndex + 1)}
        className={backdropClass}
        style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }}
      />
      <div
        data-testid="onboarding-tour-backdrop-right"
        aria-hidden="true"
        onClick={() => goToStep(stepIndex + 1)}
        className={backdropClass}
        style={{ top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }}
      />
      {/* Rect spotlight ring (instant cut — no layout animation). */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-50 rounded-xs shadow-2xl ring-white/90 ring-offset-2 ring-offset-transparent"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      />
      {/* Tooltip — the ONLY AnimatePresence child, keyed per step with
          mode="wait" so exactly one tooltip exists at a time. Opacity-only
          fade per motion-foundations. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          ref={tooltipRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-tour-title"
          aria-describedby="onboarding-tour-body"
          data-testid="onboarding-tour"
          onKeyDown={onTooltipKeyDown}
          // Free drag with a MINIMIZED release glide (`TOUR_TOOLTIP_DRAG_GLIDE`):
          // the tooltip tracks 1:1 while held, then settles almost dead
          // instead of drifting (a dialog must stay where the user put it —
          // usually off the spotlight). Transforms compose with the fixed
          // top/left anchor, so dragging stays GPU-cheap.
          // `touch-none`: the tooltip has no scrollable content, so the
          // browser must not steal the gesture on touch screens.
          drag
          dragControls={dragControls}
          dragListener={false}
          dragTransition={TOUR_TOOLTIP_DRAG_GLIDE}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            dragControls.start(e);
          }}
          whileDrag={reduceMotion ? { cursor: 'grabbing' } : { cursor: 'grabbing', scale: 1.02 }}
          className="fixed z-50 flex cursor-grab touch-none flex-col gap-2.5 rounded-xs border border-border bg-card p-4 shadow-xl"
          style={{ top: tip.top, left: tip.left, width: Math.min(TOOLTIP_WIDTH, vw - 24) }}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: motionTokens.duration.fast,
            ease: motionTokens.easing.smooth,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Grip handle — the universal "you can drag this" signifier.
                Decorative (the whole tooltip body already drags; buttons are
                excluded), so aria-hidden: screen-reader and keyboard users
                get the same outcome via buttons + auto-placement. */}
            <div className="flex items-center gap-1.5">
              <GripVertical
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
                aria-hidden="true"
                data-testid="tour-drag-handle"
              />
              <p className="font-mono text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                Step {stepIndex + 1} of {activeSteps.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => close('1')}
              aria-label="Skip tour"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h2 id="onboarding-tour-title" className="text-sm font-semibold tracking-tight">
            {step.title}
          </h2>
          <p id="onboarding-tour-body" className="text-xs leading-relaxed text-muted-foreground">
            {step.body}
          </p>
          {/* First-step-only drag hint (progressive disclosure: teach the
              gesture once, then stay out of the way). */}
          {stepIndex === 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
              <Move className="h-3 w-3 shrink-0" aria-hidden="true" />
              <i>Drag me aside if I’m in the way.</i>
            </p>
          )}
          {/* Progress dots — shape + position, not color alone. */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {activeSteps.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === stepIndex ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30',
                )}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => close('forever')}
              className="rounded-md px-2 py-1.5 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Don’t show again
            </button>
            <div className="flex items-center gap-1.5">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => goToStep(stepIndex - 1)}
                  className="h-8 rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Back
                </button>
              )}
              <button
                ref={nextButtonRef}
                type="button"
                onClick={() => goToStep(stepIndex + 1)}
                className="h-8 min-w-20 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs transition-transform hover:scale-[1.03] active:scale-95"
              >
                {isLast ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );

  return createPortal(overlay, document.body);
}
