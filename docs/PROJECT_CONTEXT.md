# Project Context — What is this project?

> Entry point for AI tasks. Verified against the codebase on **2026-09-04** (commit `41a0603`, post-D-041 refactor).
> Update when the project's purpose, scope, or stack changes.

## One-paragraph summary

**N-Queens Hill Climbing Visualizer** — an interactive educational web app that
visualizes how *hill-climbing local search* solves the N-Queens puzzle. Users
watch a chessboard evolve step-by-step with conflict highlighting, scrub through
the entire run ("time travel"), see an optimization-landscape view (improving
steps, plateaus/shoulders, local maxima, the global maximum), follow
convergence analytics, and compare **five hill-climbing strategies** plus
**sideways-move and random-restart policies** — all with seeded, fully
reproducible runs (shareable URL state).

## Origin story

The project began as `legacy/index.html` — a 787-line single-file prototype
(kept in the repo for reference only). It worked as a demo but had structural
problems:

- O(n⁴) full-board re-evaluation on every animation step
- A "Best Score" bug (tracked the **max** conflicts instead of the min)
- Unseeded `Math.random` — runs could never be reproduced or shared
- No tests, no types, unmaintainable single file

The current repo (`n-queens-visualizer/`) is a **ground-up rebuild**: a pure,
deterministic, fully-tested algorithm engine plus a modern Next.js frontend.

## Target users & use cases

- Students/instructors of AI courses studying local search (AIMA ch. 4 & 6 material)
- Self-learners comparing hill-climbing variants' behavior side-by-side
- Demo/teaching aid — a shared URL reproduces the exact same run

## Feature goals (from README, with current status)

| Feature                                   | Status                              |
| ----------------------------------------- | ----------------------------------- |
| 5 strategies + sideways & restart policies | ✅ engine complete (Phase 1)        |
| Deterministic seeded runs                  | ✅ engine complete (Phase 1)        |
| Simulation timeline state + playback (play/pause, speed, step, scrub) | ✅ complete (Phase 2) |
| Dark-first theme (warm-sand / oxblood — "Midnight Lab" retired in Phase 9) | ✅ complete (Phase 0 + D-039) |
| Interactive board (N = 4–16), animations    | ✅ complete (Phase 3)               |
| Time-travel scrubber                        | ✅ complete (Phase 3, dot + step scrub) |
| Optimization-landscape view                  | ✅ complete (Phase 4 — Landscape tab) |
| Convergence analytics chart                  | ✅ complete (Phase 4 — Convergence tab) |
| Keyboard shortcuts (Space, ←/→, R)          | ✅ complete (Phase 5)               |
| Shareable URL state (nuqs), CSV export      | ✅ complete (Phase 6)               |
| Chart X-axis dataZoom (inside + slider, shared across tab switches) | ✅ complete (Phase 8 — D-034/D-036) |
| Auto-scroll dataZoom to follow current-step marker | ✅ complete (Phase 8 — D-037) |
| StatsRail (rail / compact / context variants) | ✅ complete (Phase 9 — D-040)      |
| Semantic color tokens + warm-sand/oxblood palette | ✅ complete (Phase 9 — D-039/D-041) |
| Inline `<Math>` (KaTeX) on the home page   | ✅ complete (Phase 9)               |

## Stack (verified in `n-queens-visualizer/package.json`)

- **Framework**: Next.js **16.3.4** (App Router, Turbopack), React 19.1, TypeScript 5 (strict; `jsx: "react-jsx"` per Next 16)
- **Styling**: Tailwind CSS v4 (CSS-first `@theme inline`), shadcn/ui (new-york), tw-animate-css; Framer Motion (queen animations + `prefers-reduced-motion`, Phase 3/6); **KaTeX** for inline math via `src/components/ui/math.tsx` (Phase 9)
- **State**: Zustand 5 — integrated in Phase 2 (store + playback driver) · **Charts**: ECharts 6 (integrated in Phase 4) · **URL state**: nuqs 2 (integrated in Phase 6 — config projection, `history: 'replace'`)
- **Fonts**: **Sora + Chivo Mono** variable TTFs self-hosted via `next/font/local` in `src/assets/fonts/` (Phase 9; replaced Geist/Geist Mono; same offline-safe invariant from D-029)
- **Testing**: Vitest 4 + jsdom + Testing Library (23 unit suites, **298 tests passing**);
  Playwright E2E (chromium, 7 specs) against the production build
- **Quality**: ESLint flat config (`eslint-config-next@16` direct import, Phase 9), Prettier (+ tailwindcss plugin), Husky/lint-staged pre-commit

## Hard constraints (do not violate)

1. **Determinism** — same seed + same config ⇒ bit-identical run. The seeded RNG is the *only* entropy source.
2. **Engine purity** — `src/lib/engine` has zero React/framework imports.
3. **UI board clamp** — 4–16 (`BOARD_SIZE_LIMITS`); the engine itself accepts 1–64.
4. **Environment** — Windows + PowerShell; the repo path contains a space — always quote paths.
5. **E2E selector lock** — `e2e/solve-flow.spec.ts` matches the chessboard solved-wrapper by the literal `border-emerald-500/80` / `ring-4` classes. The semantic-token migration (D-041) deliberately did **not** touch these — do not migrate them without updating the e2e spec.

## Pointers

- App + git repo: `n-queens-visualizer/` (branch `master`, on **Next 16.3.4**, ~19 commits, `origin → github.com/yerdnarthc/n-queens-hill-climbing-visualizer`; `41a0603` is the latest local-only commit, pending push)
- Legacy prototype: `n-queens-visualizer/legacy/index.html` (reference only — do not build on it)
- Internals: `ARCHITECTURE.md` · Rationale: `DECISIONS.md` · Status: `PROGRESS.md`
