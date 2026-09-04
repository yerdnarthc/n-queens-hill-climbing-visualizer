# 📚 Project Memory — Read Me First

This folder is the **externalized long-term memory** for all AI-assisted tasks on
this project. It lives at **`n-queens-visualizer/memory-bank/`**, version-controlled
alongside the code it describes (this supersedes D-016 — see **D-043** in
`DECISIONS.md`).

> **Last verified against the codebase:** 2026-09-04 (commit `4c1d96e`,
> post-D-043 + .clinerules/ in-repo + home-footer `<a>` → `next/link` +
> active-nav `aria-current="page"` — 17 follow-up commits since the
> Phase 7 baseline of 2026-09-02 / `71c6581`).
>
> **Status snapshot:** Phases 0–9 complete. **Phase 8 (chart UX: dataZoom,
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

*Established 2026-08-31. Last updated 2026-09-04 (post-D-043 + memory-bank in-repo + .clinerules/ in-repo + a11y/code fixes via `4c1d96e`). Maintained by hand at the end of each task.*
