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