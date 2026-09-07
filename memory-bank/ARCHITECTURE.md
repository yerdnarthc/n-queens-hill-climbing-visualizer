# Architecture — How is it structured?

> Verified against the codebase on **2026-09-05** (commit `1bb1ebb`,
> post-D-044 + Queen-move animation overhaul + memory-bank refresh).
> 21 follow-up commits since the Phase 7 baseline (`71c6581`); 32
> commits total.

## Repository layout

```
N-Queens Visualizer/            ← task workspace root
├── package-lock.json           ← renamed by the user to "N-Queens Visualizer" (intentional)
└── n-queens-visualizer/        ← the app (git repo, branch master, Next 16.3.4)
    ├── AGENTS.md               ← AI-agent instruction set (memory-bank reading
    │                              protocol + Next.js/TS/Tailwind conventions) —
    │                              the AI reads this at the start of every task
    │                              before the memory bank (moved from
    │                              `.clinerules/` in D-045)
    │   ├── .agents/skills/         ← vendored third-party agent skills (6 skills
    │                              + `skills-lock.json` at root); excluded from
    │                              eslint/prettier/tsc in D-045 — never linted
    ├── memory-bank/            ← this memory system, version-controlled (D-043;
    │                              was `docs/` at the workspace root per D-016, moved
    │                              into the repo in commits `577f2eb` + `c9f500d`)
    ├── legacy/index.html       ← original 787-line single-file prototype (reference only)
    ├── src/
    │   ├── app/                ← App Router: layout.tsx (SiteNav + NuqsAdapter,
    │   │                          self-hosted Sora/Chivo Mono fonts via next/font/local),
    │   │                          page.tsx (visualizer, Suspense-wrapped for URL sync),
    │   │                          how-it-works/, robots.ts, sitemap.ts,
    │   │                          globals.css (semantic color tokens + warm-sand/oxblood palette;
    │   │                          the Phase 10 `@keyframes trajectory-draw` was removed in Phase 11
    │   │                          with MoveTrajectory — queens travel explicitly now)
    │   ├── components/
    │   │   ├── ui/             ← shadcn primitives: badge, button, card, collapsible,
    │   │   │                      select, separator, slider, switch, tabs, tooltip,
    │   │   │                      math.tsx (NEW Phase 9 — KaTeX wrapper for inline math)
    │   │   ├── visualizer/     ← chessboard (queen overlay + shared grid measurement),
    │   │   │                      playback-controls, stats-header (slim, page-level);
    │   │   │                      stats-rail.tsx (NEW Phase 9 — rail/compact/context);
    │   │   │                      queen-piece.tsx (explicit x/y travel, Phase 11;
    │   │   │                      flat Staunton glyph + solid discs, Phase 13);
    │   │   │                      queen-glyph.tsx (NEW Phase 13 — flat queen
    │   │   │                      silhouette SVG, currentColor + stroke class);
    │   │   │                      origin-echo.tsx (ghost departure marker, Phase 11);
    │   │   │                      useQueenDuration.ts (NEW Phase 11 — playback-gated duration);
    │   │   │                      onboarding-tour.tsx (NEW Phase 12 — first-visit
    │   │   │                      spotlight walkthrough, localStorage-gated);
    │   │   │                      chart-helpers.ts, chart-wrapper.tsx,
    │   │   │                      convergence-chart.tsx, landscape-chart.tsx,
    │   │   │                      analytics-panel.tsx (now owns the shared zoom state);
    │   │   │                      use-follow-current-step.ts (NEW Phase 8 — pure
    │   │   │                      computeFollowRange for the auto-scroll dataZoom);
    │   │   │                      (move-trajectory.tsx REMOVED in Phase 11 — queens
    │   │   │                      travel explicitly, no line needed; old opacity 0.85
    │   │   │                      recorded in D-046 for a potential restore)
    │   │   ├── site-nav.tsx    ← Phase 5 persistent top nav + global theme toggle
    │   │   └── theme-provider.tsx
    │   ├── hooks/               ← useSimulationDriver (the app's only timer),
    │   │                          useKeyboardShortcuts (Phase 5, page-scoped keydown),
    │   │                          useUrlConfigSync (Phase 6, URL ⇆ store bridge)
    │   ├── lib/
    │   │   ├── engine/         ← ★ pure algorithm core (zero React deps)
    │   │   ├── motion-tokens.ts← NEW Phase 11 — durations, easings, queen knobs
    │   │   │                      (QUEEN_STEPPER_MS, QUEEN_ARC_LIFT_PX,
    │   │   │                      ORIGIN_ECHO_DURATION_MULTIPLIER, easeForTravel)
    │   │   ├── strategy-info.ts← Phase 5 shared strategy/policy metadata
    │   │   │                      (Phase 9: `tag` field dropped — descriptions only)
    │   │   ├── url-state.ts    ← Phase 6 pure URL ⇆ config schema (nuqs parsers, clamping)
    │   │   ├── csv-export.ts   ← Phase 6 pure RFC-4180 run-CSV builder
    │   │   ├── clipboard.ts    ← Phase 6 copy helper (navigator.clipboard + fallback)
    │   │   ├── animation-timings.ts ← Phase 10 pure speed→duration helper
    │   │   │                          (computeStepDuration; engine-purity extension)
    │   │   └── utils.ts        ← cn() class-merge helper
    │   ├── assets/fonts/        ← self-hosted Sora + Chivo Mono variable TTFs
    │   │                          (Phase 9 — replaced Geist/Geist Mono; same
    │   │                          offline-safe invariant from D-029)
    │   ├── store/               ← ★ Zustand simulation store (factory + singleton)
    │   ├── test/setup.ts       ← vitest setup (@testing-library/jest-dom matchers)
    │   └── types/assets.d.ts
    ├── vitest.config.ts · playwright.config.ts · tsconfig.json · eslint.config.mjs
    │                            (Phase 9: eslint.config.mjs imports
    │                             eslint-config-next@16 native flat config
    │                             directly — no @eslint/eslintrc / FlatCompat;
    │                             tsconfig.json jsx: "react-jsx" for Next 16)
    └── .husky/pre-commit       ← npx lint-staged → prettier --write + eslint --fix
```

**Landed in Phase 5** (commit `64a68d0`): `useKeyboardShortcuts`,
`/how-it-works` route, `site-nav.tsx`, `strategy-info.ts`. **Landed in
Phase 6** (commit `460b84d`): `url-state.ts`, `useUrlConfigSync`,
`csv-export.ts`, `clipboard.ts`, `robots.ts`, `sitemap.ts`. **Landed in
Phase 7** (commit `71c6581`): `e2e/` (7 specs + shared fixture + README),
`playwright.config.ts` polish. **Landed in Phase 8** (commits
`a573ac4..16c1d5d`): `buildDataZoomConfig`, `use-follow-current-step.ts`,
axisPointer fallback, per-point phase symbols, shared zoom state in
`AnalyticsPanel`, snappier animation profile. **Landed in Phase 9**
(commits `1fc395d..41a0603`): `stats-rail.tsx` (rail/compact/context
variants), `ui/math.tsx` (KaTeX wrapper), Sora + Chivo Mono self-hosted
fonts, semantic color tokens (`bg-global-max`, `bg-conflict`, …),
warm-sand/oxblood palette, **Next 15.5 → 16.3.4**, `eslint-config-next@16`
flat config, `tsconfig.json` jsx `react-jsx`. See D-034..D-042 for
rationale.

## The engine — `src/lib/engine` (Phase 1, complete, 81 tests)

| Module           | Responsibility                                                              |
| ---------------- | --------------------------------------------------------------------------- |
| `types.ts`       | Board rep, config types, `Snapshot`, `Strategy` interface, ids & limits      |
| `config.ts`      | `resolveConfig()` — defaults + validation, throws typed `EngineConfigError` |
| `rng.ts`         | mulberry32 seeded RNG (`next/int/chance/pick/shuffle`) — sole entropy       |
| `conflicts.ts`   | O(1) incremental evaluator + brute-force pair-scan oracle                   |
| `strategies/`    | 5 strategies + registry (`STRATEGIES`, `getStrategy`)                       |
| `simulation.ts`  | `runSimulation()` orchestrator — the only stateful part                     |
| `index.ts`       | Public-API barrel export                                                   |

### Board representation & core invariants

- `rows[col] = row` — exactly one queen per **column**; a move relocates one
  queen within its own column (neighbor space = n·(n−1)).
- Conflicts = number of attacking queen **pairs** (lower is better, 0 = solved).
- The evaluator keeps `Int32Array` occupancy counts for rows and both diagonal
  families; total = Σ C(count, 2); `getTotal`, `queenConflicts`, `moveDelta`,
  `applyMove` are all O(1).
- The evaluator **owns** the board (`getRows()`); every mutation must go through
  `applyMove`, keeping counts in sync. Snapshots copy (`slice()`).
- The orchestrator re-checks each accepted move: if the strategy's predicted Δ
  ≠ the applied Δ it **throws** (fail-fast oracle assertion).

### Run data flow

`EngineConfigInput` → `resolveConfig` → `runSimulation` loop:
`strategy.selectMove(ctx)` → `applyMove` → push immutable `Snapshot`
(fields: `step, board, conflicts, phase ∈ {initial, improving, shoulder,
worsening, restart}, move, iterationInRestart, restartCount, temperature`)
→ `SimulationResult` (status ∈ `solved | stagnated | exhausted | frozen`,
snapshots, `finalBoard`, totals, `bestConflicts`/`bestStep`).

Termination guarantees: per-restart accepted-move budget, total-step budget,
restart cap, and SA's finite geometric cooling.

### Strategy / policy split (important design point)

Strategies only **pick moves** (`selectMove(ctx)`). Plateau (sideways) streak
budgets and random restarts are **orchestrator policies**, configured once and
shared by all variants. Simulated annealing is exempt from the sideways budget
(temperature governs its exploration).

Config defaults: `allowSideways: true`, `maxConsecutiveSideways: 100`,
`allowRestarts: false`, `maxRestarts: 10`, `maxIterationsPerRestart: 1000`,
`maxTotalSteps: 10000`, `saInitialTemp: boardSize`, `saCoolingRate: 0.99`,
`saMinTemp: 0.01`.

## The simulation store — `src/store` (Phase 2, complete; 31 + 11 tests)

| Module                 | Responsibility                                                            |
| --------------------- | ------------------------------------------------------------------------- |
| `simulation-store.ts` | Vanilla-Zustand **factory** `createSimulationStore()` — state, actions, selectors; zero React imports |
| `index.ts`            | React boundary: app singleton `simulationStore` + `useSimulationStore(selector)` |

- **State**: `config` (UI-facing `SimulationConfig`, clamped), `result:
  SimulationResult | null`, `currentStep` cursor, `isPlaying`, `speed`
  (0.5–30 steps/sec, default 2).
- **Playback model** (D-017/D-019): precompute-then-time-travel — the engine
  runs once per config change; playback is pure cursor movement. Config
  changes auto-rerun and **preserve `isPlaying`**; `stepForward()` at the end
  auto-pauses (the "run finished" signal); `play()` at the end replays from
  step 0.
- **Selectors** return primitives or refs into the immutable snapshot array
  (`selectSnapshot`, `selectResult`, `selectTotalSteps`, `selectProgress`,
  `selectIsAtStart`, `selectIsAtEnd`) — stable across renders, no `useShallow`.

### The driver — `src/hooks/useSimulationDriver.ts`

Owns the **only timer** in the app (D-020): a `setInterval` recreated on
`isPlaying`/`speed` changes, ticking `stepForward()`; it self-terminates via
the store's auto-pause (never needs run lengths). On mount it bootstraps the
initial run if none exists. Tested via `renderHook` + `vi.useFakeTimers()`.

## Frontend (Phase 0 scaffold + Phase 9 refresh)

- Dark-first theme via `next-themes` (class strategy, `defaultTheme: 'dark'`,
  system preference disabled).
- `globals.css` defines a **warm-sand / cream / stone / taupe** light ramp
  and a **oxblood / ink / ember / flame** dark ramp (D-039), with semantic
  color tokens wired to CSS vars: `bg-global-max`, `bg-local-max`,
  `bg-conflict`, `bg-improving`, `bg-shoulder`, `bg-worsening`,
  `bg-restart` (and matching `*-deep` shades for gradient bottoms). One
  semantic color per landscape concept (improving / shoulder / local-max /
  global-max / conflict) is shared across the chessboard, queen piece,
  charts, legend, and status badges — D-013's invariant holds.
- The **"Midnight Lab"** branding (D-013) is retired; the project is now
  the warm-sand/oxblood palette only.
- Chessboard squares stay warm-wood across themes (`--board-light:
  #f0d9b5`, `--board-dark: #b58863`); the solved-wrapper keeps literal
  `border-emerald-500/80 ring-4` classes on purpose because
  `e2e/solve-flow.spec.ts` matches that class (D-041).
- Fonts: **Sora + Chivo Mono** self-hosted via `next/font/local` pointing
  at variable TTFs in `src/assets/fonts/` (D-029 → D-039 swap). Same
  offline-safe invariant as Phase 5: no `fonts.googleapis.com` request
  at build or runtime. CSS variables renamed from `--font-geist-*` to
  `--font-sora-sans` / `--font-chivo-mono`.
- Home page (`src/app/page.tsx`): `<StatsHeader />` (slim) at the top;
  main workspace is a 10-col grid with the chessboard card (containing
  a `<StatsRail variant="rail" />` aside on `lg+` / `<StatsRail
  variant="compact" />` strip on `<lg` around the `<Chessboard />`) on
  the left, and on the right the `<ConfigPanel compact />` + an
  `<AnalyticsPanel />` (Convergence / Landscape tabs, ECharts 6) with a
  `<StatsRail variant="context" />` dashboard below. A second full-width
  "About Hill-Climbing Local Search" panel lives below the grid.
- `/how-it-works` is a static server component with no store, driver, or
  client hooks (D-028).

## Analytics & chart interaction (Phase 8)

- **DataZoom** (D-034): every chart has `inside` (wheel/pinch) + `slider`
  zoom, both pinned to `xAxisIndex: 0` with `zoomLock: true` and
  `filterMode: 'filter'` (Y domain stays `[0, maxConflicts]`).
- **Shared zoom state** (D-036): `AnalyticsPanel` owns `sharedZoomRange`
  and passes it to both charts as a controlled prop — tab switches
  preserve the window because the parent never unmounts.
- **Auto-follow** (D-037): `use-follow-current-step.computeFollowRange`
  is a pure function returning `{start, end} | null`; `ChartWrapper`
  reads it and fires `dispatchAction` against slider index 1 when the
  marker crosses an edge, preserving the user's chosen window width
  (trailing 0.7 when scrolling right, leading 0.3 when scrolling left).
- **Click-in-the-gaps** (D-035): `ChartWrapper` caches the last
  `updateAxisPointer` value; click handler falls back to it when the
  click misses a series element. Convergence chart's line series uses
  per-point `[step, conflicts]` data items with phase-specific symbol
  (star = solved, triangle = restart, diamond = shoulder, circle) and a
  2px border + 8px shadow on the current step.
- **Animation** (D-038): both charts set `animationDuration: 200`,
  `animationDurationUpdate: 100`, `animationEasingUpdate: 'cubicOut'`,
  `animationThreshold: 200`. MarkLines and the auto-scroll
  dispatchAction override to `animation: { duration: 50 }` so the
  current-step cursor **snaps** instead of easing.

## Stats display (Phase 9, D-040)

- `<StatsHeader />` (slim) renders the page-level summary — title, N,
  strategy, primary action, "Share" / "Random Seed" buttons.
- `<StatsRail variant="rail" />` — vertical aside on `lg+` inside the
  chessboard card (4/15 width): Run Status, Timeline Cursor, Attacking
  Pairs, Step Phase, Restarts-or-Temperature.
- `<StatsRail variant="compact" />` — horizontal scrollable strip on
  `<lg`: same 5 cards, tighter padding, no border.
- `<StatsRail variant="context" />` — full-width dashboard below the
  `AnalyticsPanel`: 5 metric tiles in a 2×2 grid + 1 hero Run-Status
  tile below with the run's `h(s)` value and step count.
- All three variants share one component, one selector set
  (`selectResult`, `selectSnapshot`, `selectTotalSteps`,
  `useSimulationStore((s) => s.currentStep)`), and one set of
  status-meta mappings.

## Queen move animation (Phase 10 → Phase 11, D-044 → D-046)

Phase 10 proved the speed-aware duration curve but the queen still read as
teleporting (`layout`-FLIP + pulse + CSS dash line, no authored travel).
Phase 11 replaces the mechanism while keeping the feel:

- **Explicit travel overlay** (`src/components/visualizer/chessboard.tsx`)
  — squares render empty; queens live in an absolute `inset-0` overlay
  measured once from the grid's `ResizeObserver` rect (shared with all
  children, so pixel positions stay exact on resize). Each queen keeps a
  stable `key={col}` (queens never change column), so Motion tweens travel
  instead of remounting. No `layout` anywhere (skills forbid it at board
  scale); the only per-step measurement is the single grid rect.
- **`QueenPiece`** (`src/components/visualizer/queen-piece.tsx`) — `x`
  tweens straight, `y` flies `[from, apex, to]` with the arc lift from
  `QUEEN_ARC_LIFT_PX`, driven by `useMotionValue` + imperative `animate()`
  (effect-owned: reads via `.get()`, never during render, satisfying
  `react-hooks/refs`; `controls.stop()` cleanup makes 30× takeovers
  pile-free). Fall-segment easing is distance-scaled via
  `easeForTravel` (full overshoot ≤ 1 square → clean settle ≥ 6
  squares); the rise is `easeIn` so velocity stays continuous through
  the apex at any distance. The `useAnimate` scale/shadow pulse is kept,
  now gated on actual position change (toggling play no longer
  re-pulses). Receives `x/y/size/durationMs/reducedMotion` as props —
  no longer derives anything from `speed` itself.
- **Playback-gated duration** (`src/components/visualizer/useQueenDuration.ts`)
  — the single duration source: playing → `computeStepDuration(speed)`
  (50…400 ms); paused/stepping/scrubbing → fixed `QUEEN_STEPPER_MS`
  (220 ms) regardless of configured speed; reduced motion → 0.
  `computeStepDuration` itself is untouched (engine-purity extension,
  D-002).
- **`OriginEcho`** (`src/components/visualizer/origin-echo.tsx`) — ghost
  departure marker: halo bloom (`ring-2` + `ring-offset-background`,
  1 → 1.22) + dissolving `Crown` ghost + `R{row}` corner pill, all on
  one fade lasting `ORIGIN_ECHO_DURATION_MULTIPLIER` (2×) the travel
  duration. Static twin under reduced motion. Positioned by the parent
  over the origin square; re-keyed per move.
- **Motion, not framer-motion** — `motion@13.2.0`, all imports from
  `motion/react`. Travel deliberately uses a duration TWEEN, not a
  spring: a spring cannot lock to 60% of `1000/speed` (D-044 clock
  lock wins over the skill's spring ideal — documented in code).
  `MoveTrajectory` + its test + `@keyframes trajectory-draw` were
  deleted (explicit travel needs no line).

Engine/store/Playwright e2e: **untouched**. The visualizer-side
`data-testid`s used by the e2e suite (`chessboard-grid`,
`square-{col}-{row}`, `queen-{col}-{row}`) are preserved, plus
`origin-echo`. `MoveTrajectory`'s `move-trajectory` testid is gone
with the component (no e2e spec referenced it).

## Onboarding tour (Phase 12, D-047)

First-visit spotlight walkthrough (`src/components/visualizer/
onboarding-tour.tsx`, mounted once in `src/app/page.tsx`,
`createPortal` to `document.body`):

- **Persistence** — versioned `localStorage` key `nqueens-tour:v1`
  (`'1'` seen, `'forever'` opted out). Survives tab close AND browser
  restart; `?tour=1` forces open, `?tour=0` forces closed, and a footer
  "Replay tour" button dispatches `REOPEN_TOUR_EVENT` (`CustomEvent`)
  that the tour subscribes to. No such thing as "clear on browser
  close" exists on the web (sessionStorage dies with the tab) — hence
  localStorage + explicit opt-out instead.
- **Steps** — 10 definitions (`ONBOARDING_TOUR_STEPS`, cooling
  conditional on simulated-annealing): board N → variant → seed →
  plateau → restarts → cooling → chessboard → playback → analytics →
  stats → share/export. Targets resolve via `data-tour` anchors (added
  to ConfigPanel sections + PlaybackControls root) with fallbacks to
  existing `data-testid`s; missing targets are skipped via rAF-defer.
- **No-trace rule** — entry forces `strategy: 'steepest-ascent'` (so
  every step target exists) and auto-opens the Advanced collapsible
  for policy steps; exit restores the user's strategy AND the
  collapsible's prior open state.
- **Motion** — spotlight cuts instantly (foundations Rule 4 bans
  layout props in `animate`); only the tooltip fades (opacity,
  `motionTokens.duration.fast`), wrapped in `AnimatePresence
  mode="wait"` keyed per step. `role="dialog"` + `aria-modal`, Esc /
  arrows / backdrop-click advance, light Tab trap, focus moves to Next
  per step, reduced-motion collapses the fade.
- **E2E interplay** — fresh Playwright contexts have empty storage, so
  the tour would intercept every existing spec: `e2e/fixtures/test.ts`
  suppresses it via `addInitScript` (share URLs untouched), and
  `e2e/tour.spec.ts` (base client, 3 specs) covers first-show,
  advance, Skip-persists-across-reload, and Replay.
- **Tests** — `__tests__/onboarding-tour.test.tsx` (11 tests: 3 pure
  `placeTourTooltip` placement, 8 behavior). jest-dom jsdom ships
  storage stubs WITHOUT the Storage API, so `src/test/setup.ts` gains
  an in-memory `MemoryStorage` mock (D-023 precedent).

## Testing architecture

- **Unit (Vitest, jsdom, globals)**: 30 suites, **349 tests passing**.
  - `src/lib/engine/__tests__/` — config validation, RNG stream/
    statistics, evaluator-vs-oracle (incl. fuzz equivalence), per-
    strategy contracts, orchestration (restarts, budgets, determinism,
    statuses): 81 tests.
  - `src/store/__tests__/` — 31 headless store tests via `getState()`
    (no React tree).
  - `src/lib/__tests__/strategy-info.test.ts` — coverage check only
    (Phase 9 dropped the `tag` field; field-level assertions removed).
  - `src/lib/__tests__/url-state.test.ts` — URL schema and
    `sameUrlValues` (D-033) regression tests.
  - `src/lib/__tests__/csv-export.test.ts` — RFC-4180 builder.
  - `src/lib/__tests__/animation-timings.test.ts` — Phase 10 pure helper
    coverage (13 tests; the speed→duration formula + reduced-motion
    short-circuit + defensive fallbacks for NaN/0/Infinity/negative).
  - `src/lib/__tests__/motion-tokens.test.ts` — Phase 11
    `easeForTravel` contract (4 tests: short-hop curve, long-flight
    settle, monotonic fade, garbage-input hardening).
  - `src/components/visualizer/__tests__/` — chart-helpers (+610 since
    Phase 7), chart-wrapper (+433), analytics-panel (+149), stats-rail
    (+145, new file), stats-header (+25, mostly moved-out tests),
    config-panel (+25, compact variant), use-follow-current-step (+337,
    new file), queen-piece (+10, Phase 11 + Phase 13 no-gradients guard),
    origin-echo (+6, Phase 11: ghost + label), useQueenDuration (+4,
    Phase 11: play/step gate contract), queen-glyph (+3, Phase 13).
    (`move-trajectory.tsx` + its 4 tests were DELETED in Phase 11.)
  - `src/components/visualizer/__tests__/onboarding-tour.test.tsx` —
    Phase 12 (+11: pure tooltip-placement ×3, storage gate, step flow,
    backdrop advance, Esc, permanent opt-out, strategy force/restore,
    replay, full 10-step walk).
  - `src/components/visualizer/__tests__/queen-glyph.test.tsx` —
    Phase 13 (+3: silhouette structure, currentColor + no gradients,
    conditional details).
  - `src/test/setup.ts` — Phase 12 adds an in-memory `MemoryStorage`
    mock (this jsdom exposes storage stubs without the Storage API).
  - Fixtures are machine-harvested — never hand-computed (D-014).
- **Hook tests (RTL)**: `src/hooks/__tests__/useSimulationDriver.test.ts` —
  11 tests, `renderHook` + fake timers. Plus
  `useKeyboardShortcuts.test.ts` (8 tests, D-026).
- **E2E (Playwright)**: 8 specs in `./e2e` (smoke, solve-flow, playback,
  theme, navigation, url-state, seo, **tour — NEW Phase 12**) + shared `fixtures/test.ts` that
  waits for `<Suspense>` hydration. Targets the production build via
  `npm run start`; one-time `npx playwright install chromium` documented
  in `e2e/README.md`. Single `chromium` project, `retries: 2 in CI`,
  traces `on-first-retry`. Smoke and playback specs were updated in
  Phase 9 for the new DOM (StatsRail aside, 10-col home grid); Phase 10
  did not require e2e changes (animation timing is not asserted in
  Playwright — visual smoke only, verified in the dev server). Phase 12:
  the shared fixture suppresses the first-visit tour via `addInitScript`
  (fresh contexts have empty storage, so the overlay would otherwise
  intercept every click); `tour.spec.ts` covers the tour itself against
  the base client.

## Commands (run inside `n-queens-visualizer/`)

| Command                    | Purpose                          |
| -------------------------- | -------------------------------- |
| `npm run dev`              | Dev server (Turbopack)                 |
| `npm run build` / `start`  | Production build (Next 16.3.4) / serve |
| `npm run lint`             | ESLint flat config (Phase 9)           |
| `npm run format[:check]`   | Prettier write / check                 |
| `npm run typecheck`        | `tsc --noEmit` (jsx: "react-jsx")      |
| `npm run test` / `test:run`| Vitest watch / CI                      |
| `npm run test:e2e`         | Playwright (chromium, `npm run build` first) |

Prettier: single quotes, width 100, trailing commas, tailwind class sorting.

