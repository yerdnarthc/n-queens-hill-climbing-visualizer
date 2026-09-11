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

**D-045 · Cline → OpenCode migration: rules move to `AGENTS.md`, vendored skills excluded from quality gates** *(2026-09-05, tooling)*
Why: the user's agentic workflow moved from VS Code + Cline to OpenCode,
which reads `AGENTS.md` (repo root + `~/.config/opencode/`) instead of
`.clinerules/`. So `.clinerules/memory-bank.md` +
`.clinerules/nextjs-conventions.md` were deleted and their content
preserved in a new root `AGENTS.md` (verified via `git diff`: the new
file is the concatenation of the two deleted ones — a pure move, no
rule changes). In the same change, six project-specific skills were
added under `.agents/skills/` with a `skills-lock.json` pin file
(motion-advanced/foundations/patterns from `affaan-m/ecc`,
next-best-practices from `vercel-labs/openreview`, typescript-expert
from `sickn33/agentic-awesome-skills`, vercel-react-best-practices from
`vercel-labs/agent-skills`).

The first commit attempt failed in the Husky/lint-staged pre-commit
hook: `eslint --fix` runs on every staged `*.ts` file, and the
vendored `typescript-expert/references/utility-types.ts` uses explicit
`any` throughout (it is a third-party reference sheet demonstrating
utility types, so `any` is intentional there) — 11
`@typescript-eslint/no-explicit-any` errors against the project's
no-`any` rule. Alternatives considered: (a) editing the vendored file
to satisfy the rule — rejected, it would diverge from upstream on
every skill update; (b) `git commit --no-verify` — rejected, it
bypasses the gate once but leaves `npm run lint` broken on every
future run. Decision: treat `.agents/` as vendored third-party code
and exclude it everywhere project source is checked —
`eslint.config.mjs` `ignores` += `.agents/**`, `.prettierignore` +=
`.agents`, `tsconfig.json` `exclude` += `.agents` (the `include` is
`**/*.ts`, so skill reference `.ts` files would otherwise be
typechecked too). Same rationale as the existing
`node_modules`/`e2e/`/`legacy/` ignores. Status: accepted — commit
`04e0cb4`; `npm run lint` + `npm run typecheck` clean.

**D-046 · Motion migration + explicit x/y queen travel with arc, ghost echo redesign, playback-gated duration** *(Phase 11 | 2026-09-06)*
Why: Phase 10 (D-044) stopped the speed-decoupling but the queen still
read as teleporting — scale/shadow pulse plus a CSS dash line, with no
authored point-A→point-B travel. Root cause: `motion.div layout`
FLIP-measured an implicit box delta after React re-parented the queen
into another square's div. That violates the vendored motion skills
(`motion-foundations` Rule 4: transform + opacity only, never layout;
`motion-patterns` Rule 4: never `layout` on subtrees > ~5 children —
the board is up to 256 cells) and cost a full-grid measurement per step.

The fix, in commit `0887221`:

1. **Package migration.** `framer-motion@13` → `motion@13.2.0`;
   `queen-piece.tsx` / `origin-echo.tsx` import from `motion/react`
   (skills Rule 1). No other file imported framer-motion (verified by
   grep). All animation numbers centralize in new
   `src/lib/motion-tokens.ts` (durations, easings incl. the shared
   `overshoot` token, `QUEEN_STEPPER_MS = 220`,
   `QUEEN_ARC_LIFT_PX = 12`, `ORIGIN_ECHO_DURATION_MULTIPLIER = 2`,
   shadow strings, `easeForTravel` helper) per skills Rules 5–6.
   Deliberate deviation, documented in code: travel uses a
   duration-driven TWEEN, not a physics spring — a spring cannot lock
   to 60% of `1000/speed`, and the playback-clock lock (D-044) is the
   harder requirement.
2. **Explicit travel.** Queens moved out of the square divs into an
   absolute overlay (measured once via the grid's `ResizeObserver`
   rect, shared with all children). Each queen keeps a stable
   `key={col}` (queens never change column) and tweens `x` straight +
   `y` through a mid-flight arc via `useMotionValue` + imperative
   `animate()` (effect-owned, so the `react-hooks/refs` lint rule
   stays satisfied — an earlier keyframes-during-render draft failed
   it and was rewritten). `useAnimate` interruption semantics make
   30× takeovers pile-free. `MoveTrajectory` (CSS dash line) was
   removed per the user — explicit travel makes it redundant
   (component + test + `@keyframes trajectory-draw` deleted; the old
   line's `opacity: 0.85` is recorded here in case it is ever
   restored as a `motion.line`).
3. **Origin echo redesign.** The dashed ring was ~1.2:1 contrast on
   light squares. Now: halo bloom (`ring-2` +
   `ring-offset-background`, 1 → 1.22) + dissolving `Crown` ghost
   (shape, not just color, so it survives colorblindness) + `R{row}`
   corner pill, all on a shared fade. Static twin under reduced
   motion. The echo lingers `ORIGIN_ECHO_DURATION_MULTIPLIER` (2×)
   the travel duration so it stays readable at high speeds.
4. **Playback-gated duration (must-implement design rule).** New
   `useQueenDurationMs(speed)`: playing → `computeStepDuration`
   (50…400 ms); paused/stepping/scrubbing → fixed `QUEEN_STEPPER_MS`
   regardless of configured speed (30× stepping no longer blinks at
   50 ms); reduced motion → 0. Single call site in `Chessboard`;
   queens and echo receive it as props. Also fixed two latent bugs:
   the pulse refired on play-toggle (now gated on actual position
   change) and the trajectory's hard-coded
   `computeStepDuration(speed, false)` ignored reduced motion.
5. **Distance-dependent stiffness, found by the user.** Long flights
   visibly stalled mid-air while short hops were smooth. Two causes:
   (a) the rise ease decayed velocity to ~0 at the arc apex, then the
   fall restarted steep (brake-then-surge); (b) the fixed 20%
   overshoot is 8 px on a hop but 100+ px past the target on a
   12-square flight (stall-and-slam). Fix: `easeIn` rise (accelerates
   through the apex, slopes matched) + `easeForTravel(distanceSquares)`
   fading overshoot 1.2 → 1.0 between 1 and 6 squares.
   `computeStepDuration` itself is untouched (D-002 purity).

Validation: `npm run lint` + `typecheck` clean, **333/333 unit tests
across 28 suites** (−4 trajectory, +1 queen size, +1 echo ghost/label,
+4 duration-gate, +4 easeForTravel), production build clean (5 static
routes), Playwright 25/30 — the 5 failures are strict-mode
duplicate-text violations in StatsRail/StatsHeader specs, proven
pre-existing by rebuilding clean HEAD via `git stash` (same specs
fail without this change). `data-testid`s (`chessboard-grid`,
`square-{col}-{row}`, `queen-{col}-{row}`, `origin-echo`) preserved,
so the e2e selector contract holds. Status: accepted.

**D-047 · "Sideways" renamed to "Plateau" (display only) + first-visit spotlight onboarding tour** *(Phase 12 | 2026-09-06)*
Why: the user watched queens move vertically-only and read "Allow
Sideways Moves" as a spatial promise (X-axis/diagonal motion). It is
not: the engine is the textbook `rows[col] = row` formulation (D-003)
— every strategy emits `{column, toRow}`, so queens can only travel
within their column and diagonal moves cannot exist. "Sideways" is the
AIMA term for a plateau move (Δ = 0), gated per strategy by
`allowSideways && sidewaysStreak < maxConsecutiveSideways`. The fix is
copy, not algorithm: `ConfigPanel` label → "Allow Plateau Moves" with
subtitle "equal-cost moves, not spatial", `POLICY_INFO[0].name` →
"Plateau Moves" (propagates to `/how-it-works`, which renders the
shared metadata), layout metadata + how-it-works prose updated. The
engine field (`allowSideways`), the URL key (`sideways`), and all
engine tests are deliberately UNTOUCHED — renaming them would break
share URLs (D-030 projection) for zero user benefit.

The same confusion motivated a first-visit product tour
(`src/components/visualizer/onboarding-tour.tsx`, mounted in
`page.tsx`, portal to `body`): a rounded-rect spotlight (user's pick)
cuts around each target while four dimmed backdrop panels cover the
rest; clicking empty space advances, Esc/Skip closes, Back goes back,
"Don't show again" opts out forever, and a footer "Replay tour"
button reopens on demand via a `CustomEvent`. Nine step definitions
(board N → variant → seed → plateau → restarts → [SA cooling,
conditional] → board → playback → analytics → stats → share/export);
the chessboard step states the vertical-only/diagonal-never rule
explicitly. Design decisions, all user-confirmed: (a) persistence is
`localStorage` under versioned key `nqueens-tour:v1` — the user's
first instinct was sessionStorage-then-browser-close, but no such
primitive exists (sessionStorage dies with the TAB, localStorage
survives everything; corrected during planning, documented here so it
isn't re-litigated); (b) the tour forces `strategy: 'steepest-ascent'`
on entry and restores the user's strategy + the Advanced collapsible's
open state on exit (auto-opened via trigger click for the policy
steps), leaving zero trace; (c) spotlight cuts instantly while only
the tooltip fades (opacity-only, `motionTokens.duration.fast`) —
motion-foundations Rule 4 bans top/left/width/height in `animate`, and
only the tooltip (not the backdrops) lives in `AnimatePresence`
`mode="wait"` keyed per step, so backdrop testids stay unique and
exactly one tooltip exists at a time.

Two implementation findings worth recording. First, this repo's jsdom
exposes `localStorage`/`sessionStorage` as stub objects WITHOUT the
Storage API (`getItem` undefined) — discovered via probe test, fixed
with an in-memory `MemoryStorage` mock in `src/test/setup.ts`
(D-023 precedent). Second, `AnimatePresence mode="wait"` + a fast
test loop deadlocks on the exiting tooltip's stale closure (every
click re-sets the same step); the walk test awaits each entering
title via `findByText` instead — same hazard exists for frantic
double-clickers in production (180 ms no-op window), accepted as
trivial. E2E impact: fresh Playwright contexts have empty storage, so
the tour WOULD intercept every existing spec's pointer events —
`e2e/fixtures/test.ts` suppresses it via `addInitScript` (URLs
untouched), and new `e2e/tour.spec.ts` (3 tests, base client) covers
first-show, advance, Skip-persists-across-reload, and Replay.

Validation: lint + typecheck clean (two targeted
`set-state-in-effect` disables for the mount-hydration effect and the
canonical SSR `mounted` guard, same exception family as D-041;
the missing-target skip was restructured to rAF-defer instead),
**344/344 unit tests across 29 suites** (+11 tour: 3 placement, 8
behavior incl. strategy force/restore), build clean, Playwright 29/33
— the 4 failures (smoke ×2, solve-flow, url-state) are the same
strict-mode duplicate-text violations, re-proven pre-existing by
rebuilding stashed clean HEAD and rerunning (identical 4 failures).
Status: accepted.

**D-048 · Queen restyle: own flat Staunton glyph, solid discs, crisp halo — no gradients** *(Phase 13 | 2026-09-06)*
Why: the old token was a generic lucide `Crown` icon centered in a
gradient bubble with a blurred, pulsing glow — the textbook AI-slop
look. The `ui-ux-pro-max` skill's style search confirmed the fix
direction (minimalism: "avoid shadows and gradients", flat fills,
high contrast, single accent). New `src/components/visualizer/
queen-glyph.tsx` draws its OWN queen silhouette (45×45 viewBox: five
coronet balls → straight-geometry zigzag crown → collar bar →
tapered stem → base bar, proportions eyeballed against the Cburnett
standard set but no path data copied) in `currentColor`, with two
inner detail lines + a stem jewel stroking a second tone passed as a
Tailwind `stroke-*` class — theme-aware with zero color plumbing, and
`aria-hidden` throughout (state meaning already lives in badges/
labels/rings). The disc goes fully flat: espresso `bg-stone-900`
(normal — the warm-wood squares never change across themes, so one
dark disc reads everywhere) or solid semantic fills
(`bg-conflict`/`bg-improving`) with deeper-shade rings; the blurred
pulse halo becomes a crisp `border-2` ring and goes static (calmer at
30×, reduced-motion-safe by default). `OriginEcho`'s ghost swaps to
the same glyph, detail-less, so the dissolve matches the board.
Animation, travel, badges, testids, and e2e selectors are untouched —
purely a paint change. Verified the custom-token utilities
(`stroke-*-deep`, `ring-*-deep`) actually emit CSS by grepping the
production bundle (Tailwind silently drops unknown classes, so this
was load-bearing). Validation: lint + typecheck clean, **349/349
across 30 suites** (+3 glyph, +2 queen-piece incl. a no-gradients-in-
any-state regression guard), build clean. Status: accepted.

**D-049 · Queen artwork replaced with the nikfrank/react-chess-pieces queen (Cburnett-derived, attributed)** *(Phase 14 | 2026-09-06)*
Why: two restyles in (geometric glyph, Phase 13), the user still
disliked the look and pointed at a concrete reference:
`nikfrank/react-chess-pieces` — a thin wrapper over the Wikimedia
"Chess Pieces Sprite" standard set (Cburnett), CC BY-SA 3.0. Fetched
`src/Q-white.svg` + `src/q-black.svg` raw and confirmed the design is
the classic queen (five balls, zigzag crown, curved body, two collar
lines; white fill + 1.5 black stroke). Decision: INLINE the artwork,
don't add the dependency — one SVG is needed, and a new package for
it would violate the user's no-surprise-dependency rule; the
adaptation (fixed `#fff`/`#000` → `currentColor` fill + Tailwind
`stroke-*` class) is six changed attributes. So `queen-glyph.tsx`
now carries the Q-white crown/body/detail paths + clean ball
`<circle>`s (q-black form), with `detailClassName` renamed to
`strokeClassName` since it now outlines the whole silhouette, not
just details. Call sites: glyph grows 68% → 80% of the disc (real
pieces fill their box), echo ghost passes its own ink as the stroke
for a one-color dissolve. Discs, halo, badges, animation, testids,
and e2e selectors untouched — artwork swap only. Attribution lives in
the component docstring and here (CC BY-SA 3.0, © Cburnett via the
Wikimedia sprite). Validation: lint + typecheck clean, **349/349
across 30 suites** (glyph tests rewritten for the new structure),
build clean; e2e not re-run (no selector/motion/layout touched —
Phase 12's 29/33 stands). Status: accepted.

**D-050 · Queen artwork swapped to the user's own SVG (`src/assets/icons/chess-queen.svg`)** *(Phase 15 | 2026-09-06)*
Why: after two glyph iterations (geometric, then nikfrank/Cburnett),
the user supplied the exact artwork they want — an SVG Repo queen
icon (single solid silhouette: crown with ball tips, collar bar,
base bar, 512 grid). The file lives untracked-added at
`src/assets/icons/chess-queen.svg` and is now versioned with the
repo; `queen-glyph.tsx` inlines its path data (verbatim `d`, only
`fill` retargeted to `currentColor`) instead of importing the file,
so the glyph keeps theming with the token discs and needs no loader.
Consequence of the source having no stroke layer: the
`strokeClassName` prop is deleted (single-tone silhouette now), and
all three call sites simplify to size-only classes — ink inherits
from the disc via `currentColor`. Glyph tests rewritten (one path,
512 viewBox, no strokes/gradients); discs, halo, badges, animation,
testids, and e2e untouched. Validation: lint + typecheck clean,
**349/349 across 30 suites**, build clean; e2e not re-run
(artwork-only, same rationale as D-049). Status: accepted.

**D-051 · Tour tooltip drag uses Motion built-in (`drag` + `dragControls`), no new library** *(2026-09-06)*
Why: the user asked for a silky draggable tooltip "using the most
recommended libraries/approach". `motion/react` (already installed)
IS that approach per the vendored `motion-advanced` skill ("drag
with physics on release"); adding dnd-kit/react-draggable would be a
redundant dependency for one dialog. Pattern: `drag` +
`dragControls` with `dragListener={false}`, started from a root
pointerdown that ignores presses landing on buttons — so button
clicks never become drags and no click-suppression hacks are needed.
Release uses Motion's default inertia (physics beats duration tweens
for direct manipulation); remount-per-step re-anchors the tooltip.
Keyboard users unaffected (drag is pointer-only enhancement).
Validation: lint + typecheck clean, 351/351 (2 new drag tests),
build clean. Status: accepted.

**D-052 · Hard scroll lock during the onboarding tour (`useScrollLock`)** *(2026-09-06)*
Why: two scroll bugs the user hit every run — (a) the spotlight/
tooltip lagged a frame behind fast scrolls (rect → React state →
re-render pipeline can't keep up), and (b) scrolling the target out
of view stranded the spotlight at viewport top because
`measureElement` clamps negative rects to 0. The user's pitch was
right and matches the skill-canonical modal pattern
(`motion-patterns` Rule 6 lists scroll lock alongside role/Escape/
focus-trap — we had 3/4): NEW `src/hooks/useScrollLock.ts` pins the
body (`position: fixed` + negative `top` + `width: 100%`, not just
`overflow: hidden`, so iOS rubber-banding and scrollbar-shift die
too) while `open`, restoring inline styles + exact `scrollY` on
close (Esc path included). The tour's own `scrollIntoView` calls
(block flipped `'nearest'` → `'center'` for deterministic placement)
stay the single scroll authority; tooltip drag is transform-only so
the lock doesn't affect it. Deviation from the plan worth noting:
the scroll listener was KEPT (the plan said remove it) — with user
scrolling locked out, the only scrolls left are the tour's own
smooth ones, and the spotlight must track each frame until they
settle; removing it would have frozen the spotlight mid-flight.
Validation: lint + typecheck clean, **357/357 across 31 suites**
(+3 hook, +1 tour integration incl. Esc-restores-scroll), build
clean; e2e not re-run (no selector/layout change to existing specs
— tour specs unaffected). Status: accepted.

**D-053 · Attack visuals refactor: transparent queen + square-tint rays + state glows (Option 2)** *(Phase 16 | 2026-09-06)*
Why: the beam-style rays (2px lines + washes) read as annotation, not board state — at N=16 a ray is ~6% of cell width. The user picked Option 2 over pumping line contrast: converge on the chess.com/lichess de-facto standard where the tinted square IS the ray. `queen-piece.tsx` drops solid discs (`bg-stone-900`/`bg-conflict`/`bg-improving`) and halo rings for a transparent glyph (`text-stone-900` reads on both wood tones in both themes since board colors never change, D-041) with a stacked drop-shadow keyline (dark contact depth + soft white edge) plus state glow halos (conflict red / improving blue via `color-mix` arbitrary shadows on a separate halo layer, so the lift-pulse box-shadow animation on the button never fights it). `queen-rays.tsx` rewritten tint-first: solid `fill-conflict/25` (`dark:fill-conflict/30`) with inset edge, ghost `fill-conflict/10` (`dark:fill-conflict/15`); beams, ghost dashes, hatch pattern, and SVG filter defs all deleted. Legend swatch becomes a tinted square ("Tint = sight line · glow = attacked queen"). Badges, a11y wiring, travel animation, and all testids untouched, so existing ray/piece suites pass unchanged. Verified every new utility class actually emits CSS via grep of the production bundle (Tailwind silently drops unknown classes). Validation: lint + typecheck clean, **362/362 across 33 suites**, build clean. Status: accepted.

**D-054 · Queen interaction polish: glow crossfade, hover/pinned split, reverse-scrub truth, tint rays (Phase 17)** *(2026-09-06)*
Why: follow-up polish on the Phase 16 transparent queen. (a) Glow crossfade — fading a drop-shadow filter in/out interpolates its *color*, and Motion does that math in straight (non-premultiplied) RGBA, so transparent-black fading to red passes through a dark maroon midpoint (the reported black flash). Fix: the glow layer is a second silhouette copy carrying its FINAL colored filter at all times; only opacity animates (AnimatePresence keyed by color). Same reason browsers would premultiply correctly but the string is driven from JS. (b) Hover/pinned split — hover had no visual at all; added scale+brightness emphasis on a glyph wrapper (never the button, which the travel pulse owns) plus a persistent white pinned ring, since red/blue are already taken by conflict/moved. (c) Reverse scrub — the trail already followed a direction-aware displayedMove but the ghost echo and moved-glow still read the raw snapshot move, painting the *previous* queen's path on backward steps. Fix: single source of truth (displayedMove everywhere: trail, outline, ghost with row-swap, glow with negated delta so undoing a −2 shows +2). (d) Tint-first rays with pair pills dropped per user; punchier user-tuned tokens. Validation: lint + typecheck clean, **369/369 across 33 suites**, build clean. Status: accepted.

**D-055 · Isolate the Convergence step cursor on its own markLine series (rotated-label fix)** *(2026-09-09)*
Why: the "Step N" label above the cursor line intermittently rendered rotated 90 degrees after zooming while playing (Convergence only; tab-switch cleared it). Investigation (Playwright against the real app + reading the bundled ECharts 6.1.0 source) established the mechanism: (1) ECharts pairs markLine data items to recycled graphic elements by index on merge-mode setOption; (2) a zoom that drops an out-of-window restart item (filterMode filter + category axis) shrinks the model array, shifting the step item onto a recycled restart element — proven by element-id tracking (Step 155 rendered on Restart #4's old element); (3) label rotation is sticky element-level state recomputed only for non-start/end positions, so the inherited 90 degrees (from the restart label's insideEndTop) survived every subsequent update with the correct position 'end' — hence stuck until remount. Alternatives rejected: explicit rotate 0 (nothing writes option rotation back to the element on update, and beforeUpdate would still overwrite it for corrupted positions — verified no-op by source reading); stable item names (relies on unverified name-to-id plumbing in markLine lists); notMerge full rebuilds (kills the documented getRawIndex-crash guard and resets tooltip/zoom state every frame). Fix: the cursor is now the sole markLine item of a dedicated invisible trailing 'Step cursor' series (empty data, silent, zero-opacity line) — ECharts keys markLine element pools per seriesId (verified in source), so cross-config reuse is structurally impossible; restart lines stay on the Conflicts series where restart-to-restart reuse is harmless (same label config, rotation recomputed from the live tangent every frame). In-app verification with the exact trigger (restarts enabled + 20x playback + zoom sweeps excluding restarts): Step holds 0.00 rad throughout including while playing zoomed, restarts stay vertical, tooltip/hover intact. Validation: lint + typecheck clean, **370/370 across 33 suites** (+2 isolation guards), build clean. Status: accepted.

**D-056 · Auto-scroll placement 70/30 to 30/70 (bigger follow jumps)** *(2026-09-09)*
Why: the follow auto-scroll (D-037) placed the marker at 70% when scrolling right, i.e. the window advanced only ~30% of its width per jump — felt like it barely scrolled. Per user pick (offered 50/50 balanced vs 30% marker vs keep), `TRAILING_FRACTION` is now 0.3 (marker lands 30% into the new window, ~70% lookahead) and `LEADING_FRACTION` mirrors at 0.7 for left-scrolls. One shared pure function (`computeFollowRange`) drives both charts, so both changed together; window width is still preserved and the edge clamps are untouched. Status: accepted.

**D-057 · Config edits pause playback (clean reset); Rerun keeps playing** *(2026-09-09)*
Why: editing any Configuration Panel knob mid-playback reset to Step 0 but kept playing — a new run started under the user without them pressing Play. Backed by `ui-ux-pro-max` UX guidance (auto-advancing content needs user control / prefer click-to-play; control changes should cancel in-flight motion and land in the final semantic state) plus the video-player precedent (switching videos lands paused at 0:00). Split by intent: `setConfig` (all knobs, sliders, seed input, Random Seed via `newSeed`) now pauses — the fresh run waits inspectably at Step 0; `run()` (explicit Rerun button) preserves playing state, keeping its pinned test. The same-config no-op guard returns before pausing, so ineffective edits never interrupt; the speed slider is not `setConfig` and is unaffected; the tour's force/restore-strategy calls pausing is harmless. Trade-off: one extra Play press after each config edit while exploring — accepted as the cost of predictability. Status: accepted.

**D-061 · Tour overhaul: welcome modal, substeps, full UI restore** *(2026-09-09)*
Why: the brief demanded a guided, interactive first-run (welcome + chessboard-first flow with per-control substeps) that the flat 10-step model couldn't express. Design: welcome as a pre-step centered modal under the existing motion-patterns contract (dialog semantics, mirrored gentle enter/exit, tokens-only, reduced-motion fade); `TourSubstepDef` beats with optional spotlight overrides inside the same measure/skip machinery; Next/Back/backdrop/arrows walk substeps-first; every substep carries a unique title (doubles as the test-sync anchor under `mode="wait"`, where stale clicks are silent no-ops). Restore generalized from strategy-only to full snapshot (config + speed + playback) with explicit resume-after-pause per D-057; Advanced auto-open widened to the whole config step. Alternatives rejected: auto-advancing on detected interaction (flaky for keyboard users and tests — user-paced Next instead); splitting across subagents (tightly coupled state machine, cheaper in one pass). Verified: 20/20 tour unit + rewritten tour e2e green; full suite 390/390, e2e 30/35 (only pre-existing failures). Status: accepted.

**D-062 · Stage the red-glow reveal behind a tour-only flag** *(2026-09-09)*
Why: the tour's conflict beat lands harder when the board opens calm and the red glow arrives on cue. A separate vanilla zustand store (`tour-ui-store`, `calmQueens`) was chosen over stuffing a tour flag into the simulation store (engine state must stay tour-free) and over DOM/attribute hacks (not reactive, untestable). `QueenPiece.suppressGlow` forces the glyph to `none`; clearing it reuses the existing crossfade so the reveal animates with zero new motion code. Scope held to glow only — badges and rays stay live during intro. Unmount cleanup prevents a stranded flag on mid-tour navigation. Status: accepted.

**D-058 · Chart tooltips render via `appendToBody` (overflow-clip fix)** *(2026-09-09)*
Why: wide Landscape tooltips were sliced at the chart container edge. The reported hypothesis (raise z-index) cannot work — `overflow: hidden` on ChartWrapper clips descendants no matter their z-index. ECharts renders tooltip divs inside the chart DOM node by default, so `appendToBody: true` reparents them to `<body>`, outside every clipping ancestor, where ECharts' own baked-in `z-index:9999999` already floats them above all page content. `confine: true` added alongside so the freed tooltip still stays inside the viewport on narrow screens instead of spilling past it. Applied to both Convergence and Landscape tooltips (only Landscape visibly broke, Convergence proofed the same way). Verified with pre/post browser screenshots at the exact trigger spot. Status: accepted.

**D-059 · Borderless measured grid so overlay pixel math is exact** *(2026-09-09)*
Why: attack-ray tints sat inconsistently on squares, increasingly so at large N. The overlay computes cell geometry as `gridRect.width / n`, but `gridRect` is the grid's border-box and the grid carried a 1px border — spreading 2px of border across N cells. Per-column drift is exactly 2i/n px (browser-measured pre-fix at N=16: 0, 0.38, 0.89, 1.38, 1.89px, matching theory to 0.02px), plus tints rendering ~2px narrower than their square; at N=16's ~25px cells that reads as clearly offset, and subpixel rounding made it vary square to square. Fix moves `border border-black/20` (+ matching rounding) to the board-box wrapper — same outer geometry and visuals, but the measured element is now borderless so border-box == cells area and the division is exact (post-fix measurement: uniform 1px intentional inset, square width == computed cell width). Alternatives rejected: offsetting the overlay by a hardcoded 1px (breaks if the border ever changes) and content-box measurement via clientWidth (integer-rounded, reintroduces up to ~0.4px error). Queens and the origin echo use the same math, so they get more accurate for free. A chessboard test pins the invariant (border on parent, never on the measured grid). Status: accepted.

**D-060 · Persist visualizer config in localStorage; serve it from /visualizer** *(2026-09-09)*
Why: returning from /how-it-works silently reset the config — the remounting bridge re-hydrated bare-URL defaults over the surviving in-memory store. Query-preserving links alone can't fix back-button/reload/typed-URL cases, so persistence lives outside store and URL: `config-persistence.ts` with a versioned `nqueens-config:v1` key holding exactly the URL field set plus speed (per `client-localstorage-schema`: versioned, minimal; no snapshots or playback state, consistent with D-057). Mount precedence is explicit URL params > storage > defaults, so share links stay authoritative and hostile storage degrades per-field to defaults; every change writes through to both URL and storage under the existing content guards (no new loop risk — verified by the convergence/echo tests). Routes: the visualizer moved to `/visualizer` with `/` as a 307 `redirect()` (not 308 — avoids aggressive browser caching during iteration) that forwards `?query`, so old `/?n=…` share links keep working; `searchParams` is awaited per Next 15 async API; nav/CTA/sitemap retargeted. Trade-off: one server hop on root load (negligible, instant). Status: accepted.

**D-063 · Adopt Reactour v3 for the tour port — spike verdict GO** *(2026-09-10)*
Why: the time-boxed spike (`spike/reactour-tour`, `?tour=spike`, 4 beats: welcome + chessboard intro/conflict + config plateau) passed 10/10 Playwright assertions with zero console errors: rounded spotlight + 12px pad match our ring, calm-then-red reveal works through per-beat `action`/`actionAfter` on the D-062 store, custom `ContentComponent` carries our card + `data-testid="onboarding-tour"` + counter, Esc/arrows/past-the-end owned by a custom `keyboardHandler`, reduced-motion renders identically, and the bundle delta is +32 KB raw (~13 KB gzip real) — inside budget. Eliminations stand: Shepherd (AGPL copyleft) and Onborda (framer-motion peer + stale) confirmed out; Joyride stays warm as fallback. Five spike-found prerequisites are now port requirements (see `instructions/tour-reactour-port-plan.md` §1b): `mutationObservables` for late-appearing targets (`disableWhenSelectorFalsy` suppresses without retry), restore keyed off the `isOpen` transition (`beforeClose` fires on mount/unmount only), a presence-based tour guard in `useKeyboardShortcuts` (same-node window listeners ignore `stopPropagation`; also fixes the latent custom-tour leak), transparent `styles.popover` shell reset, and a centering fix for the welcome beat (lands ~100px right). The spike branch is never merged — §3 rebuilds the 35 beats fresh behind the same gate. Status: accepted — awaiting approval to start §3.

**D-064 · Port the onboarding tour to a Reactour v3 shell** *(2026-09-11)*
Why: the custom ~930-line spotlight shell (manual rect measuring, tooltip placement math, focus trap, skip logic) is replaced by `@reactour/tour@3.8.0` (MIT; mask+popover siblings pinned by the lockfile) while every user-visible behavior stays identical — same words, same 35 beats, same storage contract, same e2e selectors. Structure: `tour-steps.ts` (content data, moved verbatim), `tour-adapter.ts` (pure flatten with "Step X of 7" grouping metadata + resolve-first-match-and-drop), `reactour-tour.tsx` (provider + bridge + draggable card). Four port-specific mechanisms, all found empirically: (1) resolve-at-start drops beats whose targets mount later, so `start()` pre-opens Advanced a frame before flattening (collapsible children are unmounted while closed); (2) the hard scroll lock blocks ALL scrolling including the library's, so each beat unlocks → scrolls (`isRectInView` pure helper) → rebuilds steps for a fresh measure → relocks, and close restores the ENTRY scrollY (this also fixes a latent old-tour bug — below-fold beats never worked in a real browser); (3) `beforeClose` fires on mount/unmount only, so the close funnel keys off the `isOpen` transition with the mark riding Reactour's `meta` string (a custom context can't reach the buttons — they render under Tour/Popover, a sibling subtree of the bridge); (4) tour keys leak into the app's window shortcuts (same-node listeners ignore `stopPropagation`, focus falls to `<body>` after button unmounts), so `useKeyboardShortcuts` yields whenever a tour popover is present — this also fixes the latent leak in the retired tour. Welcome is a `bypassElem` beat on an always-mounted header target with a self-centering card (library center math drifts on huge targets). All library chrome disabled (`showBadge/Navigation/Close/PrevNext/Dots` false) — counter, 7 dots, and buttons are ours. Validation: typecheck + lint clean, **400/400 across 36 suites** (+6 adapter, +20 tour incl. `isRectInView`, +1 keyboard guard, −20 retired), build clean, e2e **30/35 with only the 5 pre-existing failures**, tour e2e 3/3 unchanged, full 35-beat browser walk + RM run screenshot-verified. The `spike/reactour-tour` branch is kept for reference (plan said delete; D-063 cites it). Status: accepted, merged to master.

**D-065 · Viewport stabilizer kills the tour's per-beat scrollbar flicker** *(2026-09-11)*
Why: the D-064 travel cycle (unlock → scroll → relock per beat) briefly restored the page scrollbar on every Next — each appearance/disappearance reflowed the layout (user-reported). While the tour is open, the bridge now pins `overflow: hidden` + `scrollbar-gutter: stable` on `<html>`: no viewport scrollbar can ever render, so beats never reflow. The split works because `hidden` blocks only *user* scrolling — programmatic `scrollIntoView` is unaffected, which is exactly what the travel logic needs. The D-052 hard body lock is untouched (still engages while settled). Verified: unit pins html styles set/cleared; browser walk across 4 beats (incl. mid-travel windows) shows landmark geometry identical to the sub-pixel with zero scrollbar in every sample. Full suite stays **400/400**. Status: accepted.

**D-066 · Conceal the attacker badge until its tour beat introduces it** *(2026-09-11)*
Why: per user request — progressive disclosure. The top-right attacker count is meaningless before the tour names it, so beats 1–4 (intro, conflict, hover, hit-ring) now render without it and beat 5 ("Top-right badge: attacker count") reveals it. Same mechanism as D-062's calm staging: a `hideAttackerBadge` flag in `tour-ui-store` (engine state stays tour-free), a `QueenPiece` prop gating the badge, board wiring, and bridge staging (`chessboard` group with `subIndex < 4`), cleared on restore + unmount. Only the attacker badge hides — rays, glow, and the delta badge stay live. Screen-reader parity: the button aria-label drops the count while hidden, so SR users aren't told a number sighted users can't see. Verified: unit (store toggle, piece badge + aria, 10-beat bridge walk incl. Back-path restore) and browser screenshots (intro clean, beat 5 badged). Full suite **403/403**. Status: accepted.

**D-067 · Interactive video-demo beats with hover gates (Step 1, beats 3–4)** *(2026-09-11)*
Why: per user request — beats 3–4 become guided watch-then-do flows instead of passive copy. New `tour-interactive-beat.tsx` runs a `watch → continue → do → done` phase machine: looping demo video (locked nav), Continue after the first `ended` (no `loop` attr — it suppresses `ended`; restart by hand, `onError` skips to Continue so a broken video never traps), a perform prompt, then an ack with Next. Gates are DOM-observed (`queen-rays` for beat 3, `queen-ray-hit-*` for beat 4 — hovering a queen with nobody in sight keeps waiting), so hover state stays local to Chessboard and focus/tap satisfy the same path, which is also the touch story (no device question — see below). Copy adapts via `matchMedia('(pointer: coarse)')` at beat mount ("tap" vs "hover (or tap, on touch screens)"). Watch entry pauses playback (a 20× board makes hovering luck); per-beat "Skip this demo" advances (quitting the whole tour over one gate is disproportionate); Back resets; Esc closes. Content remounts per beat via `key={beat.key}` — without it React reconciles same-type content in place and hit-ring opened pre-completed on hover's `done` (caught by tests, real bug). Demos moved `src/assets/` → `public/tour-demo-vids/` (src is never served; lazy by construction, zero bundle). Verified: 8 unit + updated walks, browser run with a REAL hover completing the gate, watch screenshot. Full suite **411/411**. Status: accepted.

**D-068 · Bigger demo videos + board lock during watch** *(2026-09-11)*
Why: per user request — (a) the 320px card rendered the demos too small to read, so interactive beats get a 480px card (viewport-clamped; detected from the content element's beat key, shell positioning untouched); (b) watch-first-touch-later: a `lockBoard` tour flag veils the board (`bg-black/60` cover at z-30 inside the board box, swallowing pointer events) during watch/continue, lifting exactly when the perform phase starts (phase-driven effect with unmount cleanup, so Back/skip/close can never strand it). Verified: veil rect equals the board box pixel-perfect with correct computed style; a forced hover on the veiled board renders zero rays while a real hover post-unlock completes the gate; card measured ≥460px. Full suite **414/414**. Status: accepted.

