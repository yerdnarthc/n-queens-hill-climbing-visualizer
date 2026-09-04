# 📚 Project Memory — Read Me First

This folder is the **externalized long-term memory** for all AI-assisted tasks on
this project. It lives at the **workspace root** (`N-Queens Visualizer/docs/`),
deliberately outside the git repo, so it is always the first thing a new task
sees — no matter what happens inside `n-queens-visualizer/`.

> **Last verified against the codebase:** 2026-09-04 (commit `41a0603`,
> post-D-041 refactor — 13 follow-up commits since the Phase 7 baseline
> of 2026-09-02 / `71c6581`).
>
> **Status snapshot:** Phases 0–7 complete; **Phase 8 (chart UX: dataZoom,
> auto-follow, snappier animation) and Phase 9 (StatsRail extraction,
> semantic color tokens, warm-sand/oxblood palette, Next 16.3.4, ESLint
> flat config) shipped.** 298/298 unit tests passing across 23 suites,
> typecheck + lint + production build clean, Playwright E2E green.
> See `PROGRESS.md` for details.

## The file map

| File                | Question it answers        |
| ------------------- | -------------------------- |
| `PROJECT_CONTEXT.md` | What is this project?      |
| `ARCHITECTURE.md`   | How is it structured?      |
| `DECISIONS.md`      | Why did we make these choices? |
| `PROGRESS.md`       | Where are we now?          |

## Protocol for every task (for the AI agent)

1. **Read before acting** — in this order: `PROJECT_CONTEXT.md` → `ARCHITECTURE.md` → `DECISIONS.md` → `PROGRESS.md`.
2. **Do the work**, following the conventions and constraints recorded there.
3. **Close the loop** — update `PROGRESS.md` (status, verification results, next steps, task-log entry) and append any new decisions to `DECISIONS.md`.
4. **Facts only** — every claim should be verifiable against the code (cite file paths) or a command that was run. Mark inferences as inferences.

*Established 2026-08-31. Last updated 2026-09-04 (Phase 8/9 audit). Maintained by hand at the end of each task.*
