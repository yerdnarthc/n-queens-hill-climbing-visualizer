/**
 * Tour content — the tour's words and spotlight map, framework-free.
 *
 * Moved verbatim from `onboarding-tour.tsx` during the Reactour port (D-064)
 * so copy stays in exactly one place: the flat-step adapter
 * (`tour-adapter.ts`) and the provider shell (`reactour-tour.tsx`) both read
 * from here, and no wording was changed in the migration.
 */

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
