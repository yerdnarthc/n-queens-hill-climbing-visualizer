'use client';

/**
 * OnboardingTour — first-visit spotlight walkthrough of the visualizer page.
 *
 * Shows once per browser (persisted in `localStorage` under a versioned key,
 * so closing the tab does NOT re-trigger it), then never again unless the
 * user replays it ("Replay tour" button) or visits with `?tour=1`.
 *
 * UX contract (overhaul brief: welcome + 7 guided steps with substeps):
 * - Welcome modal first (no spotlight); then chessboard → timeline →
 *   config → analytics → stats → CSV export → share finale.
 * - Rounded-rect spotlight cut around each target; the rest of the page is
 *   dimmed with four backdrop panels. Clicking empty (dimmed) space advances.
 * - Substeps are linear beats inside one step (Next walks them); a substep
 *   may override the spotlight selectors for narrow targets (contract: one
 *   lesson per spotlight). Missing targets skip forward.
 * - The tour forces `strategy: 'steepest-ascent'` on entry (so every step's
 *   target exists deterministically) and snapshots the FULL UI state
 *   (config + speed + playback position/state), restoring all of it on
 *   finish, skip, or Escape — never just the strategy.
 * - The "Advanced Policy Knobs" collapsible is auto-opened for the whole
 *   config step and restored afterwards - the tour never leaves the user's
 *   UI in a different state than it found it.
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
import { simulationStore, tourUiStore } from '@/store';
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

export interface TourSubstepDef {
  /** Stable id within its step. */
  id: string;
  /** Spotlight override — first match wins. Defaults to the step's selectors. */
  selectors?: string[];
  /** Shown when set; otherwise the step title stays. */
  title?: string;
  body: string;
}

export interface TourStepDef {
  /** Stable id, also used for the "policy block" (auto-expand) check. */
  id: string;
  /** Selector chain - first match wins (lets steps survive layout variants). */
  selectors: string[];
  title: string;
  body: string;
  /** Ordered lesson beats inside one spotlight journey (brief: substeps). */
  substeps?: TourSubstepDef[];
}

/** Welcome copy (approved wording — warm + playful, no placeholder text). */
export const TOUR_WELCOME = {
  title: 'Hello! Welcome to the N-Queens Hill-Climbing Visualizer.',
  body: 'Ever wondered what it looks like when an algorithm hunts for a solution? You are in the right place — here you can watch hill climbing tackle the famous N-Queens puzzle, one queen move at a time. Before we press Play, let\u2019s take a quick tour of the controls and ideas you\u2019ll need. I\u2019ll guide you — ready when you are!',
} as const;

/**
 * Full overhaul flow (brief: welcome + 7 guided steps, substeps per step).
 * Bodies stay tooltip-short (2–3 sentences); each substep names one action
 * and one observable per the appendix convention.
 */
export const ONBOARDING_TOUR_STEPS: TourStepDef[] = [
  {
    id: 'chessboard',
    selectors: ['[data-testid="chessboard-grid"]'],
    title: 'The chessboard',
    body: 'This board is your main focus — the whole visualizer is just chess with queens only. Attack paths, badges, and the solved state all play out here.',
    substeps: [
      {
        id: 'intro',
        body: 'This board is your main focus — the whole visualizer is just chess with queens only. Attack paths, badges, and the solved state all play out here.',
      },
      {
        id: 'conflict',
        title: 'Red glow means attacked',
        body: 'Queens glowing red are conflicted — other queens on the board can see and attack them. No red anywhere means the puzzle is solved.',
      },
      {
        id: 'hover-invite',
        title: 'Try hovering a queen',
        body: 'Hover any queen piece to see its attacking path light up. In chess a queen moves horizontally, vertically, and diagonally — all the way across the board — and the rays show exactly that reach.',
      },
      {
        id: 'hit-ring',
        title: 'Red ring = under attack',
        body: 'Hover a queen that has another queen in sight. The red rings that pop up mark every queen this one can see — being seen means being attacked.',
      },
      {
        id: 'badge-attackers',
        title: 'Top-right badge: attacker count',
        body: 'The red badge at the top right counts how many queens are currently attacking this one. Scrub to another step and watch the number change: up when more queens see it, down when they lose sight.',
      },
      {
        id: 'badge-delta',
        title: 'Bottom-right badge: what just changed',
        body: 'The bottom-right badge describes the latest move: green with a negative number means queens stopped attacking (Δ −1, Δ −2), red with a plus means new attackers just arrived — easiest to spot scrubbing backwards.',
      },
      {
        id: 'badge-amber',
        title: 'Amber badge: flat ground',
        body: 'Same bottom-right badge, turned amber: the move changed nothing (Δ = 0). That amber is your plateau signal — the search walking flat ground. You will meet its knob in the config step.',
      },
      {
        id: 'moved-glow',
        title: 'Blue glow: just moved',
        body: 'A cyan-blue glow marks the queen that just moved — but only if it landed somewhere safe. Land under attack and the red conflict glow overrides the blue.',
      },
      {
        id: 'trail',
        title: 'Trail: where it flew',
        body: 'The cyan square-tint trail shows the path the queen travelled. It is how you read movement at a glance instead of hunting row numbers.',
      },
      {
        id: 'pin',
        title: 'Try pinning a queen',
        body: 'Click a queen to pin it: a white halo ring appears and its rays stick while you scrub the timeline both ways. Pressing Play clears the pin — click the queen again to deselect.',
      },
    ],
  },
  {
    id: 'timeline',
    selectors: ['[data-tour="playback"]'],
    title: 'Timeline & playback',
    body: 'Scrub time, drive playback, tune speed, and learn the shortcuts — everything in this cluster.',
    substeps: [
      {
        id: 'scrubber',
        selectors: ['[data-tour="timeline-scrubber"]'],
        title: 'Timeline scrubber',
        body: '“Step N” tells you where you are, the % tells you how far through the run you are. Drag the slider and the board follows. The dots under the track mark the best step (green) and restarts (yellow — more on those later).',
      },
      {
        id: 'transport',
        selectors: ['[data-tour="transport"]'],
        title: 'Transport controls',
        body: 'Skip to start, step back, Play/Pause/Replay, step forward, skip to end — then Jump to Best and Rerun. Press Play now and watch the board come alive, then pause again.',
      },
      {
        id: 'presets',
        selectors: ['[data-tour="speed-presets"]'],
        title: 'Speed presets',
        body: 'Six speeds from 0.5× to 20×. Pick 20× while playing and feel the difference, then drop back to 2×.',
      },
      {
        id: 'fine',
        selectors: ['[data-tour="speed-fine"]', '[data-tour="speed-presets"]'],
        title: 'Fine speed slider',
        body: 'Want something between presets? This slider covers the same 0.5×–20× range continuously. (On narrow screens it hides — the presets always work.)',
      },
      {
        id: 'shortcuts',
        selectors: ['[data-tour="shortcuts"]'],
        title: 'Shortcuts — your turn',
        body: 'Space plays/pauses, ←/→ step one frame, R resets. Try each key now and watch the board obey.',
      },
    ],
  },
  {
    id: 'config',
    selectors: ['[data-tour="config"]'],
    title: 'Configuration',
    body: 'This panel is where you will spend most of your time: board size, algorithm, seed, and the hidden policy knobs. Note: touching any knob pauses playback — press Play again whenever a demo needs motion.',
    substeps: [
      {
        id: 'intro',
        body: 'This panel is where you will spend most of your time: board size, algorithm, seed, and the hidden policy knobs. Note: touching any knob pauses playback — press Play again whenever a demo needs motion.',
      },
      {
        id: 'board-size',
        selectors: ['[data-tour="board-size"]'],
        title: 'Board size (N × N)',
        body: 'One queen per column, so N sets queens and difficulty together — N = 4–16. Drag the slider up and watch the board regrow; bigger boards cost real compute. Press Play to see the new size run.',
      },
      {
        id: 'steepest',
        selectors: ['[data-tour="strategy"]'],
        title: 'Try: steepest-ascent',
        body: 'The greedy classic: every step takes the single best move. Select it, press Play, and watch conflicts plunge — then get stuck. That stuck feeling is the whole lesson of this website.',
      },
      {
        id: 'min-conflicts',
        selectors: ['[data-tour="strategy"]'],
        title: 'Try: min-conflicts',
        body: 'Now pick min-conflicts and Play again: it attacks one conflicted queen at a time instead of scanning everything. Same seed, visibly different journey — contrast is the teacher here.',
      },
      {
        id: 'self-try',
        selectors: ['[data-tour="strategy"]'],
        title: 'Your turn: the other three',
        body: 'First-choice, simulated-annealing, and genetic are yours to explore — open the dropdown, pick one, press Play. Watch what the temperature does to the board under annealing.',
      },
      {
        id: 'seed',
        selectors: ['[data-tour="seed"]'],
        title: 'Seed = reproducibility',
        body: 'The seeded RNG is the only randomness here: same seed + same config = a bit-identical run. Type a number for precision, or hit Random and watch the queens reshuffle.',
      },
      {
        id: 'advanced',
        selectors: ['[data-tour="advanced-trigger"]'],
        title: 'Hidden policy knobs',
        body: 'Click this header to open the Advanced Policy Knobs — finer control over how the search behaves. (I opened it for you this time; it restores itself after.)',
      },
      {
        id: 'plateau',
        selectors: ['[data-tour="plateau"]'],
        title: 'Allow Plateau Moves (Δ = 0)',
        body: 'Not spatial! This allows equal-cost moves that keep conflicts flat, so the search walks across shoulders instead of stopping. Toggle it and Play: flat stretches now continue. The Max Plateau Streak slider below caps consecutive flat moves (default 100, per AIMA).',
      },
      {
        id: 'restarts',
        selectors: ['[data-tour="restarts"]'],
        title: 'Random restarts + yellow dots',
        body: 'Stuck at a local maximum? Restarts abandon the board for a fresh random placement, up to the limit. Toggle it on, Play, and watch yellow restart dots appear on the timeline from Step 2.',
      },
      {
        id: 'cooling',
        selectors: ['[data-tour="cooling"]'],
        title: 'Cooling rate (SA only)',
        body: 'Simulated-annealing only: how fast temperature decays per proposal. Closer to 1 cools slower and explores longer.',
      },
    ],
  },
  {
    id: 'analytics',
    selectors: ['[data-testid="analytics-panel"]'],
    title: 'Analytics',
    body: 'The whole run at a glance: three tabs, one shared zoom, everything tracking the playback cursor.',
    substeps: [
      {
        id: 'tabs',
        body: 'Three tabs up top — Convergence, Landscape, Diagnostics — and the zoom level is shared, so zooming carries across tabs. Everything here follows the playback cursor automatically.',
      },
      {
        id: 'convergence',
        selectors: ['[data-tour="tab-convergence"]'],
        title: 'Convergence curve',
        body: 'The h(s) line falling is the search improving. The "Step N" cursor mirrors the timeline — click any point and the board jumps there. Temperature (dashed, SA only) and Restarts appear in the legend when relevant; the h=0 note marks the goal. Try wheel-zooming, then Play and watch it auto-follow.',
      },
      {
        id: 'landscape',
        selectors: ['[data-tour="tab-landscape"]'],
        title: 'Landscape markers',
        body: 'Click the Landscape tab: every step is its own marker, shaped and colored by phase — Improving, Shoulder, Exploration, Restart, Solved. Hover one for the full tooltip (same phase words as Step 1), and click to scrub there too.',
      },
      {
        id: 'diagnostics',
        selectors: ['[data-tour="tab-diagnostics"]'],
        title: 'Diagnostics (read-only)',
        body: 'Four tiles — Initial Conflicts, Best Reached (SOLVED badge at 0), Total Steps, Avg Eval/Step — plus the phase-breakdown bar in the same legend colors. The footer says it best: deterministic replay, every step captured immutably.',
      },
    ],
  },
  {
    id: 'stats',
    selectors: [
      '[data-testid="stats-rail"][data-variant="context"]',
      '[data-testid="stats-header"]',
    ],
    title: 'Live metrics',
    body: 'Charts show history; these tiles show right now — updating with every step you play or scrub.',
    substeps: [
      {
        id: 'frame',
        body: 'Charts show history; these tiles show right now — updating with every step you play or scrub.',
      },
      {
        id: 'tiles',
        selectors: ['[data-tour="stats-tiles"]'],
        title: 'The 2×2 grid',
        body: 'Timeline cursor (Step X / Y), Step Phase in words, live Attacking Pairs h(s), and Restarts — or live Temperature under annealing.',
      },
      {
        id: 'hero',
        selectors: ['[data-tour="stats-hero"]'],
        title: 'Run Status hero',
        body: 'The full-width hero is the fastest answer to “how is my run doing?” — status badge plus live h(s) and step count.',
      },
      {
        id: 'live',
        title: 'Watch them tick',
        body: 'Scrub the timeline (or ←/→ from Step 2) and watch every tile tick live — board moves, charts track, numbers follow. Play with it before moving on.',
      },
    ],
  },
  {
    id: 'csv',
    selectors: ['[aria-label="Export run as CSV"]'],
    title: 'Export history as CSV',
    body: 'One click downloads the full snapshot history — every board, conflict count, and move metric, the same data behind Diagnostics — for your own plots and analysis outside the site. There is always a run by this point in the tour, so go ahead and click it.',
  },
  {
    id: 'share',
    selectors: ['[data-tour="share"]'],
    title: 'Share the exact run',
    body: 'The finale — and it loops back to the seed lesson. This button copies a link encoding the entire configuration.',
    substeps: [
      {
        id: 'demo',
        body: 'The URL encodes the entire configuration, so the link reproduces this exact run bit-identically anywhere — same size, seed, strategy, policies. Remember the seed lesson? This is why it matters. Click it and watch the checkmark confirm.',
      },
      {
        id: 'sendoff',
        title: 'Happy hill-climbing!',
        body: 'That is the tour! Replay anytime from the footer. Now go break some local maxima.',
      },
    ],
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

function resolveSelectors(selectors: string[]): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  for (const selector of selectors) {
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

/** Full UI snapshot so the tour leaves zero trace (contract rule 3). */
interface TourSnapshot {
  config: import('@/store/simulation-store').SimulationConfig;
  speed: number;
  isPlaying: boolean;
  currentStep: number;
}

export function OnboardingTour() {
  const reduceMotion = !!useReducedMotion();
  const [open, setOpen] = React.useState(false);
  // stepIndex -1 = welcome modal (no spotlight); 0..n = guided steps.
  const [stepIndex, setStepIndex] = React.useState(0);
  const [subIndex, setSubIndex] = React.useState(0);
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
  const snapshotRef = React.useRef<TourSnapshot | null>(null);
  const openedAdvancedRef = React.useRef(false);

  const step =
    stepIndex < 0 ? null : (activeSteps[Math.min(stepIndex, activeSteps.length - 1)] ?? null);
  const substeps = step?.substeps ?? [];
  const sub = substeps[subIndex] ?? null;
  // Current spotlight selectors: substep override wins, else the step's.
  // Memoized so the measure effect below doesn't re-fire every render
  // (it would re-run scrollIntoView and fight smooth scrolling). `step`
  // and `sub` are stable state-derived refs, so identity deps are exact.
  const activeSelectors = React.useMemo(() => sub?.selectors ?? step?.selectors ?? [], [step, sub]);
  const shownTitle = sub?.title ?? step?.title ?? '';
  const shownBody = sub?.body ?? step?.body ?? '';
  const isLastSub = subIndex >= substeps.length - (substeps.length > 0 ? 1 : 0);
  const isLast =
    step !== null && stepIndex >= activeSteps.length - 1 && (substeps.length === 0 || isLastSub);

  const close = React.useCallback((mark: '1' | 'forever') => {
    // Restore the FULL snapshot (config + speed + playback position/state),
    // not just the strategy: Step 3 demos touch board size, seed, variants,
    // and policies. setConfig pauses by design (D-057), so resume playback
    // explicitly when the user was playing on entry.
    const snap = snapshotRef.current;
    snapshotRef.current = null;
    if (snap) {
      const st = simulationStore.getState();
      st.setConfig({ ...snap.config });
      st.setSpeed(snap.speed);
      st.jumpTo(snap.currentStep);
      if (snap.isPlaying) st.play();
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

  /** Forward: next substep, else next step (past the end closes). */
  const advance = React.useCallback(() => {
    const subs =
      activeSteps[Math.min(Math.max(stepIndex, 0), activeSteps.length - 1)]?.substeps ?? [];
    if (stepIndex >= 0 && subIndex < subs.length - 1) {
      setSubIndex(subIndex + 1);
      return;
    }
    const next = stepIndex + 1;
    if (next >= activeSteps.length) {
      close('1');
      return;
    }
    setSubIndex(0);
    setStepIndex(next);
  }, [activeSteps, stepIndex, subIndex, close]);

  /** Backward: previous substep, else previous step at its last substep. */
  const retreat = React.useCallback(() => {
    if (subIndex > 0) {
      setSubIndex(subIndex - 1);
      return;
    }
    const prev = Math.max(stepIndex - 1, stepIndex < 0 ? -1 : 0);
    const prevSubs =
      activeSteps[Math.min(Math.max(prev, 0), activeSteps.length - 1)]?.substeps ?? [];
    setSubIndex(Math.max(prevSubs.length - 1, 0));
    setStepIndex(prev);
  }, [activeSteps, stepIndex, subIndex]);

  const start = React.useCallback(() => {
    // Snapshot the FULL UI state first (contract rule 3) — Step 3 demos
    // touch board size, seed, variants, and policies, so restoring just
    // the strategy is no longer enough.
    const st = simulationStore.getState();
    snapshotRef.current = {
      config: { ...st.config },
      speed: st.speed,
      isPlaying: st.isPlaying,
      currentStep: st.currentStep,
    };
    // Force the canonical strategy so every step target exists.
    // (Cooling only renders under simulated-annealing, so its substep is
    // dropped on the forced path — the definition stays for direct SA tours.)
    const current = st.config.strategy;
    if (current !== 'steepest-ascent') {
      simulationStore.getState().setConfig({ strategy: 'steepest-ascent' });
    }
    setActiveSteps(
      ONBOARDING_TOUR_STEPS.map((s) =>
        s.id === 'config' && current !== 'simulated-annealing'
          ? { ...s, substeps: (s.substeps ?? []).filter((sub) => sub.id !== 'cooling') }
          : s,
      ),
    );
    // Welcome modal first (stepIndex -1); "Let's explore!" enters step 0.
    setSubIndex(0);
    setStepIndex(-1);
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

  // Per-step/substep: auto-manage the Advanced collapsible, scroll the
  // target into view, and measure the spotlight. Missing targets are
  // skipped forward (substep first, then step).
  React.useEffect(() => {
    if (!open || !step) return;
    const el = resolveSelectors(activeSelectors);
    if (!el) {
      // Missing target (e.g. the SA-only cooling substep on the forced
      // steepest path, or an anchor unmounted on resize): skip forward on
      // the next frame. Deferred - not a synchronous render-derived
      // update - so the set-state-in-effect rule stays quiet.
      const skip = requestAnimationFrame(() => advance());
      return () => cancelAnimationFrame(skip);
    }
    // The config step hosts the policy substeps - keep Advanced open for
    // the whole step, restore afterwards.
    const needsAdvanced = step.id === 'config';
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
      const target = resolveSelectors(activeSelectors);
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
  }, [open, step, stepIndex, subIndex, activeSelectors, advance, reduceMotion]);

  // Move focus to Next on step/substep change (screen-reader users follow the tour).
  React.useEffect(() => {
    if (open) nextButtonRef.current?.focus();
  }, [open, stepIndex, subIndex]);

  // Calm-queens staging (tour demo only): while the chessboard INTRO is
  // showing, suppress the red conflict glow so the board opens calm;
  // advancing to "Red Glow Means Attacked" clears the flag and the glow
  // crossfades in through the existing glyph animation. Closing the tour
  // (open → false) resets it via the same assignment.
  React.useEffect(() => {
    tourUiStore.getState().setCalmQueens(open && step?.id === 'chessboard' && subIndex === 0);
    // Unmount (e.g. navigating away mid-tour) must never strand the flag.
    return () => {
      tourUiStore.getState().setCalmQueens(false);
    };
  }, [open, step, subIndex]);

  const onTooltipKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close('1');
    } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      advance();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      retreat();
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
  // Welcome phase needs no spotlight rect; guided steps need both.
  if (!mounted || !open) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const tip = rect ? placeTourTooltip(rect, vw, vh) : { top: 0, left: 0 };

  const backdropClass = 'fixed z-50 bg-black/60 backdrop-blur-[1px] motion-reduce:bg-black/60';

  // Welcome modal (stepIndex -1): centered dialog, no spotlight — there is
  // nothing to spotlight yet. Same AnimatePresence contract as the tooltip
  // (key + exit), gentle-spring entrance mirroring the exit.
  if (stepIndex < 0) {
    return createPortal(
      <div className={backdropClass} style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key="tour-welcome"
            ref={tooltipRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-tour-title"
            aria-describedby="onboarding-tour-body"
            data-testid="onboarding-tour"
            data-tour-phase="welcome"
            onKeyDown={onTooltipKeyDown}
            className="fixed z-50 flex w-[min(360px,calc(100vw-24px))] flex-col gap-3 rounded-xs border border-border bg-card p-5 shadow-xl"
            style={{
              top: '50%',
              left: '50%',
              x: '-50%',
              y: '-50%',
            }}
            initial={
              reduceMotion ? { opacity: 1 } : { opacity: 0, scale: motionTokens.scale.press }
            }
            animate={{ opacity: 1, scale: 1, x: '-50%' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: motionTokens.scale.press }}
            transition={
              reduceMotion
                ? { duration: 0.2 }
                : { duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }
            }
          >
            <h2 id="onboarding-tour-title" className="text-base font-semibold tracking-tight">
              {TOUR_WELCOME.title}
            </h2>
            <p id="onboarding-tour-body" className="text-xs leading-relaxed text-muted-foreground">
              {TOUR_WELCOME.body}
            </p>
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => close('1')}
                className="rounded-md px-2 py-1.5 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Skip tour
              </button>
              <button
                ref={nextButtonRef}
                type="button"
                onClick={() => {
                  setSubIndex(0);
                  setStepIndex(0);
                }}
                className="h-8 min-w-20 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs transition-transform hover:scale-[1.03] active:scale-95"
              >
                Let&apos;s explore!
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>,
      document.body,
    );
  }

  // Past the welcome branch, a guided step with a measured rect is required.
  if (!step || !rect) return null;

  const overlay = (
    <>
      {/* Four dimmed panels around the spotlight — stable across steps
          (they reposition in place, no remount), so backdrop testids stay
          unique. Clicking any advances. */}
      <div
        data-testid="onboarding-tour-backdrop-top"
        aria-hidden="true"
        onClick={() => advance()}
        className={backdropClass}
        style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }}
      />
      <div
        data-testid="onboarding-tour-backdrop-bottom"
        aria-hidden="true"
        onClick={() => advance()}
        className={backdropClass}
        style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }}
      />
      <div
        data-testid="onboarding-tour-backdrop-left"
        aria-hidden="true"
        onClick={() => advance()}
        className={backdropClass}
        style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }}
      />
      <div
        data-testid="onboarding-tour-backdrop-right"
        aria-hidden="true"
        onClick={() => advance()}
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
          key={`${step.id}:${subIndex}`}
          ref={tooltipRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-tour-title"
          aria-describedby="onboarding-tour-body"
          data-testid="onboarding-tour"
          data-tour-phase="guide"
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
            {shownTitle}
          </h2>
          <p id="onboarding-tour-body" className="text-xs leading-relaxed text-muted-foreground">
            {shownBody}
          </p>
          {/* First-step-only drag hint (progressive disclosure: teach the
              gesture once, then stay out of the way). */}
          {stepIndex === 0 && subIndex === 0 && (
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
              {(stepIndex > 0 || subIndex > 0) && (
                <button
                  type="button"
                  onClick={() => retreat()}
                  className="h-8 rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Back
                </button>
              )}
              <button
                ref={nextButtonRef}
                type="button"
                onClick={() => advance()}
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
