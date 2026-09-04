# Architecture — How is it structured?

> Verified against the codebase on **2026-09-04** (commit `4c1d96e`,
> post-D-043 + .clinerules/ in-repo + a11y/code fixes). 17 follow-up
> commits since the Phase 7 baseline (`71c6581`); 29 commits total.

## Repository layout

```
N-Queens Visualizer/            ← task workspace root
├── package-lock.json           ← renamed by the user to "N-Queens Visualizer" (intentional)
└── n-queens-visualizer/        ← the app (git repo, branch master, Next 16.3.4)
    ├── .clinerules/            ← AI-agent instruction set (memory-bank.md +
    │                              nextjs-conventions.md) — version-controlled
    │                              since `a7dafcb`; the AI reads these at the
    │                              start of every task before the memory bank
    ├── memory-bank/            ← this memory system, version-controlled (D-043;
    │                              was `docs/` at the workspace root per D-016, moved
    │                              into the repo in commits `577f2eb` + `c9f500d`)
    ├── legacy/index.html       ← original 787-line single-file prototype (reference only)
    ├── src/
    │   ├── app/                ← App Router: layout.tsx (SiteNav + NuqsAdapter,
    │   │                          self-hosted Sora/Chivo Mono fonts via next/font/local),
    │   │                          page.tsx (visualizer, Suspense-wrapped for URL sync),
    │   │                          how-it-works/, robots.ts, sitemap.ts,
    │   │                          globals.css (semantic color tokens + warm-sand/oxblood palette)
    │   ├── components/
    │   │   ├── ui/             ← shadcn primitives: badge, button, card, collapsible,
    │   │   │                      select, separator, slider, switch, tabs, tooltip,
    │   │   │                      math.tsx (NEW Phase 9 — KaTeX wrapper for inline math)
    │   │   ├── visualizer/     ← chessboard, config-panel (with `compact` variant),
    │   │   │                      playback-controls, stats-header (slim, page-level);
    │   │   │                      stats-rail.tsx (NEW Phase 9 — rail/compact/context);
    │   │   │                      chart-helpers.ts, chart-wrapper.tsx,
    │   │   │                      convergence-chart.tsx, landscape-chart.tsx,
    │   │   │                      analytics-panel.tsx (now owns the shared zoom state);
    │   │   │                      use-follow-current-step.ts (NEW Phase 8 — pure
    │   │   │                      computeFollowRange for the auto-scroll dataZoom)
    │   │   ├── site-nav.tsx    ← Phase 5 persistent top nav + global theme toggle
    │   │   └── theme-provider.tsx
    │   ├── hooks/               ← useSimulationDriver (the app's only timer),
    │   │                          useKeyboardShortcuts (Phase 5, page-scoped keydown),
    │   │                          useUrlConfigSync (Phase 6, URL ⇆ store bridge)
    │   ├── lib/
    │   │   ├── engine/         ← ★ pure algorithm core (zero React deps)
    │   │   ├── strategy-info.ts← Phase 5 shared strategy/policy metadata
    │   │   │                      (Phase 9: `tag` field dropped — descriptions only)
    │   │   ├── url-state.ts    ← Phase 6 pure URL ⇆ config schema (nuqs parsers, clamping)
    │   │   ├── csv-export.ts   ← Phase 6 pure RFC-4180 run-CSV builder
    │   │   ├── clipboard.ts    ← Phase 6 copy helper (navigator.clipboard + fallback)
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

## Testing architecture

- **Unit (Vitest, jsdom, globals)**: 23 suites, **298 tests passing**.
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
  - `src/components/visualizer/__tests__/` — chart-helpers (+610 since
    Phase 7), chart-wrapper (+433), analytics-panel (+149), stats-rail
    (+145, new file), stats-header (+25, mostly moved-out tests),
    config-panel (+25, compact variant), use-follow-current-step (+337,
    new file).
  - Fixtures are machine-harvested — never hand-computed (D-014).
- **Hook tests (RTL)**: `src/hooks/__tests__/useSimulationDriver.test.ts` —
  11 tests, `renderHook` + fake timers. Plus
  `useKeyboardShortcuts.test.ts` (8 tests, D-026).
- **E2E (Playwright)**: 7 specs in `./e2e` (smoke, solve-flow, playback,
  theme, navigation, url-state, seo) + shared `fixtures/test.ts` that
  waits for `<Suspense>` hydration. Targets the production build via
  `npm run start`; one-time `npx playwright install chromium` documented
  in `e2e/README.md`. Single `chromium` project, `retries: 2 in CI`,
  traces `on-first-retry`. Smoke and playback specs were updated in
  Phase 9 for the new DOM (StatsRail aside, 10-col home grid).

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

