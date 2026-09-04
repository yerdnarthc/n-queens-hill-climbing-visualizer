# Decision Log — Why did we make these choices?

> Append-only ADR-style entries. Newest at the bottom. Update `Status` if a
> decision is superseded (never delete history).

## Entries

**D-001 · Rebuild instead of patching the legacy prototype** *(Phase 0)*
Why: the prototype was one 787-line HTML file with structural flaws (O(n⁴)
evaluation, max-not-min "Best Score" bug, no determinism, no tests). A clean
rebuild was cheaper than retrofitting invariants. Alternative: incremental
patching of `legacy/index.html`. Status: accepted — legacy kept for reference.

**D-002 · Pure, framework-free engine** *(Phase 1)*
Why: `src/lib/engine` imports zero React/framework code — it is testable in
isolation, fully deterministic, and the UI can lag behind without blocking it.
Status: accepted, enforced by convention (no lint rule yet).

**D-003 · Board = `rows[col] = row`; conflicts = attacking pairs; moves within a column** *(Phase 1)*
Why: one-queen-per-column shrinks the neighbor space to n·(n−1), enables the
O(1) incremental evaluator (row + diagonal occupancy never double-counts pairs),
and gives a clean scalar objective for the landscape charts.

**D-004 · Determinism: seeded mulberry32 RNG as the sole entropy source** *(Phase 1)*
Why: same seed + config ⇒ bit-identical snapshot history — reproducible runs,
shareable URLs, regression-testable behavior, bug reports carry exact seeds.
Alternative rejected: `Math.random` (the legacy approach).

**D-005 · O(1) incremental evaluator + brute-force oracle + fuzz tests** *(Phase 1)*
Why: the legacy O(n⁴) per-step re-evaluation was the main performance sin. The
pair-scan oracle (and randomized equivalence tests) guarantee the fast path
stays correct. Status: accepted — 13 evaluator tests incl. fuzz.

**D-006 · Policies live in the orchestrator, not strategies** *(Phase 1)*
Why: sideways-streak budgets and random restarts are orthogonal to move
selection; implementing them once in `simulation.ts` (config knobs) keeps all
five strategies minimal and the behavior uniformly tested. Alternative
rejected: baking policy into each strategy (5× duplication, drift risk).

**D-007 · Immutable snapshot history per event** *(Phase 1)*
Why: time-travel scrubbing, convergence charts, and the landscape view all need
point-in-time data. A `Snapshot` per event (initial / accepted move / restart)
is cheap (n ≤ 64 ints) and makes the whole run a value — storable, comparable,
exportable.

**D-008 · `bestConflicts` is tracked as a MIN** *(Phase 1)*
Why: fixes the legacy "Best Score" bug, which recorded the maximum. Semantics:
fewest conflicts ever seen + the first step it occurred (`bestStep`).

**D-009 · SA design: cool per proposal, internal accept loop, exempt from sideways budget, `frozen` status** *(Phase 1)*
Why: textbook Metropolis + geometric cooling after *every* proposal (accepted
or not) keeps the RNG consumption order fixed. Temperature — not a
shoulder-streak heuristic — governs annealing's exploration. `saMinTemp > 0`
keeps the proposal loop finite. Restart-on-freeze reuses the shared restart policy.

**D-010 · Min-conflicts never accepts a worsening move** *(Phase 1)*
Why: deviates from the textbook variant deliberately, to preserve the
hill-climbing termination invariants the landscape charts rely on. Documented
in the strategy's header comment. Trade-off: single-queen scope can report
"stuck" when another queen still has a move — random restarts compensate.

**D-011 · UI clamps the board to 4–16; engine accepts 1–64** *(Phase 1)*
Why: 4 is the smallest solvable-with-interest board; 16 keeps layout/animation
sane while the engine stays general (tests use tiny boards via `initialRows`).

**D-012 · Frontend stack: Next.js 15 App Router + Turbopack, Tailwind v4 CSS-first, shadcn/ui (new-york), Zustand, ECharts, nuqs, Framer Motion** *(Phase 0)*
Why: Vercel-zero-config deployment; ECharts chosen for large series + zoom
(needed for long runs); Zustand over Redux (minimal boilerplate around a
simulation timeline); nuqs for typed shareable URL state. Zustand/ECharts/nuqs
are installed; Zustand integration landed in Phase 2, ECharts/nuqs pending.
Status: accepted, phased.

**D-013 · Midnight Lab dark-first theme + one semantic color per landscape concept** *(Phase 0)*
Why: the same color means the same thing across board, charts, legend, and
status badges (`--feature-*` tokens with light+dark variants) — educational
clarity beats decoration. Status: accepted.

**D-014 · Machine-harvested test fixtures only** *(Phase 1)*
Why: hand-computed conflict numbers rot. Expected values are generated from
the brute-force oracle or actual verified runs. Status: accepted — 81 tests.

**D-015 · Fail-fast evaluator assertion in the orchestrator** *(Phase 1)*
Why: `runSimulation` throws if a strategy's predicted Δ conflicts with the
applied Δ — catching drift immediately beats silently rendering wrong charts.

**D-016 · Docs memory system lives at the workspace root, outside the git repo** *(2026-08-31)*
Why: its primary consumer is the AI agent in new tasks, which open at the
workspace root (`N-Queens Visualizer/`); it must survive repo re-cloning or
re-creation. Trade-off: it is not version-controlled. Alternative considered:
`n-queens-visualizer/docs/` (versioned, but easier to miss and couples memory
to app commits). Status: accepted — revisit if the user wants it committed;
content is fully portable.

**D-017 · Precompute-then-time-travel store** *(Phase 2)*
Why: `runSimulation` is a pure batch function that already returns the full
snapshot history, so the store runs the engine **once per config change** and
keeps the finished `SimulationResult`; playback is just a `currentStep` cursor
into the immutable `snapshots[]`. Stepping is O(1), scrubbing is free, and the
Phase 4 charts get the whole series up front. Alternative rejected: driving
the engine incrementally per tick (stateful, hard to test, no random scrub).

**D-018 · Vanilla store factory + React boundary** *(Phase 2)*
Why: `createSimulationStore()` in `simulation-store.ts` builds a React-free
`zustand/vanilla` store — the 31 headless `getState()` tests need no React
tree, and non-React consumers can use isolated instances. The app singleton +
`useSimulationStore(selector)` React binding live only in `src/store/index.ts`.

**D-019 · Locked playback semantics** *(Phase 2)*
Why: (a) any config change auto-reruns immediately and **preserves
`isPlaying`**, restarting the new run at step 0 — tweaking N mid-demo never
dead-ends the session; (b) `play()` at the end replays from step 0; (c)
`stepForward()` at the end auto-pauses — the single "run finished" signal the
driver and UI react to; (d) speed = steps/second, clamped 0.5–30, default 2;
(e) first-load config = N 8, steepest-ascent, seed 27 (machine-curated: solves
in 5 steps with one shoulder — compact but interesting).

**D-020 · The only timer lives in `useSimulationDriver`, not the store** *(Phase 2)*
Why: keeps the store headless/SSR-safe and the driver trivially fake-timer
testable (11 tests). The interval is recreated on `isPlaying`/`speed` changes;
the store's auto-pause-at-end makes it self-terminating, so the driver never
needs to know run lengths. On mount it bootstraps the initial run if absent.

**D-021 · `newSeed()` draws entropy at the UI level only** *(Phase 2)*
Why: fresh runs need unpredictable seeds, but the ENGINE must stay
deterministic (D-004). `newSeed` picks `Math.random()`-sourced uint32s into
the config; the engine itself still only ever consumes its seeded mulberry32.

**D-022 · Phase 3 Component Architecture & Per-Queen Conflict Diagnostics** *(Phase 3)*
Why: The interactive visualizer needs real-time board rendering with queen conflict indicators and last-move origins. Computing per-queen conflict counts at render time via `createConflicts(board).queenConflicts(col)` provides O(n) live counts for all queens without polluting the immutable `Snapshot` type. Status: accepted.

**D-023 · Jsdom Test Setup Mocks for Radix UI Primitives** *(Phase 3)*
Why: Radix Slider and Select primitives rely on browser `ResizeObserver` and `matchMedia`. Adding standard mocks in `src/test/setup.ts` allows full RTL component testing in Vitest without requiring full browser engines. Status: accepted.

**D-024 · ECharts updates via merge mode + stable click handler** *(Phase 4, bugfix)*
Why: `ChartWrapper` (`src/components/visualizer/chart-wrapper.tsx`) previously called
`setOption(option, { notMerge: true })` on every effect run. With `notMerge: true`,
ECharts disposes old series data and rebuilds it; a mousemove/click arriving during
that window made `getDataParams()` call `getData()` on a disposed series, throwing
`Cannot read properties of undefined (reading 'getRawIndex')` (apache/echarts#21535).
Fix: switch to merge mode (`notMerge: false`, `lazyUpdate: true`) and register the
ECharts `click` handler once on init, reading the latest `onPointClick` from a ref
(`onPointClickRef`) so the effect no longer re-runs when only the callback reference
changes. Trade-off: merge mode is the ECharts-recommended path for frequent data
updates; covered by `__tests__/chart-wrapper.test.tsx` (7 tests). Status: accepted.

**D-025 · Chart theme colors tracked via MutationObserver, not render-time reads** *(Phase 4, bugfix)*
Why: `useChartThemeColors` read `getComputedStyle(...).getPropertyValue('--chart-grid')`
during render. `next-themes` (`attribute="class"`) flips the `dark`/`light` class on
`<html>` in a post-render effect that runs AFTER child effects, so the render-time read
captured the PREVIOUS theme's CSS variables — ECharts grid/axis colors stayed stale
until a tab switch remounted the chart. Fix: seed colors from `resolvedTheme` on first
render, then recompute in a `MutationObserver` on `<html>.class` (fires after the class
actually changes) and push the new `PhaseColors` through React state → new option →
`setOption`. Kept reading CSS vars (not just the hardcoded defaults) because several
tokens differ between `globals.css` and `DEFAULT_*_COLORS` (e.g. light
`--muted-foreground: #475569` vs fallback `#94a3b8`). Covered by
`__tests__/use-chart-theme-colors.test.tsx` (4 tests). Status: accepted.

**D-026 · Keyboard shortcuts live in a page-scoped hook with input & modifier guards** *(Phase 5)*
Why: `useKeyboardShortcuts` (`src/hooks/useKeyboardShortcuts.ts`) follows the
`useSimulationDriver` pattern — optional `store` param defaulting to the app
singleton, so tests use isolated `createSimulationStore()` instances. Space →
`togglePlay()`, ←/→ → `stepBack()`/`stepForward()`, R → `run()`. It is mounted
only in `src/app/page.tsx` (next to the driver), NOT in the layout — the
`/how-it-works` page must not capture playback keys. Guards: events from
`input`/`textarea`/`select`/`contenteditable` targets and Radix Slider handles
(`[data-slot="slider"]` subtree) are ignored, as are any with
ctrl/meta/alt held, so browser & OS shortcuts always win. `preventDefault` is
applied to Space/arrows to stop page scroll and focused-button re-firing.
Adds a `keydown` listener, not a timer — D-020's "only timer" invariant intact.
Covered by `src/hooks/__tests__/useKeyboardShortcuts.test.ts` (8 tests).
Status: accepted.

**D-027 · Strategy/policy metadata is shared, framework-free data (`src/lib/strategy-info.ts`)** *(Phase 5)*
Why: `STRATEGY_INFO` previously lived inside `config-panel.tsx`; the
`/how-it-works` page needed the same content, and duplicating descriptions
would drift. Extracted to a type-only-importing module (engine purity by
construction) alongside new `POLICY_INFO` for the orchestrator-owned sideways &
restart policies (D-006). Both `config-panel.tsx` and `/how-it-works` consume
it. Covered by `src/lib/__tests__/strategy-info.test.ts` (asserts coverage of
exactly `STRATEGY_IDS`). Status: accepted.

**D-028 · Persistent SiteNav with global theme toggle; `/how-it-works` is a static server component** *(Phase 5)*
Why: the new educational page must be reachable, so `src/components/site-nav.tsx`
renders a persistent top nav (Visualizer ↔ How It Works, `usePathname` active
state) in `layout.tsx`, and the theme toggle moved there from `stats-header.tsx`
— theme is a site-wide concern, and `stats-header` stays purely about run data.
The theme toggle gates on `mounted` to avoid hydration mismatch with
`next-themes`. `/how-it-works/page.tsx` is a **server component** with no store,
driver, or client hooks — it stays fully static (build emits 6 static pages) and
gets `metadata` via the layout title template. Content is the full educational
treatment (objective function, landscape concepts, all 5 strategies + 2
policies, determinism) per the user's accessibility-first requirement.
Status: accepted.

**D-029 · Fonts are self-hosted via `next/font/local`, not `next/font/google`** *(2026-09-01, fix)*
Why: `next/font/google` issues a build/runtime request to
`fonts.googleapis.com` for Geist & Geist Mono, which failed hard offline
("There was an issue establishing a connection…") — blocking `npm run build`
and dev with no network. Fix: the exact Geist/Geist Mono **variable TTFs**
(normal + italic, `weight: '100 900'`) live in `src/assets/fonts/` and are
loaded via `next/font/local` in `layout.tsx`, keeping the same
`--font-sora-sans` / `--font-chivo-mono` CSS variable names so `globals.css`
and all token consumers are unchanged. Verified: `npm run build` passes with
zero `fonts.googleapis` references in `.next`, the four TTFs are emitted into
`.next/static`, and the suite stays 181/181. Trade-off: TTFs (~700 KB total)
are committed to the repo; woff2 would be smaller if size ever matters.
Status: accepted.

**D-030 · URL is a clamped projection of the store config, not a second store** *(Phase 6)*
Why: `src/lib/url-state.ts` is a PURE, React-free module: a typed nuqs schema
(`n`, `seed`, `strategy`, `sideways`, `streak`, `restarts`, `maxRestarts`,
`cooling`) with `createLoader`/`createSerializer`, reusing the store's clamps
(`clampBoardSize`, `clampSeed`) plus a `clampCooling` guard — critical because
the engine's `resolveConfig` THROWS on `saCoolingRate ∉ (0,1)`, so a hostile
URL must never reach it. `useUrlConfigSync` (mounted in `page.tsx` BEFORE
`useSimulationDriver`, so effect ordering keeps plain loads single-run) makes
the store the sole source of truth (D-017/D-018): URL → store on mount and on
external URL changes; store → URL on config changes with
`history: 'replace'` (no history spam while dragging sliders) and
`clearOnDefault` (defaults omitted → short URLs like
`/?n=12&seed=42&strategy=min-conflicts`). A `lastPushedRef` query-string guard
broke the echo loop *(superseded by D-033 — see there)*; `sameUrlConfig` fills
policy defaults on both sides so an empty URL no-ops against the sparse
`DEFAULT_CONFIG`. The page is wrapped
in a Suspense boundary because nuqs uses `useSearchParams()`, which Next.js
requires for static prerendering (the SSR HTML becomes the fallback).
Playback state (speed, cursor) is deliberately NOT shared — a URL reproduces
the run, not someone's scrub position. Status: accepted.

**D-031 · CSV export: pure tabular builder, config lives in the filename** *(Phase 6)*
Why: `src/lib/csv-export.ts` builds an RFC-4180 CSV (CRLF, quote-escaping,
empty cells for null moves/temperature) with one row per snapshot — directly
honoring D-007's "storable, comparable, exportable". The run config is encoded
in the FILENAME (`nqueens_N8_seed27_steepest-ascent.csv`) instead of
`#`-comment preamble lines, so the output parses cleanly in pandas/Excel.
`downloadRunCsv` is the only DOM-touching piece (Blob + object-URL click); the
button lives in the AnalyticsPanel header and is disabled without a result.
Tests are machine-harvested from the seed-27 default run (D-014).
Status: accepted.

**D-032 · Polish bundle: share button, reduced motion, SEO metadata, robots/sitemap** *(Phase 6)*
Why: (a) "Copy share link" in the ConfigPanel header pairs with D-030 —
`src/lib/clipboard.ts` falls back from `navigator.clipboard` to a hidden
`execCommand('copy')` textarea for insecure contexts/jsdom; (b)
`prefers-reduced-motion` disables queen layout springs (framer-motion
`useReducedMotion`) and decorative `animate-pulse` glows (`motion-safe:`
variants) — educational content must not motion-sicken users; (c) fixed the
leftover "six algorithm variants" wording in `layout.tsx` metadata
(`description` + `openGraph`) that the Phase 5 README fix missed; (d) footer
now cross-links `/how-it-works`; (e) `robots.ts` + `sitemap.ts` emit static
`/robots.txt` + `/sitemap.xml` (8 build routes) with the origin from
`NEXT_PUBLIC_SITE_URL` (localhost fallback documented in PROGRESS.md
housekeeping). Status: accepted.

**D-033 · URL⇆store bridge: mount-only hydration + single post-mount URL writer** *(2026-09-02, fix)*
Why: the D-030 two-effect bridge looped in the browser — scrubbing ANY slider
(Board Size, Max Plateau Streak, Cooling Rate, …) crashed with React
"Maximum update depth exceeded" (dev and prod, `throttleMs`-independent).
Root cause: nuqs's URL writes are throttled while the Next router's
`useSearchParams` syncs asynchronously, so nuqs's reconciler can flip
`values` back to a STALE URL snapshot right after a flush. With two effects
guarded by a shared `lastPushedRef` that each overwrote with
one-render-stale closures, that revert became an infinite
`setConfig ⇄ setValues` ping-pong (each write invalidated the other's guard
one render behind). Fix in `useUrlConfigSync`: (a) URL → store is
MOUNT-ONLY hydration plus healing of non-canonical params (hostile/clamped
URLs like `?n=99` are rewritten to `n=16` via the new pure
`sameUrlValues` comparator in `url-state.ts` — the URL can never disagree
with the clamped config the store holds); (b) store → URL is the ONLY
post-mount writer, guarded by pure content comparison
(`sameUrlConfig(config, urlValuesToConfig(values))`), no shared mutable ref,
so a stale revert is corrected in one pass and cannot oscillate. Trade-off:
manually editing the query string mid-session no longer mutates the store
(share links still hydrate fully on load; `history: 'replace'` means no
back/forward entries exist to sync). jsdom tests can't reproduce the loop
(nuqs's testing adapter is synchronous), so regression tests pin the
contract instead: hostile-URL healing converges in exactly one write, and a
scrub burst produces bounded writes with no echo. +3 tests → **207/207
passing**, typecheck & lint clean. Status: accepted.

## Open questions

- ~~README says "**six** variants" but `STRATEGY_IDS` has **5 strategies** + 2
  policies (sideways, restarts)~~ **resolved** in Phase 5: README feature list
  now reads "Five hill-climbing strategies + two policies" (commit `64a68d0`).
- ~~No git remote yet; README targets Vercel. When/where to push?~~ **resolved**:
  `origin → github.com/yerdnarthc/n-queens-hill-climbing-visualizer`, `master`
  pushed and synced at `45fdea0`.
- ~~Stray `package-lock.json` at the workspace root~~ **resolved**: the user
  renamed its package name to "N-Queens Visualizer" — kept intentionally.

---

## Entries added in the 2026-09-02 → 2026-09-04 audit (commits `71c6581..41a0603`)

**D-034 · Chart dataZoom: inside + slider, X-axis only, runKey-tagged** *(2026-09-02)*
Why: a time-series chart for a long simulation run needs to let the user focus
on a window of steps without losing the global view. `buildDataZoomConfig` in
`chart-helpers.ts` returns two stacked ECharts `dataZoom` entries — an `inside`
(wheel + pinch, no UI) and a `slider` (a drag-handle bar at the bottom, the
discoverable affordance). Both are pinned to `xAxisIndex: 0` with
`zoomLock: true` and `filterMode: 'filter'`, so a trackpad gesture can never
rescale the conflict (Y) domain — the user's mental model is "scroll left/
right through time", not "zoom the whole surface". The `zoomRange` is
**runKey-tagged** with `result.totalSteps`: same seed ⇒ same totalSteps ⇒
preserved window; different seed ⇒ reset. Alternative considered: persist
the range to `localStorage` — rejected because (a) the run's totalSteps
already encodes whether the window is still meaningful, and (b) the user's
URL is the only persistence surface that survives a share (D-030). Status:
accepted — covered by chart-helpers tests (+220) and chart-wrapper tests
(+136).

**D-035 · Click-in-the-gaps on the Landscape scatter uses the cached axisPointer** *(2026-09-02)*
Why: ECharts only fires `dataIndex` on a click when the cursor lands on a
series element. The Landscape chart's scatter series had a UX gap — clicking
in the empty space between markers did nothing, even though the user's
intent ("scrub to here") was obvious from the axisPointer line. Fix:
`ChartWrapper` subscribes to `updateAxisPointer` once at init, caches
`lastAxisPointerValueRef.current` as the user moves the cursor, and the
click handler falls back to that value when neither `dataIndex` nor
`value[0]` resolves. Convergence's line series also benefits — it switches
to per-point `value: [step, conflicts]` data items with phase-specific
`symbol` (star = solved, triangle = restart, diamond = shoulder, circle
otherwise) and a 2px border + 8px shadow on the current step, so the two
charts read as a coherent pair. Alternative considered: re-render the
chart on every mousemove to query `convertFromPixel` — rejected (a
re-render per frame is exactly the lag we're trying to avoid). Status:
accepted — +204 chart-helpers tests, +137 chart-wrapper tests.

**D-036 · Lifting zoom state to `AnalyticsPanel` so it survives Radix Tabs unmount** *(2026-09-02)*
Why: D-034's per-chart `zoomRange` lived in `useState` on each chart
component. Radix Tabs unmounts the inactive tab's content by default, so
toggling Convergence ↔ Landscape reset the zoom window every time. The
smallest viable fix is to **lift the state to `AnalyticsPanel`** (which
never unmounts) and pass `zoomRange` + `onZoomChange` down as controlled
props — the charts become dumb. Alternatives considered: a Zustand slice,
React Context, `sessionStorage` persistence. Context adds a provider
hierarchy for one piece of state; Zustand is overkill for tab-local UI;
`sessionStorage` doesn't address the "tab was just unmounted" problem,
only the "page was reloaded" one. The lift is the minimum surface that
fixes the reported UX. Status: accepted — +98 analytics-panel tests.

**D-037 · Pure `computeFollowRange` decides when to auto-scroll the dataZoom** *(2026-09-03)*
Why: at high playback speed the current-step marker can scroll off the
right edge of the visible window faster than the user can react, so the
chart "loses" the cursor. D-037 is a new pure module
(`src/components/visualizer/use-follow-current-step.ts`) exporting
`computeFollowRange({currentStep, firstStep, lastStep, currentStart,
currentEnd}) → {start, end} | null` — returns `null` when no scroll is
needed, otherwise a window that **preserves the user's chosen width**
(we shift, never grow) and places the marker at `TRAILING_FRACTION = 0.7`
when scrolling right (recent context to the left) or `LEADING_FRACTION =
0.3` when scrolling left (steps still ahead). `ChartWrapper` reads it and
fires `dispatchAction` against slider index 1 with `animation: { duration:
50 }` (D-038). The pure function is the testable contract (337 tests);
the wrapper is the DOM-touching caller. Status: accepted.

**D-038 · Animation profile tuned for "scrub, not present": 200/100/50ms** *(2026-09-03)*
Why: ECharts' defaults (animationDuration 1000, animationDurationUpdate
300, cubicOut easing) are tuned for **presentation** charts. For an
interactive playback scrubber, 300ms cubicOut is perceptible lag — the
state IS the visual, nothing to ease toward. Decision: both chart options
now set `animationDuration: 200` (short initial draw so the chart still
feels alive), `animationDurationUpdate: 100` (snappy but not jarring),
`animationEasingUpdate: 'cubicOut'` (defensive; matters only if duration
is bumped), and `animationThreshold: 200` (consistent profile across
short and long runs). MarkLines (the "you are here" cursor) and the
auto-scroll dispatchAction get an explicit `animation: { duration: 50 }`
override so they **snap** to the new state. Line width 2 → 1; current-step
label size 10 → 11 + bold. Trade-off: a true zero-duration update looks
mechanical; 100ms is the perceptual floor. Status: accepted — +94
chart-helpers tests.

**D-039 · Strategy tags removed; warm-sand/oxblood palette baseline** *(2026-09-03)*
Why: the per-strategy `tag` field in `src/lib/strategy-info.ts` (e.g.
"Greedy Best", "Metropolis Cooling") was redundant with the `description`
text and noisy in the ConfigPanel / `/how-it-works` lists. The whole
field is dropped from the type and every entry; both consumers empty the
pill in place. In the same commit, `globals.css` retunes the palette:
light page background `#ececea` → warm-sand ramp (cream / sand / stone /
taupe); dark background `#101116` → oxblood/ink. Phase-color tokens are
rebalanced one step brighter on dark (improving 400→300, conflict 400→
300, global-max 400→300) and one step darker on light (improving 600→
700, global-max 600→700) so the same colour reads with the same
intensity on either background. Charts adopt the new warm-tint palette
via `DEFAULT_DARK_COLORS` / `DEFAULT_LIGHT_COLORS`. The "Midnight Lab"
name (D-013) is now retired — replaced with two named ramps. Status:
accepted.

**D-040 · StatsHeader split into a slim header + a reusable `StatsRail` with three variants** *(2026-09-04)*
Why: `StatsHeader` had grown to 209 lines because it had to render the
metric cards in two layouts (header strip + chessboard-aside). Split into
a slim header (page-level summary) and a new
`src/components/visualizer/stats-rail.tsx` (the metric-card renderer) with
three variants: `compact` (horizontal scrollable strip on `<lg`),
`rail` (vertical aside on `lg+`, 4/15 of the chessboard-card width), and
`context` (full-width 2×2 grid + 1 hero Run-Status tile, used in the
home right column below `AnalyticsPanel`). The variants share one
component, one selector set, and one set of status-meta mappings — no
duplication, no drift. `HomeContent`'s main grid switches from 12-col to
10-col to tighten alignment between the board column (7) and the right
column (3). Status: accepted — +92 stats-rail tests, +25 stats-header
tests (mostly deletion of moved tests); `e2e/smoke.spec.ts` and
`e2e/playback.spec.ts` updated for the new DOM.

**D-041 · Semantic color tokens (`bg-global-max`, `bg-conflict`, …) wired to CSS vars; Next 16 + ESLint flat-config migration** *(2026-09-04)*
Why: every consumer was hardcoding palette classes
(`bg-emerald-600`, `text-rose-500`, `ring-sky-300`) which made a palette
change a 30-file search-and-replace. Now `globals.css` exposes
**semantic Tailwind tokens** (`bg-global-max`, `bg-local-max`,
`bg-conflict`, `bg-improving`, `bg-shoulder`, `bg-worsening`,
`bg-restart`, plus `*-deep` shades for gradient bottoms) wired to
`--feature-*` and `--feature-*-deep` CSS vars. The warm-sand / oxblood
palette of D-039 fills those vars; flipping a theme just rebuilds the
var map. Two exceptions are kept on purpose: (a) `chessboard.tsx`'s
solved-wrapper keeps the literal `border-emerald-500/80 ring-4` classes
because `e2e/solve-flow.spec.ts` matches that class — documented
inline; (b) the warm-wood chessboard square colours (`--board-light:
#f0d9b5`, `--board-dark: #b58863`) stay constant across themes. The
refactor also migrates the project to **Next 16.3.4** and rewrites
`eslint.config.mjs` to import `eslint-config-next@16`'s native flat
config directly — bypassing the `FlatCompat` legacy bridge, which routes
config through `ConfigValidator.formatErrors() → JSON.stringify`, and
modern plugin instances carry circular back-references that crash
"Converting circular structure to JSON" (eslint#20237 / next#85244).
`@eslint/eslintrc` dev-dep removed. `tsconfig.json`: `jsx: "preserve"`
→ `"react-jsx"` (Next 16's typecheck requires it), `include` adds
`.next/dev/types/**/*.ts`, `incremental: true`. The `site-nav` `setMounted`
hydration effect gets an `eslint-disable-next-line react-hooks/
set-state-in-effect` — the canonical next-themes pattern that the new
rule doesn't yet understand. Trade-off: a future palette swap is now
one file (`globals.css`); losing the literal class also means e2e
selectors on theme colours would need to switch to data-attrs if they
ever need to test colour identity. Status: accepted.

**D-042 · SiteNav/StatsHeader backgrounds bumped to `bg-card` / `bg-card/60` for legibility on the new warm palette** *(2026-09-04)*
Why: the Phase-7 translucent surfaces (`bg-background/80`, `bg-card/40`)
washed out on the new warm-sand/oxblood backgrounds — the sticky nav
read as a smudge and the header read as a barely-there bar. Bumped to
solid `bg-card` and `bg-card/60` respectively for legibility. Status:
accepted — pushed to `origin/master` in `41a0603`.

**D-043 · Memory-bank moved into the repo and renamed from `docs/` to `memory-bank/`** *(2026-09-04)*
Why: D-016 originally placed the memory system at the workspace root
(`N-Queens Visualizer/docs/`), outside the git repo, on the theory that it
"must survive repo re-cloning or re-creation" and to keep the agent's
read-first path decoupled from app commits. In practice, the memory bank
has become tightly coupled to the SHAs it describes (the audit it
records is dated by commit), so unversioned memory caused the stale
state the 2026-09-04 audit had to fix (`41a0603` was locally flagged as
"pending push" even though it had shipped; `origin/master` was listed as
`7b775da` two commits behind). Versioning the memory bank gives diff
reviewability on doc changes, SHAs that always match the local checkout,
and the same "survive re-clone" property (just `git pull`). Commits
`577f2eb` (move `docs/` into the repo) and `c9f500d` (rename to
`memory-bank/`) ship the change; the name `memory-bank/` is preferred
over `docs/` because it signals the folder's role rather than its
position. Status: accepted — supersedes D-016 in spirit (D-016 left in
the log for history; its "outside the repo" reasoning is now retired).

**D-044 · Kinetic Queen move animation overhaul (speed-aware duration, overshoot, lift, shadow grow, origin echo, trajectory line)** *(2026-09-05)*
Why: the pre-Phase-10 animation was a single fixed-duration spring
(`stiffness: 450, damping: 32` in `queen-piece.tsx`) that ran at the
same ~280ms regardless of playback speed. At 0.5× the per-step interval
is 2000ms — the spring was 7× faster than the step, so the queen settled
invisible long before the next move fired. At 10×–30× the step is
33–100ms — the spring was 3–8× slower than the step, so a new move fired
while the previous queen was still mid-flight and they visually piled
up. The motion was decoupled from the playback clock. The user's
self-described pain point was: "I really can't keep track of where the
queen will move from that place to another."

The fix is a three-commit overhaul (Commits #1–#3 of Phase 10, SHAs
`e59f548`, `025eb0e`, `1bb1ebb`):

1. **Speed-aware duration** via a new pure helper
   `computeStepDuration(speed, reducedMotion?)` in
   `src/lib/animation-timings.ts`. Formula: 60% of the per-step
   interval, clamped to `[50ms, 400ms]`. At 0.5× and 1× the queen
   always gets the MAX (400ms — a graceful arc); at 2× the natural
   300ms; at 5× a snappy 120ms; at 20× and 30× the MIN-clamped 50ms
   (a blink-and-miss-it snap). Returns 0 under reduced motion to
   match the existing D-032 short-circuit. Defensive fallbacks for
   NaN/0/Infinity/negative inputs (all → 400ms — the slowest natural
   feel, never a `Math` error explosion).
2. **Trajectory line** via a new `MoveTrajectory` SVG component. A
   thin vertical line is drawn from the origin square to the
   destination square during each move, using `stroke-dasharray` +
   `stroke-dashoffset` to "draw itself" from origin to destination
   over the move duration (`@keyframes trajectory-draw` in
   `globals.css`, using the same overshoot cubic-bezier as the queen
   so they arrive together). Reads the grid's live bounding rect via
   `useLayoutEffect` + `ResizeObserver` so the line follows the
   board on resize. Reduced-motion users get a static line; the
   existing `prefers-reduced-motion` media query in `globals.css`
   also collapses the CSS animation to 0.01ms automatically.
3. **Kinetic QueenPiece** + **OriginEcho** (new). The spring
   transition is replaced with a duration-based tween using the
   overshoot ease `[0.2, 0.9, 0.3, 1.2]` (gentle lift-off, ~20%
   overshoot past the destination, then settle). A `useAnimate`-
   driven scale pulse (`scale: [1, 1.15, 1]`) gives the queen a
   "lift" at the start of the move and a "land-with-settle" at the
   end. A second `useAnimate` call grows the queen's `boxShadow`
   from `shadow-md` to `shadow-lg` and back over the same duration
   — the depth cue makes the moving queen read as "above" the
   board. Both animations re-fire on every `(column, row)` change
   via a `useEffect`; `useAnimate` cancels in-flight animations
   automatically, so a fast next-step cleanly overrides the
   previous pulse. The new `OriginEcho` is an expanding-ring
   "departure pulse" rendered on the square the queen just left
   (replaces the pre-Phase-10 static dashed circle with
   `animate-pulse`, which was an always-on pulse, not a per-move
   trigger). Scales 1 → 1.4 and fades 1 → 0 over the move
   duration; re-keys on `(column, fromRow, toRow)` so every new
   move re-mounts and replays the animation. Reduced-motion users
   get a static dashed ring.

The design choice is **"Option B / kinetic"** (overshoot + lift +
shadow grow + trajectory line + origin echo) rather than "subtle"
(just the speed-aware duration) or "schematic" (a teleport-and-
redraw with no movement). The user's stated priority was "polished,
production-ready, and smooth" with consistent feel across all speeds
— kinetic makes the move feel like a physical object being placed
on a new square, with the from-to direction unmistakable.

Engine purity rule (D-002) extends naturally: `animation-timings.ts`
imports zero React/framework code. The visualizer-side
`data-testid`s used by the Playwright e2e suite (`chessboard-grid`,
`square-{col}-{row}`, `queen-{col}-{row}`) are preserved. New
`data-testid`s (`move-trajectory`, `origin-echo`) are additive
only. Engine, store, types, and driver are untouched.

The cubic-bezier `[0.2, 0.9, 0.3, 1.2]` is the single tuning knob
if the overshoot needs to be more/less pronounced — drop 1.2 to 1.1
for less overshoot, to 1.0 for none. Same curve is used by the
trajectory line, so they stay in lockstep. +29 unit tests (13
animation-timings, 4 move-trajectory, 7 queen-piece, 5
origin-echo). Validation: typecheck clean, lint clean
(prettier+eslint clean in pre-commit hook on all 3 commits), 327/327
unit tests passing across 27 suites (was 298/298 across 23 suites
pre-Phase-10), production build clean (5 static routes). Status:
accepted.

