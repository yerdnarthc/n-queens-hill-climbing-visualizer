# N-Queens Hill-Climbing Visualizer — Agent Instructions

This file combines project memory (memory-bank/ reading protocol) and Next.js/TypeScript/
Tailwind conventions for this project. Read this file at the start of every session.

---

# Project Memory Bank

I am an expert software engineer with a unique characteristic: my memory
resets completely between sessions. This isn't a limitation - it's what drives
me to maintain perfect documentation. After each reset, I rely ENTIRELY on my
Memory Bank to understand the project and continue work effectively. I MUST
read ALL memory bank files at the start of EVERY task - this is not optional.

## Memory Bank Location

This project's Memory Bank lives in `memory-bank/`. It consists of five core files, all in Markdown format. Files
build upon each other in a clear hierarchy:

```
memory-bank/
├── README.md            # AI-agent entry point: file map + read order + task protocol
├── PROJECT_CONTEXT.md   # Foundation: why this exists, scope, stack, hard constraints
├── ARCHITECTURE.md      # System structure, design patterns, invariants, testing, commands
├── DECISIONS.md         # Append-only ADR log: D-NNN entries with Why / Status / trade-offs
└── PROGRESS.md          # Live status: TL;DR, phase roadmap, verification snapshot, task log
```

## Core Files (Required)

1. `memory-bank/README.md`
   - **AI-agent entry point**, not a human-facing setup/run/features doc.
     Contains: a file map table ("question each file answers"), a 4-step
     task protocol (read in order → do the work → close the loop → facts
     only), and a `Last verified against the codebase: ...` header pinned
     to a commit SHA.
   - The actual project README (setup, run, features) lives at the repo
     root, not here. This README's only audience is the AI agent
     orienting itself on a fresh session.

2. `memory-bank/PROJECT_CONTEXT.md`
   - Foundation document that shapes all other files (the first file the
     AI reads after README, per README's own read-order protocol).
   - Why this project exists, what problem/goal it serves (one-paragraph
     summary + origin story + target users & use cases).
   - Core requirements and scope: a **Feature goals** table with
     per-feature status (done / in progress / planned).
   - The **Stack** section — framework, styling, state, fonts, testing,
     quality. The "tech stack at a glance" lives HERE, not in README.md
     and not in ARCHITECTURE.md.
   - **Hard constraints** — a do-not-violate list (determinism, engine
     purity, UI board clamp 4–16, environment caveats like
     Windows + PowerShell + quoted paths, e2e selector lock).
   - Pointers to the rest of the memory bank and to the legacy prototype.
   - Changes **rarely**. Its own header says "Update when the project's
     purpose, scope, or stack changes" — i.e. only on meaningful
     shifts, not every task. Live status, recent changes, and
     "next up" follow-ups belong in PROGRESS.md, not here.

3. `memory-bank/ARCHITECTURE.md`
   - System architecture and overall structure: an **annotated repository
     layout tree** (with phase notes on each block) + per-module tables
     for the engine, the store, the driver, the chart pipeline, and
     the stats display.
   - Design patterns in use, component relationships, and data flow
     (engine invariants, "the only timer lives in `useSimulationDriver`
     not the store" (D-020), "the URL is a clamped projection of the
     store config, not a second store" (D-030), etc.).
   - Critical implementation paths and technical constraints
     (engine purity rule, e2e selector lock on
     `border-emerald-500/80 ring-4`, warm-wood chessboard square
     colors held constant across themes, self-hosted fonts invariant
     from D-029/D-039, …).
   - **Testing architecture**: unit suites + counts, hook tests, the
     Playwright E2E setup, and a commands table for `npm run dev /
     build / start / lint / format / typecheck / test / test:e2e`.
   - Verified against a commit SHA at the top — should reflect the
     CURRENT state of the codebase, not a changelog. Overwrite stale
     sections rather than appending to them.
   - Does **NOT** contain the tech stack list or "why chosen"
     rationale — the stack list lives in PROJECT_CONTEXT.md, and
     "why this library / why this design" lives in DECISIONS.md.

4. `memory-bank/DECISIONS.md`
   - Append-only log of significant decisions (ADRs) and their rationale.
   - New entries are added at the **BOTTOM** of the entries section
     (newest last), per the file's own subtitle: "Newest at the bottom."
   - Each entry's actual format is:
     ```
     **D-NNN · <Decision title>** *(Phase X)* or *(Phase X | YYYY-MM-DD)*
     Why: <one or more paragraphs of reasoning, alternatives considered,
     trade-offs, and the current Status: ... line>
     ```
     e.g. `**D-001 · Rebuild instead of patching the legacy prototype** *(Phase 0)*`
     followed by `Why: ...`. It is a **bold paragraph**, NOT a
     level-2 (`##`) heading with a date prefix.
   - The stable identifier is `D-NNN`; the date goes at the **end** of
     the header line (in the trailing parens), not the front.
   - Optional sub-fields used throughout: `Why:`, `Alternative:`,
     `Status:`, `Trade-off:` — match the existing entries' style when
     adding new ones.
   - NEVER rewrite or delete past entries — this file is a historical
     record, not a living summary. If a past decision is later
     reversed, add a NEW entry noting the reversal and why (see
     **D-043** superseding **D-016** for the canonical pattern) rather
     than editing the old one.
   - Distinct from PROGRESS.md: DECISIONS captures the **WHY**
     (rationale + alternatives + reversals), PROGRESS.md captures the
     **WHAT** (commit outcomes and verification results).

5. `memory-bank/PROGRESS.md`
   - The **live status** file — the file the AI updates at the end of
     every task.
   - **TL;DR** — a one-paragraph current status (test counts, what's
     shipping, where we are in the phase roadmap).
   - **Phase roadmap** — a table mapping each phase to scope + status
     (done / in progress / planned) with the commit SHA that closed
     each phase.
   - **Verified status snapshot** — the actual commands run + their
     results (`npm run test:run`, `typecheck`, `lint`, `build`,
     `test:e2e`) pinned to a date and commit SHA.
   - **Known issues / housekeeping** — current caveats (e.g.
     `NEXT_PUBLIC_SITE_URL` not set, retired branding).
   - **Next up** — proposed follow-ups that are NOT yet committed to.
   - **Task log** — a chronological changelog table (date / task /
     outcome) recording the WHAT for every commit since project
     start. This is the project's changelog, in table form.
   - Update at the end of **every** task, per the file's own header:
     "Update at the end of every task. Last updated: ..." — not just
     after significant changes. Even minor tweaks get at least a
     task-log row.
   - Distinct from DECISIONS.md: PROGRESS captures the **WHAT**
     (commit outcomes + verification), DECISIONS captures the **WHY**
     (rationale + alternatives + reversals).

## Documentation Updates

Memory Bank updates should occur when:
1. Discovering new project patterns or conventions
2. After implementing significant changes or completing a feature
3. When I request it with **"update memory bank"** (MUST review ALL five files)
4. When context needs clarification or has drifted from what the docs say

When updating, keep each file scoped to its own purpose above — don't let
status updates bleed into ARCHITECTURE.md, or architectural notes bleed into
PROGRESS.md. If unsure which file something belongs in, ask rather than
guessing.

## Key Commands

- **"follow your custom instructions"** — read the Memory Bank and continue
  where we left off
- **"initialize memory bank"** — only relevant if these files don't exist yet;
  since they already exist for this project, treat this as "read them first,
  don't recreate from scratch"
- **"update memory bank"** — trigger a full review and update across all five
  files

REMEMBER: After every memory reset, I begin completely fresh. The Memory Bank
in `memory-bank/` is my only link to previous work on this project. It must be
maintained with precision and clarity, as my effectiveness depends entirely
on its accuracy. I MUST read all five files in `memory-bank/` at the start of every
task before taking any other action.
---

# Next.js / TypeScript / Tailwind CSS Conventions

This project uses Next.js (App Router), TypeScript, and Tailwind CSS. Follow
these conventions consistently.

## Next.js — App Router
- This project uses the App Router (`app/`), not the Pages Router (`pages/`).
  Never introduce Pages Router patterns or mix the two.
- Default to Server Components. Only add `'use client'` when a component
  genuinely needs interactivity, browser APIs, hooks (`useState`,
  `useEffect`, etc.), or event handlers — and when you add it, briefly note
  why that component needed to become a Client Component.
- Keep `'use client'` boundaries as small/low as possible — push interactivity
  down to the smallest component that needs it rather than marking a whole
  page or large section as client-side.
  - **Project-specific note**: the entire `src/components/visualizer/*` subtree
    is intentionally `'use client'` because every visualizer component
    consumes the Zustand store (`useSimulationStore(...)`). That's not a
    violation of "push interactivity low" — there is no lower boundary to
    push to, since the store hook IS the interactivity. The line in this
    project is drawn at "wraps a Radix primitive / uses a hook / handles
    events"; pure presentational UI primitives (`badge`, `button`, `card`,
    `input`, `label`, `math`) stay server-renderable.
- Use `next/image` for all images instead of a raw `<img>` tag, for
  automatic optimization. (Default ready to apply — the project currently
  has no images, so this hasn't had to be invoked yet.)
- Use `next/link` for internal navigation instead of raw `<a>` tags. (Every
  internal link in `src/app/` and `src/components/` must go through
  `next/link` — the home page footer is the one place this was once
  missed; the project now uses `Link` everywhere.)
- Use the Metadata API (`metadata` export or `generateMetadata`) for
  page titles/SEO rather than manually injecting `<head>` tags. The
  project has no dynamic `[param]` routes (the only dynamic state is the
  nuqs query string, which is client-side), so the static `metadata`
  export is what's used; `generateMetadata` is the right tool to reach for
  if a dynamic route is ever added.

## TypeScript
- Avoid `any`. If a type is genuinely unknown or hard to express, use
  `unknown` and narrow it, or ask me before reaching for `any`.
- Prefer explicit types/interfaces for props, function returns, and shared
  data shapes — don't rely on implicit `any` from missing annotations.
- Colocate types with the module that owns them — engine types in
  `src/lib/engine/types.ts`, store types in `src/store/simulation-store.ts`,
  URL state in `src/lib/url-state.ts`. Component props interfaces go
  **inline at the top of the component file** (`interface MathProps` in
  `math.tsx`, `export interface AnalyticsPanelProps` in
  `analytics-panel.tsx`, `export interface StatsRailProps` in
  `stats-rail.tsx`, etc.). The project does **NOT** use a separate
  `src/types/` directory or `*.types.ts` files — colocating with the
  owning module is the convention.
- Run a typecheck (`tsc --noEmit`) mentally before considering a task done —
  flag if you're not confident a change is type-safe.

## Tailwind CSS
- Prefer Tailwind's design tokens (spacing scale, color palette, etc.) over
  arbitrary values (e.g. `p-4` over `p-[17px]`) unless there's a specific
  reason an arbitrary value is needed — note the reason if you use one.
- Avoid inline `style={{}}` props when a Tailwind utility class can do the
  same thing.
- For conditional/dynamic class names, use a `clsx` or `cn()` helper rather
  than manual string concatenation or ternaries embedded in `className`.
- Keep className strings readable — for components with many conditional
  classes, consider extracting logic rather than producing an unreadable
  one-liner.
- The project is on **Tailwind v4 with CSS-first config** — there is **no
  `tailwind.config.*` file**. Design tokens live in `src/app/globals.css`
  (`@import 'tailwindcss'`, `@custom-variant dark (&:is(.dark *))`, then
  `:root { … }` for the light theme and `.dark { … }` for dark — including
  the semantic landscape tokens: `--feature-improving`, `--feature-shoulder`,
  `--feature-local-max`, `--feature-global-max`, `--feature-conflict`, plus
  their `*-deep` companions for gradient bottoms). Reuse these tokens via
  the semantic Tailwind classes wired to them in `globals.css` (e.g.
  `bg-improving`, `text-conflict`, `bg-global-max`, `bg-shoulder-deep`)
  instead of hardcoding palette classes like `bg-sky-500` or `text-rose-500`.
  The only deliberate exception is `chessboard.tsx`'s solved-wrapper
  (`border-emerald-500/80 ring-4 …`), which keeps literal Tailwind palette
  classes on purpose because `e2e/solve-flow.spec.ts` matches them — see
  D-041 in `memory-bank/DECISIONS.md`.

## Code Organization
- Follow consistent naming: PascalCase for component files/exports
  (`GraphPanel.tsx`), camelCase for utility/hook files (`useHillClimb.ts`),
  kebab-case for route segments (App Router folder names).
- Colocate a component's styles/logic/types with the component itself unless
  something is genuinely shared across multiple features.
- Prefer composition (smaller components combined together) over large
  monolithic components — especially relevant here given this project has
  distinct visualizer, controls, and analytics-graph concerns.

## Linting, Type-Checking, and Testing
- Before considering a task complete, mentally check it against lint rules
  (ESLint) and type-checking (`tsc --noEmit`) — flag if either would likely
  fail, don't just assume it's fine. The wired scripts are `npm run lint`
  (ESLint flat config — `eslint-config-next@16` imported directly per
  D-041), `npm run typecheck` (`tsc --noEmit`), `npm run test` / `test:run`
  (Vitest watch / CI), and `npm run test:e2e` (Playwright; requires
  `npm run build` first and a one-time `npx playwright install chromium`).
- A **Husky + lint-staged pre-commit hook** runs `prettier --write` and
  `eslint --fix` on staged files — your `git commit` will format and lint
  staged code automatically. If the hook ever fails, `npm run lint` and
  `npm run format` show what it caught.
- As testing tooling (Vitest, e2e) gets introduced to this project, follow
  whatever conventions get established in `memory-bank/ARCHITECTURE.md`
  (testing architecture section) or `memory-bank/DECISIONS.md` (ADRs
  related to test design — e.g. D-014 machine-harvested fixtures, D-022 /
  D-023 component-test setup, D-041 eslint flat config). Note: the memory
  bank moved from `docs/` into the repo as `memory-bank/` per D-043 —
  older prose may still mention `docs/`, but the live paths are under
  `memory-bank/`.
- Don't leave `console.log` debugging statements in code you consider done —
  remove them or convert to proper error handling before finishing a task.

## Environment Variables
- Never hardcode secrets (this is also in my global rules, but it matters
  extra here): use `.env.local` for local secrets, never commit it.
- Remember the Next.js distinction: only prefix a variable with
  `NEXT_PUBLIC_` if it's genuinely safe to expose to the browser. Flag it if
  a variable that should stay server-only is about to get that prefix.

## Accessibility (Frontend-Specific)
- This project is visual/interactive (algorithm visualizer) — pay particular
  attention to: keyboard controls for interactive elements (not just mouse),
  sufficient color contrast for state indicators (e.g. queen placement,
  conflict highlighting), and not relying on color alone to convey meaning
  (also use icons/labels/patterns) since colorblind users need a
  non-color-only signal too.
- For navigation that indicates the current page (e.g. `src/components/site-nav.tsx`),
  use `aria-current="page"` on the active link — visual-only active-state
  indicators (a Tailwind class like `bg-primary/10`) don't reach screen
  readers. Pass `aria-current={isActive ? 'page' : undefined}` so the
  attribute is omitted (not set to a falsy string) on inactive links.


## NOTE: When reading this, mention you're following LOCAL rules.