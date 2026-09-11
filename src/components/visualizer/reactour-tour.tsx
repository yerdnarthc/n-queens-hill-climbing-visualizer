'use client';

/**
 * ReactourTour — first-visit spotlight walkthrough, Reactour v3 shell (D-064).
 *
 * Same UX contract as the retired custom tour (`onboarding-tour.tsx`,
 * deleted): welcome modal first, then guided beats; rounded spotlight with
 * the page dimmed (dimmed = dead, spotlight = live via `stepInteraction`);
 * backdrop click advances; full UI snapshot in, full restore out; Advanced
 * auto-open for the config group; calm-queens staging for the chessboard
 * intro; localStorage gate + `?tour=1` + footer Replay.
 *
 * What Reactour owns: mask/spotlight rendering, popover positioning,
 * focus lock, skip-if-missing (`disableWhenSelectorFalsy`). What stays
 * ours: the words (`tour-steps.ts`), the beat list (`tour-adapter.ts`
 * flattening with "Step X of 7" metadata), the tooltip card + drag
 * (this file), snapshot/restore + staging (the bridge below), scroll lock.
 *
 * Motion notes: `motion/react` only, tokens from `@/lib/motion-tokens`.
 * The tooltip enters with an opacity fade; there is no exit fade (Reactour
 * swaps step content synchronously, so an AnimatePresence exit could never
 * play — enter-only is the honest pattern here). Reduced motion collapses
 * even the enter fade.
 */
import * as React from 'react';
import { TourProvider, useTour, type PopoverContentProps, type StepType } from '@reactour/tour';
import { motion, useDragControls, useReducedMotion } from 'motion/react';
import { GripVertical, Move, X } from 'lucide-react';
import { simulationStore, tourUiStore } from '@/store';
import type { SimulationConfig } from '@/store/simulation-store';
import { useScrollLock } from '@/hooks/useScrollLock';
import { motionTokens, TOUR_TOOLTIP_DRAG_GLIDE } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';
import {
  ONBOARDING_TOUR_STEPS,
  REOPEN_TOUR_EVENT,
  TOUR_STORAGE_KEY,
  TOUR_WELCOME,
} from './tour-steps';
import { flattenTourSteps, type FlatTourBeat } from './tour-adapter';

/** Dispatch `window.dispatchEvent(new CustomEvent(REOPEN_TOUR_EVENT))` to replay. */
export function reopenOnboardingTour(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REOPEN_TOUR_EVENT));
  }
}

/**
 * Close marks: '1' seen, 'forever' opted out (same storage contract).
 * Rides on Reactour's `meta` string state (`setMeta`) — the only
 * provider-owned channel reachable from BOTH the bridge and the tooltip
 * buttons (a custom context can't work: the buttons render under
 * Tour/Popover, a sibling subtree of the bridge, so context never flows).
 */

function readStoredTourState(): string | null {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return null;
    return window.localStorage.getItem(TOUR_STORAGE_KEY);
  } catch {
    // Private mode / blocked storage: behave as "already seen".
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

/** Full UI snapshot so the tour leaves zero trace (contract rule 3). */
interface TourSnapshot {
  config: SimulationConfig;
  speed: number;
  isPlaying: boolean;
  currentStep: number;
  scrollY: number;
}

/**
 * Pure in-view check with a comfort margin: is the target's rect already
 * comfortably inside the viewport (so no travel scroll is needed)?
 * Kept pure (no DOM) for unit tests; the bridge feeds it live rects.
 */
export function isRectInView(
  rect: { top: number; bottom: number },
  viewportHeight: number,
  margin = 80,
): boolean {
  return rect.top >= margin && rect.bottom <= viewportHeight - margin;
}

/** Read the pending mark back out of `meta` (anything but 'forever' means seen). */
function markFromMeta(meta: string | undefined): '1' | 'forever' {
  return meta === 'forever' ? 'forever' : '1';
}

const TOOLTIP_WIDTH = 320;

/**
 * One beat's body: title + copy. Buttons live here too (they navigate via
 * `useTour`, so the step definitions stay static data).
 */
function TourBeatBody({ beat }: { beat: FlatTourBeat | null }) {
  const { currentStep, setCurrentStep, setIsOpen, setMeta, steps } = useTour();
  const close = (mark: '1' | 'forever') => {
    // The funnel effect persists the mark — one writer, every exit path.
    // `setMeta` is always provided by TourProvider (buttons only render inside it).
    setMeta?.(mark);
    setIsOpen(false);
  };
  if (!beat) return null;
  const isWelcome = beat.groupId === 'welcome';
  const isLast = currentStep >= steps.length - 1;
  const advance = () => {
    if (isLast) close('1');
    else setCurrentStep(currentStep + 1);
  };
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <GripVertical
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
            aria-hidden="true"
            data-testid="tour-drag-handle"
          />
          <p className="font-mono text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
            {isWelcome
              ? 'Welcome'
              : `Step ${beat.topIndex + 1} of ${beat.topTotal}` +
                (beat.subTotal > 1 ? ` · ${beat.subIndex + 1}/${beat.subTotal}` : '')}
          </p>
        </div>
        {!isWelcome && (
          <button
            type="button"
            onClick={() => close('1')}
            aria-label="Skip tour"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <h2 className="text-sm font-semibold tracking-tight">{beat.title}</h2>
      <p className="text-xs leading-relaxed text-muted-foreground">{beat.body}</p>
      {/* First-guide-beat-only drag hint (progressive disclosure). */}
      {beat.key === 'chessboard:intro' && (
        <p className="mt-2 flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
          <Move className="h-3 w-3 shrink-0" aria-hidden="true" />
          <i>Drag me aside if I’m in the way.</i>
        </p>
      )}
      {/* Progress dots — one per top-level group (shape + position). */}
      {!isWelcome && (
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {Array.from({ length: beat.topTotal }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === beat.topIndex ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        {isWelcome ? (
          <>
            <button
              type="button"
              onClick={() => close('1')}
              className="rounded-md px-2 py-1.5 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Skip tour
            </button>
            <button
              type="button"
              onClick={advance}
              className="h-8 min-w-20 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs transition-transform hover:scale-[1.03] active:scale-95"
            >
              Let&apos;s explore!
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => close('forever')}
              className="rounded-md px-2 py-1.5 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Don’t show again
            </button>
            <div className="flex items-center gap-1.5">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="h-8 rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={advance}
                className="h-8 min-w-20 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs transition-transform hover:scale-[1.03] active:scale-95"
              >
                {isLast ? 'Done' : 'Next'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The popover card: our draggable tooltip (stable testid for e2e) rendered
 * inside Reactour's positioned, transparent shell. Module-level so its
 * identity never changes (Reactour would remount on a new reference).
 */
function TourPopoverCard(props: PopoverContentProps) {
  const reduceMotion = !!useReducedMotion();
  const dragControls = useDragControls();
  const step = props.steps[props.currentStep];
  const content = step?.content;
  const isWelcome = props.currentStep === 0;
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      data-testid="onboarding-tour"
      data-tour-phase={isWelcome ? 'welcome' : 'guide'}
      // Free drag with a MINIMIZED release glide (`TOUR_TOOLTIP_DRAG_GLIDE`),
      // started from non-button presses only — same contract as the old tour.
      // `touch-none`: no scrollable content, so touch drags belong to us.
      drag
      dragControls={dragControls}
      dragListener={false}
      dragTransition={TOUR_TOOLTIP_DRAG_GLIDE}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        dragControls.start(e);
      }}
      whileDrag={reduceMotion ? { cursor: 'grabbing' } : { cursor: 'grabbing', scale: 1.02 }}
      className="flex cursor-grab touch-none flex-col rounded-xs border border-border bg-card p-4 shadow-xl"
      // The welcome beat is a true modal: center OUR card on the viewport
      // instead of trusting the shell's target-relative placement (their
      // center math lands right-of-center on huge targets, §1b.5). Guide
      // beats stay shell-positioned (anchored to their spotlight).
      style={
        isWelcome
          ? {
              // SSR: `window` is undefined on the server — the tour only
              // opens client-side, so the fallback never paints.
              width: typeof window !== 'undefined' ? Math.min(360, window.innerWidth - 24) : 360,
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              margin: 0,
            }
          : { width: TOOLTIP_WIDTH }
      }
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: motionTokens.duration.fast,
        ease: motionTokens.easing.smooth,
      }}
    >
      {typeof content === 'function' ? (content(props) as React.ReactNode) : content}
    </motion.div>
  );
}

/** Welcome pseudo-beat (flat index 0 — the only centered, spotlight-free beat). */
const WELCOME_BEAT: FlatTourBeat = {
  key: 'welcome',
  groupId: 'welcome',
  topIndex: -1,
  topTotal: 0,
  subIndex: 0,
  subTotal: 1,
  selector: '[data-testid="stats-header"]',
  title: TOUR_WELCOME.title,
  body: TOUR_WELCOME.body,
};

/**
 * Welcome target chain: the header is always mounted and in view at load
 * (so Reactour's auto-scroll stays quiet); `body` is the bulletproof
 * fallback — the entry beat must never be dropped as "missing".
 */
function resolveWelcomeSelector(): string {
  const chain = ['[data-testid="stats-header"]', 'body'];
  if (typeof document === 'undefined') return chain[0] ?? 'body';
  for (const selector of chain) {
    if (document.querySelector(selector) !== null) return selector;
  }
  return 'body';
}

/** Config-group beats may target knobs that only exist once Advanced opens. */
function observablesFor(
  groupId: string,
): Pick<StepType, 'mutationObservables' | 'resizeObservables'> {
  if (groupId !== 'config') return {};
  // Proven in the spike (§1b.1): without these, a target that appears after
  // the step mounts (our own action opening Advanced) stays suppressed under
  // `disableWhenSelectorFalsy` forever. The config panel subtree is the
  // narrowest host that always exists.
  return {
    mutationObservables: ['[data-tour="config"]'],
    resizeObservables: ['[data-tour="config"]'],
  };
}

function toStepType(beat: FlatTourBeat, index: number): StepType {
  if (index === 0) {
    return {
      // A real, always-mounted, in-view-at-load target: with `bypassElem`
      // nothing highlights, and being in view means Reactour's auto-scroll
      // stays quiet (a `body` target is never "in view", so it scrolled the
      // page to the document middle, §1b.5). The card centers itself.
      selector: '[data-testid="stats-header"]',
      bypassElem: true,
      position: 'center',
      content: <TourBeatBody beat={beat} />,
    };
  }
  return {
    selector: beat.selector,
    // Spotlight = live (dimmed = dead is the provider-level
    // `disableInteraction`): hover/pin invites on chessboard beats and the
    // toggle/Play demos on config beats stay operable, as in the old tour.
    stepInteraction: true,
    content: <TourBeatBody beat={beat} />,
    ...observablesFor(beat.groupId),
  };
}

/**
 * Inside the provider: gating, snapshot/restore, per-beat staging
 * (calm queens + Advanced auto-open), scroll lock, and the close funnel.
 * Staging is centralized here (not per-step `action` props) so entering,
 * leaving, and closing all run through one code path in beat-index order.
 */
function TourBridge() {
  const { isOpen, setIsOpen, setCurrentStep, setSteps, setMeta, meta, currentStep } = useTour();
  const reduceMotion = !!useReducedMotion();
  // Scroll settles per beat (see the staging effect): unlocked while the
  // beat travels into view, locked once it lands so the page stays put
  // under the spotlight while the user reads.
  const [scrollSettled, setScrollSettled] = React.useState(true);
  useScrollLock(isOpen && scrollSettled);
  const snapshotRef = React.useRef<TourSnapshot | null>(null);
  const openedAdvancedRef = React.useRef(false);
  const beatsRef = React.useRef<FlatTourBeat[]>([]);
  const wasOpenRef = React.useRef(false);

  const setAdvanced = React.useCallback((wantOpen: boolean) => {
    const trigger = document.querySelector('[data-tour="advanced-trigger"]');
    if (!(trigger instanceof HTMLElement)) return;
    const isOpenNow = trigger.dataset.state === 'open';
    if (wantOpen && !isOpenNow) {
      openedAdvancedRef.current = true;
      trigger.click();
    } else if (!wantOpen && isOpenNow && openedAdvancedRef.current) {
      openedAdvancedRef.current = false;
      trigger.click();
    }
  }, []);

  const restore = React.useCallback(() => {
    tourUiStore.getState().setCalmQueens(false);
    setAdvanced(false);
    const snap = snapshotRef.current;
    snapshotRef.current = null;
    if (snap) {
      // setConfig pauses by design (D-057) — resume explicitly when the
      // user was playing on entry.
      const st = simulationStore.getState();
      st.setConfig({ ...snap.config });
      st.setSpeed(snap.speed);
      st.jumpTo(snap.currentStep);
      if (snap.isPlaying) st.play();
      // Land where the user was: per-beat relocks move the page, so the
      // lock's own restore (last beat's Y) is overridden with entry Y.
      window.scrollTo(0, snap.scrollY);
    }
  }, [setAdvanced]);

  const start = React.useCallback(() => {
    const st = simulationStore.getState();
    snapshotRef.current = {
      config: { ...st.config },
      speed: st.speed,
      isPlaying: st.isPlaying,
      currentStep: st.currentStep,
      scrollY: window.scrollY,
    };
    // Canonical strategy so every step target exists (cooling only renders
    // under simulated-annealing, so its beat is dropped below).
    const entryStrategy = st.config.strategy;
    if (entryStrategy !== 'steepest-ascent') {
      simulationStore.getState().setConfig({ strategy: 'steepest-ascent' });
    }
    // Pre-open Advanced BEFORE resolving: its children (plateau, restarts,
    // cooling) are unmounted while closed, so resolving first would drop
    // them as "missing". The click's React update lands async — yield a
    // frame so the content mounts before flattening. Staging owns the
    // collapsible from here (welcome closes it since we opened it).
    setAdvanced(true);
    void (async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const guide = flattenTourSteps(ONBOARDING_TOUR_STEPS, {
        dropSubstepIds: entryStrategy === 'simulated-annealing' ? undefined : new Set(['cooling']),
      });
      const beats = [{ ...WELCOME_BEAT, selector: resolveWelcomeSelector() }, ...guide];
      beatsRef.current = beats;
      // Always provided by TourProvider (this bridge only renders inside it).
      setSteps?.(beats.map(toStepType));
      setMeta?.('1');
      setCurrentStep(0);
      setIsOpen(true);
    })();
  }, [setAdvanced, setCurrentStep, setIsOpen, setMeta, setSteps]);

  // Mount: auto-open for first-time visitors; listen for manual replays.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('tour');
    const shouldOpen = forced === '1' || (forced !== '0' && readStoredTourState() === null);
    // Mount-time hydration of the localStorage/URL gate — `start()` (not a
    // bare setState) performs the transition, so the set-state-in-effect
    // rule stays quiet.
    if (shouldOpen) start();
  }, [start]);

  React.useEffect(() => {
    const onReopen = () => start();
    window.addEventListener(REOPEN_TOUR_EVENT, onReopen);
    return () => window.removeEventListener(REOPEN_TOUR_EVENT, onReopen);
  }, [start]);

  // Per-beat staging: calm queens only on the chessboard intro; Advanced
  // open for the whole config group, restored afterwards. Unlock scheduling
  // for the travel effect below (deferred: the set-state-in-effect rule
  // forbids the synchronous form, and a frame's delay is invisible here).
  React.useEffect(() => {
    if (!isOpen) return;
    const beat = beatsRef.current[currentStep] ?? null;
    tourUiStore.getState().setCalmQueens(beat?.groupId === 'chessboard' && beat.subIndex === 0);
    setAdvanced(beat?.groupId === 'config');
    const unlock = requestAnimationFrame(() => setScrollSettled(false));
    return () => cancelAnimationFrame(unlock);
  }, [isOpen, currentStep, setAdvanced]);

  // Travel scroll for below-fold targets: the hard lock blocks ALL
  // scrolling, so each beat unlocks, scrolls, then relocks once settled —
  // otherwise below-fold spotlights strand off-screen (§1b.6). Runs only on
  // the unlocked pass (the step-change pass is still locked and returns
  // early); the settle timer rebuilds step objects so Reactour re-measures
  // on the SETTLED layout — skipped when nothing traveled, since rebuilding
  // would remount the tooltip mid-drag for no reason.
  React.useEffect(() => {
    if (!isOpen || scrollSettled) return;
    let traveled = false;
    const beat = beatsRef.current[currentStep] ?? null;
    if (beat && beat.groupId !== 'welcome') {
      const target = document.querySelector(beat.selector);
      if (target instanceof HTMLElement) {
        const rect = target.getBoundingClientRect();
        if (!isRectInView(rect, window.innerHeight)) {
          traveled = true;
          target.scrollIntoView?.({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      }
    }
    const settleMs = reduceMotion ? 80 : 750;
    const timer = window.setTimeout(() => {
      if (traveled) {
        const beats = beatsRef.current;
        if (beats.length > 0) setSteps?.(beats.map(toStepType));
      }
      setScrollSettled(true);
    }, settleMs);
    return () => window.clearTimeout(timer);
  }, [isOpen, currentStep, scrollSettled, reduceMotion, setSteps]);

  // The close funnel: every exit path (buttons, Esc, mask-past-end,
  // keyboard) lands on isOpen → false, which persists the pending mark and
  // restores the snapshot exactly once. (`beforeClose` can't do this — it
  // fires on mount/unmount, §1b.2.)
  React.useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      writeStoredTourState(markFromMeta(meta));
      restore();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, meta, restore]);

  // Unmount (e.g. navigating away mid-tour) must never strand flags.
  React.useEffect(() => {
    return () => {
      tourUiStore.getState().setCalmQueens(false);
    };
  }, []);

  // Nothing to render — the provider draws.
  return null;
}

export function ReactourTour() {
  return (
    <TourProvider
      steps={[]}
      padding={{ mask: 12 }}
      // Dimmed = dead; per-step `stepInteraction` keeps the spotlight live.
      disableInteraction
      // Runtime-forwarded via the provider's context spread (verified in
      // dist) — absent from ProviderProps types, hence the expectation.
      // @ts-expect-error -- upstream type gap, see D-063.
      disableWhenSelectorFalsy
      // The bridge owns scrolling (unlock → scrollIntoView → relock): the
      // library's own attempt would run while locked and go nowhere, and a
      // second concurrent smoother would fight ours.
      scrollSmooth={false}
      onClickMask={({ setCurrentStep, currentStep, steps: all, setIsOpen }) => {
        if (currentStep >= (all ?? []).length - 1) setIsOpen(false);
        else setCurrentStep(currentStep + 1);
      }}
      keyboardHandler={(e, clickProps) => {
        // Own the tour's keys end-to-end (mirrors the old tooltip handler):
        // Esc closes, arrows walk, past-the-end closes. The app's
        // window-level shortcuts yield separately via the tour-presence
        // guard in `useKeyboardShortcuts` (same-node listeners can't be
        // stopped from here).
        e.preventDefault();
        e.stopPropagation();
        if (!clickProps) return;
        const { setCurrentStep, currentStep, steps: all, setIsOpen } = clickProps;
        const total = all?.length ?? 0;
        if (e.key === 'Escape') setIsOpen(false);
        else if (e.key === 'ArrowRight' || e.key === 'Enter') {
          if (currentStep >= total - 1) setIsOpen(false);
          else setCurrentStep(currentStep + 1);
        } else if (e.key === 'ArrowLeft') {
          setCurrentStep(Math.max(currentStep - 1, 0));
        }
      }}
      // All chrome lives in our ContentComponent (counter, dots, buttons).
      showBadge={false}
      showNavigation={false}
      showCloseButton={false}
      showPrevNextButtons={false}
      showDots={false}
      ContentComponent={TourPopoverCard}
      styles={{
        maskRect: () => ({ rx: 4 }),
        // Our card IS the tooltip — the default popover shell (white frame
        // in the spike) must get out of the way (README's own recipe).
        popover: (base) => ({ ...base, background: 'transparent', padding: 0, boxShadow: 'none' }),
      }}
    >
      <TourBridge />
    </TourProvider>
  );
}
