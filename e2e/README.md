# E2E suite (Playwright)

End-to-end smoke tests for the **N-Queens Hill Climbing Visualizer** (Phase 7).
They run a real Chromium browser against the production build, so they
complement the Vitest unit / RTL integration tests by catching problems that
only show up in a hydrated browser tree (Suspense boundaries, `nuqs` URL
sync, `next-themes` persistence, Radix keyboard interaction, the ECharts
canvas, the actual production bundle).

## What's covered

| Spec                 | Surface                                                                               |
| -------------------- | ------------------------------------------------------------------------------------- |
| `smoke.spec.ts`      | Home renders board + stats + config + analytics + footer. Engine bootstraps on mount. |
| `solve-flow.spec.ts` | Play drives the default run to a solved state. The board's emerald glow appears.      |
| `playback.spec.ts`   | `Space` / `←` / `→` / `R` shortcuts. Timeline scrubber moves the cursor.              |
| `theme.spec.ts`      | Global theme toggle, `<html class>` swap, survives reload.                            |
| `navigation.spec.ts` | SiteNav links, active state, footer link, /how-it-works CTA back to the visualizer.   |
| `url-state.spec.ts`  | UI → URL writes (throttled), deep-link hydration, hostile-param clamping, copy-link.  |
| `seo.spec.ts`        | `/robots.txt`, `/sitemap.xml`, `/how-it-works`, home page titles.                     |

The shared `fixtures/test.ts` adds a `hydratedHome` / `hydratedHowItWorks`
fixture that waits for the post-`<Suspense>` hydration to settle (board
grid visible) before yielding — keeps the individual specs tiny.

## Prerequisites

```bash
# from inside n-queens-visualizer/
npx playwright install chromium      # one-time, ~150MB
```

The repo already has `@playwright/test@^1.62.1` as a devDependency.

## Running

The suite targets the **production build** (the `webServer` block in
`playwright.config.ts` runs `npm run start`), so build first:

```bash
npm run build           # next build (turbopack)
npm run test:e2e        # playwright test
```

The default `reporter` is `list` (TUI-friendly). In CI it auto-switches to
`github` via the `CI` env var.

### Common flags

```bash
# Headed mode with the playwright inspector (time-travel debugging)
npm run test:e2e -- --headed --debug

# The Playwright UI mode (time-line view of every action)
npx playwright test --ui

# One spec, all its tests
npm run test:e2e -- e2e/url-state.spec.ts

# Grep by test name
npm run test:e2e -- -g "hostile URL"

# Point at an already-running server (skips the webServer block)
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

### Config

- Single project: `chromium` (Desktop Chrome, viewport 1280×720).
- `testDir: ./e2e` — keep all specs in this folder.
- `retries: 0` locally, `2` in CI.
- `trace: on-first-retry` — traces only on a failure, so flaky-investigation
  costs nothing when the suite is green.
- `webServer.reuseExistingServer: !process.env.CI` — locally you can `npm
run start` in another shell and reuse the instance.

## Conventions

- Specs MUST NOT import from `src/` — they're a black-box test.
- Stable selectors in priority order:
  1. `data-testid="…"` (the components already expose these where it
     matters: `chessboard-grid`, `square-{col}-{row}`, `analytics-panel`,
     `convergence-echarts`, `landscape-echarts`).
  2. `aria-label` / accessible role queries (`getByRole('button', { name:
/play/i })`, `getByRole('tab', { name: /convergence/i })`).
  3. Visible text — last resort.
- URL assertions use `expect.poll(…, { timeout: 2_000 })` because the
  store → URL writer is throttled at 150ms (`throttleMs` in
  `useUrlConfigSync`).
- Don't fake timers / use Vitest's `vi.useFakeTimers` — the driver is a
  real `setInterval`; the suite runs in real time. Generous timeouts on
  state transitions (15s for a full solve) cover CI slowness.
