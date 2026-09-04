# Progress — Where are we now?

> Update at the end of **every** task. Last updated: **2026-09-04** (post-D-043 + .clinerules/ in-repo + a11y/code fixes; 17 follow-up commits since Phase 7, 29 commits total).

## TL;DR

Phases 1–7 are **complete and verified**; 13 follow-up commits (2026-09-02 → 2026-09-04) polished the analytics UX and migrated to **Next 16.3.4** + ESLint flat config + a semantic-token palette (warm-sand / oxblood). Current status: **298/298 unit tests passing** (23 suites), typecheck clean, lint clean, production build passing, **Playwright E2E green** (7 specs). The home page now renders a full `StatsHeader` + a `<StatsRail variant="rail">` aside inside the chessboard card on `lg+`, a horizontal `<StatsRail variant="compact">` strip on `<lg`, an `AnalyticsPanel` with **shared X-axis dataZoom that auto-scrolls to follow the current-step marker**, and a `<StatsRail variant="context">` dashboard under the analytics panel.

## Phase roadmap

*Numbering from commits & code comments; Phases 3/5/6 scope is inferred.*

| Phase | Scope                                                              | Status                     |
| ----- | ------------------------------------------------------------------ | -------------------------- |
| 0     | Scaffold, tooling, theme (now warm-sand / oxblood), shadcn primitives | ✅ done — commit `8ece109` |
| 1     | Pure engine: RNG, O(1) evaluator, config, 5 strategies, orchestrator, 81 tests | ✅ done — commit `993c583` |
| 2     | Zustand simulation store + playback driver (play/pause, speed, step, scrub) | ✅ done — commit `45fdea0` |
| 3     | Board + controls + stats UI (Framer Motion, conflict highlighting) | ✅ done — commit `6572e3f` (136 tests) |
| 4     | Analytics: convergence chart + optimization landscape (ECharts)   | ✅ done — commit `18bbc93`, 161 tests |
| 5     | Scrubber enhancements, keyboard shortcuts, `/how-it-works` page    | ✅ done — commit `64a68d0`, 181 tests |
| 6     | Shareable URL state (nuqs), CSV export, polish                     | ✅ done — commit `460b84d`, 204 tests |
| 7     | Playwright E2E (`npx playwright install chromium` first)          | ✅ done — commit `71c6581` (207 tests) |
| 8     | Chart UX: dataZoom + auto-follow + snappier animation + per-point symbols | ✅ done — commits `a573ac4..16c1d5d` (this audit, 298 tests) |
| 9     | UI restructure: StatsRail (rail/compact/context), semantic color tokens, Next 16 + ESLint flat config | ✅ done — commits `1fc395d..41a0603` (D-039/D-040/D-041/D-042) |

## Verified status snapshot — 2026-09-04 (post-D-041)

Run inside `n-queens-visualizer/`:

- `npm run test:run` → **298/298 passed** (23 suites; +91 since Phase 7 — chart-helpers +610, chart-wrapper +433, use-follow-current-step +337, analytics-panel +149, stats-rail +145, strategy-info −3 (tag field dropped), config-panel +25, stats-header +25, e2e Playback/smoke touched)
- `npm run test:e2e` → **7 specs green** (chromium; `e2e/README.md`); the smoke and playback specs were updated for the new DOM (StatsRail aside inside the chessboard card, 10-col home grid)
- `npm run typecheck` → **clean** (exit 0)
- `npm run lint` → **clean** (0 warnings, 0 errors)
- `npm run build` → **passes** against Next 16.3.4; 8 static routes: `/`, `/how-it-works`, `/robots.txt`, `/sitemap.xml`, `+not-found`
- pre-commit (lint-staged: prettier + eslint) ran clean on every commit
- `41a0603` (D-042, SiteNav/StatsHeader opacity bump) is pushed; `577f2eb` and `c9f500d` ship the in-repo `memory-bank/` move (D-043). `HEAD` (local) = `4c1d96e`; `origin/master` = `964d287` (2 commits behind, awaiting push).

## Known issues / housekeeping

1. ~~Playwright browsers not installed; `e2e/` dir doesn't exist yet~~ — ✅
   resolved: `e2e/` lands in Phase 7; `npx playwright install chromium` is
   the documented one-time step in `e2e/README.md`.
2. `NEXT_PUBLIC_SITE_URL` is not set anywhere; `robots.ts`/`sitemap.ts` fall
   back to `http://localhost:3000` — set it in the Vercel deployment env for
   production-absolute URLs.
3. The "Midnight Lab" branding in D-013 is retired; the project now uses a
   warm-sand / oxblood palette (D-039/D-041). The how-it-works prose and any
   external copy referencing the old name should follow.

## Next up — post-audit

The roadmap is complete. Reasonable follow-ups (not committed to):

- Add a Vercel deployment workflow (`.github/workflows/ci.yml`) that runs
  `lint → typecheck → test:run → build → test:e2e` on every PR.
- Consider extending E2E to assert analytics-tab switching
  (Convergence ↔ Landscape) — the new tab-local zoom state and the
  auto-follow scroll would benefit from a regression test.

## Task log

| Date       | Task                                        | Outcome                                                          |
| ---------- | ------------------------------------------- | ---------------------------------------------------------------- |
| 2026-08-30 | Phase 0 scaffold + Midnight Lab theme       | commit `8ece109`                                                 |
| 2026-08-31 | Phase 1 deterministic engine                | commit `993c583` — 81 tests                                      |
| 2026-08-31 | **Docs memory system bootstrap**            | `docs/` created at workspace root (README + 4 memory files)      |
| 2026-08-31 | Phase 2 store + playback driver             | commit `45fdea0` — +42 tests → **123/123**, build passing        |
| 2026-08-31 | **Phase 3 UI Implementation** (this task)   | Board, controls, stats, config panel, Framer Motion — commit `6572e3f`, +13 tests → **136/136 passing**, typecheck & lint clean, build static, pushed to `origin/master` |
| 2026-08-31 | Phase 4 Analytics (this task)              | ECharts Convergence + Landscape charts, `AnalyticsPanel`, theme-color wiring, chart wired into app (`page.tsx`), vitest canvas mocks — +15 tests → **150/150**; commit `18bbc93` |
| 2026-08-31 | Bugfix: ECharts `getRawIndex` on hover     | `chart-wrapper.tsx`: merge-mode `setOption` (was `notMerge: true`) + `onPointClickRef`; fixed runtime crash on Landscape hover/click (apache/echarts#21535) — commit `a17b5d7` |
| 2026-08-31 | Bugfix: live theme recolor of charts       | `useChartThemeColors` seeds from `resolvedTheme` + MutationObserver on `<html>.class`; grid/axis colors recolor immediately on dark/light toggle — commit `a17b5d7` |
| 2026-08-31 | Chessboard color tweak                     | Unify warm-wood square colors across themes (`globals.css` `--board-dark`, `chessboard.tsx`) — commit `0338921` |
| 2026-09-01 | **Phase 5 Implementation** (this task)      | `useKeyboardShortcuts` (Space/←/→/R, page-scoped, input+modifier guards), `jumpToBest` store action + Best button, restart/best tick-markers under scrubber, shortcuts legend, persistent `SiteNav` w/ global theme toggle, full `/how-it-works` static page, `STRATEGY_INFO`+`POLICY_INFO` extracted to `src/lib/strategy-info.ts`, README wording fixed — commit `64a68d0`, +20 tests → **181/181 passing**, typecheck & lint clean, build static (6 pages) |
| 2026-09-01 | Fix: self-host Geist fonts (offline-safe)  | `layout.tsx`: `next/font/google` → `next/font/local` pointing at variable TTFs in `src/assets/fonts/` — kills the build/runtime `fonts.googleapis.com` request that failed without internet; same `--font-geist-*` variables so `globals.css` untouched — commit `b5761ac`, verified: no googleapis refs in build output, TTFs emitted to `.next/static`, 181/181 tests |
| 2026-09-01 | **Phase 6 Implementation** (this task)      | Shareable URL state (`src/lib/url-state.ts` pure schema + `useUrlConfigSync` bridge, `NuqsAdapter`, Suspense for prerender), CSV export (`src/lib/csv-export.ts` + AnalyticsPanel button), polish (Copy-share-link w/ clipboard fallback, reduced-motion, metadata fix, footer link, `robots.ts`+`sitemap.ts`) — commit `460b84d`, +23 tests → **204/204 passing**, typecheck & lint clean, build static (8 routes) |
| 2026-09-02 | Bugfix: URL⇆store bridge "Maximum update depth exceeded" | Scrubbing any slider (Board Size, Max Plateau Streak, Cooling Rate) crashed React: nuqs's reconciler reverts `values` to a stale URL snapshot after each throttled flush, and the old two-effect `lastPushedRef` guard ping-ponged one-render-stale closures forever. `useUrlConfigSync` redesigned per D-033: mount-only URL→store hydration + hostile-URL healing (new pure `sameUrlValues` in `url-state.ts`), store→URL as the only post-mount writer with pure content guards. +3 tests → **207/207 passing**, typecheck & lint clean |
| 2026-09-02 | **Phase 7 Implementation** (this task)      | Playwright E2E suite: 7 specs (`smoke`, `solve-flow`, `playback`, `theme`, `navigation`, `url-state`, `seo`) + shared `fixtures/test.ts` (waits for `<Suspense>` hydration), `e2e/README.md` documenting the workflow, `playwright.config.ts` polish (`outputDir`, `video: retain-on-failure`, `screenshot: only-on-failure`, 30s test timeout, 5s expect timeout), `.gitignore` updated for `playwright-report/` + `test-results/`. Suite targets the production build via `npm run start`. **207/207 unit tests still green, typecheck + lint clean, E2E green** |
| 2026-09-02 | UI prep: StatsHeader min-heights       | `sm:min-h-[17rem] lg:min-h-[13rem]` on the `<header>` so it reserves height for the upcoming rail/grid layouts (D-040) — commit `a573ac4`, 1-line CSS change |
| 2026-09-02 | **Chart dataZoom** (Phase 8)               | New `buildDataZoomConfig` (inside + slider, X-axis only, `zoomLock`, `filterMode: 'filter'`); `zoomRange`+`onZoomChange` props on `ChartWrapper`/`ConvergenceChart`/`LandscapeChart`; runKey-tagged so same-seed reruns preserve the window. +356 tests — commit `f72fab2`, see **D-034** |
| 2026-09-02 | Click-in-the-gaps + per-point symbols  | `ChartWrapper` subscribes to `updateAxisPointer`; click handler falls back to the cached `lastAxisPointerValueRef`. Convergence chart switches to per-point `[step, conflicts]` data items with phase-specific symbol (star = solved, triangle = restart, diamond = shoulder, circle) and 2px border + 8px shadow on the current step. +341 tests — commit `a53b5cf`, see **D-035** |
| 2026-09-02 | **Shared X-axis zoom** + chart grid polish | `AnalyticsPanel` lifts `sharedZoomRange` out of the chart components (Radix Tabs unmounts the inactive tab, so without the lift tab switches reset the zoom). Charts become controlled (`zoomRange`+`onZoomChange` props). Grid padding bumped top 20% / bottom 20% so yAxis names + axisPointer labels no longer collide; `nameGap: 30` on every yAxis. +190 tests — commit `9d6f0f6`, see **D-036** |
| 2026-09-03 | **Auto-follow current-step marker**   | New `src/components/visualizer/use-follow-current-step.ts` (pure `computeFollowRange`, trailing 0.7 / leading 0.3). `ChartWrapper` gains a `followStep` prop and a `dispatchAction` effect against slider index 1 with `animation: { duration: 50 }`. +504 tests — commit `4acc5a0`, see **D-037** |
| 2026-09-03 | Snappier chart animation profile       | `animationDuration: 200`, `animationDurationUpdate: 100`, `animationEasingUpdate: 'cubicOut'`, `animationThreshold: 200`; markLines get `animation: { duration: 50 }` so the current-step cursor snaps; auto-scroll dispatchAction gets the same. Line width 2 → 1; current-step label size 10 → 11 + bold. +107 tests — commit `16c1d5d`, see **D-038** |
| 2026-09-03 | Drop strategy `tag` field + retune palette | `StrategyInfo.tag` removed from type and every entry; `config-panel` + `/how-it-works` empty the pill. `globals.css` retunes warm palette: light page `#ececea` → warm-sand (cream/sand/stone/taupe); dark `#101116` → oxblood/ink. Phase-color tokens rebalanced. Charts adopt new warm-tint palette via `DEFAULT_*_COLORS`. −3 strategy-info tests, small analytics-panel tweaks — commit `1fc395d`, see **D-039** |
| 2026-09-04 | Visualizer styling + new `<Math>` KaTeX wrapper + Sora/Chivo Mono fonts | New `src/components/ui/math.tsx` (37 lines) for inline math. Add self-hosted **Sora + Chivo Mono** variable TTFs to `src/assets/fonts/` (replaces Geist/Geist Mono; variables renamed to `--font-sora-sans` / `--font-chivo-mono`). `tailwind-color-picker.json` token config. Major reflow across `layout.tsx`, `page.tsx`, `site-nav`, `button`, `chart-helpers`, `chart-wrapper`, `config-panel`, `playback-controls`, `stats-header`, `analytics-panel`. +6 chart-helpers — commit `e53c1eb` |
| 2026-09-04 | **StatsRail extraction** (Phase 9)        | `StatsHeader` shrinks 209 → 36 lines; bulk moves into new `src/components/visualizer/stats-rail.tsx` (219 lines). `HomeContent` rewraps: chessboard card gains a `StatsRail` aside on `lg+` (4/15 width) and a horizontal compact strip on `<lg`; main grid switches 12-col → 10-col. `e2e/smoke.spec.ts` + `e2e/playback.spec.ts` updated for new DOM. +117 tests — commit `fc72d14`, see **D-040** |
| 2026-09-04 | Concepts side-by-side + ConfigPanel `compact` mode | `HomeContent` "About Hill-Climbing Local Search" section restructured: concepts laid out side-by-side on `lg+` (state 3/5, objective 2/5, `lg:gap-10` gutter), stacked on `<lg`. `ConfigPanel` gains a `compact` boolean: hides the strategy mini-callout, shrinks selects to `h-8`, tightens padding. +61 tests — commit `834bfd4` |
| 2026-09-04 | `StatsRail` `context` variant (dashboard layout) | New third variant: full-width card with 5 metric tiles in a 2×2 grid + 1 hero Run-Status tile below. `HomeContent` renders `<StatsRail variant="context" />` in the right column under `AnalyticsPanel`. `page.tsx` reshuffles 177 lines. +53 stats-rail tests — commit `44766a1` |
| 2026-09-04 | **Semantic color tokens + Next 16 + ESLint flat config** | `globals.css`: semantic Tailwind tokens (`bg-global-max`, `bg-local-max`, `bg-conflict`, `bg-improving`, `bg-shoulder`, `bg-worsening`, `bg-restart`, +`*-deep`) wired to `--feature-*` CSS vars. **Next 15.5 → Next 16.3.4**; `eslint.config.mjs` imports `eslint-config-next@16`'s native flat config (drops `@eslint/eslintrc`/`FlatCompat` to bypass `ConfigValidator` `JSON.stringify` circular crash). `tsconfig.json`: `jsx: react-jsx`, +`.next/dev/types/**` in `include`, `incremental: true`. Two non-migrations kept on purpose: chessboard's solved-wrapper keeps literal emerald classes (locked by `e2e/solve-flow.spec.ts`); warm-wood square colours stay constant across themes — commit `7b775da`, see **D-041** |
| 2026-09-04 | SiteNav/StatsHeader opacity bump       | `SiteNav` `bg-background/80` → `bg-card`; `StatsHeader` `bg-card/40` → `bg-card/60`. 2-line CSS tweak for legibility on the new warm palette — commit `41a0603`, see **D-042** |
| 2026-09-04 | **Docs audit** (initial Phase 8/9)     | Audit of all 13 commits since `71c6581`; D-034 through D-042 appended to `DECISIONS.md`; `PROGRESS.md` test count 207 → 298, Phase 8/9 added; `ARCHITECTURE.md` updated for new components (StatsRail, use-follow-current-step, math.tsx, Sora/Chivo Mono fonts, semantic tokens, Next 16, ESLint flat config); `README.md` updated for the same |
| 2026-09-04 | **Memory-bank in-repo + rename to `memory-bank/`** | `577f2eb` moves `docs/` into the repo; `c9f500d` renames it to `memory-bank/`. D-016 superseded; **D-043** appended. Follow-up doc refresh corrects 12 stale references across `README.md`, `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `PROGRESS.md`, `DECISIONS.md` (commit refs, "local-only pending push" claims, in-repo vs out-of-repo wording) |
| 2026-09-04 | **`.clinerules/` version-controlled in-repo** | New `.clinerules/` directory in the repo (commit `a7dafcb`) containing the AI-agent instruction set: `memory-bank.md` (per-file purpose bullets rewritten to match the actual `memory-bank/` contents — README reframed as AI-agent entry point, PROJECT_CONTEXT's "changes most frequently" claim removed, ARCHITECTURE's "tech stack" claim moved out, DECISIONS's entry format spec updated to `**D-NNN · Title**`, PROGRESS's "every task" update cadence noted) and `nextjs-conventions.md` (App-Router client-subtree note, type-colocation rule corrected, `tailwind.config` → `globals.css` for Tailwind v4, stale `docs/` paths → `memory-bank/`, `aria-current="page"` pattern added). No code or architecture change; rule-text only |
| 2026-09-04 | **Home footer `<a>` → `next/link` + active-nav `aria-current="page"`** | Commit `4c1d96e`. `src/app/page.tsx`: the footer "How it works →" link (line 239) was a raw `<a href="/how-it-works">` — replaced with `next/link`'s `Link` (adds client-side routing + prefetch; closes the one outstanding violation of the App-Router bullet in `.clinerules/nextjs-conventions.md`). `src/components/site-nav.tsx`: active link now carries `aria-current={isActive ? 'page' : undefined}` so screen readers announce the current page (the visual-only `bg-primary/10` active state was already in place). Validation: `npm run typecheck` clean, `npm run lint` clean (prettier+eslint --fix ran in the pre-commit hook), `npm run test:run` → **298/298 passing across 23 suites** (unchanged from baseline). 4 insertions, 2 deletions |
