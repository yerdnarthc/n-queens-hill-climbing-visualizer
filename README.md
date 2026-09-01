# N-Queens Hill Climbing Visualizer

An interactive educational visualizer for the N-Queens problem solved with **hill climbing** — featuring a real-time optimization landscape, convergence analytics, time-travel playback, and five hill-climbing strategies plus sideways-move & random-restart policies.

Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Zustand · ECharts · shadcn/ui · Framer Motion**.

## Features

- **Interactive chessboard** (N = 4–16) with animated queen moves and conflict highlighting
- **Five hill-climbing strategies + two policies**: Steepest-Ascent, First-Choice, Stochastic (Random), Min-Conflicts, Simulated Annealing, plus Sideways-move & Random-Restart policies
- **Optimization landscape** (hill-up view) — see improving steps, plateaus (shoulders), local maxima, and the global maximum
- **Real-time analytics** — conflicts-over-iterations convergence chart
- **Time-travel scrubber** — replay any step of the run, with restart/event markers
- **Reproducible runs** — seeded RNG, shareable URL state, CSV export
- **Keyboard shortcuts** — Space = play/pause, ←/→ = step back/forward, R = reset
- **Dark-first "Midnight Lab" theme** with light-mode toggle

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `npm run dev`       | Start dev server (Turbopack) |
| `npm run build`     | Production build             |
| `npm run start`     | Serve the production build   |
| `npm run lint`      | ESLint                       |
| `npm run format`    | Prettier (write)             |
| `npm run typecheck` | TypeScript check             |
| `npm run test`      | Vitest (watch)               |
| `npm run test:run`  | Vitest (CI mode)             |
| `npm run test:e2e`  | Playwright E2E               |

## How It Works

See the `/how-it-works` page — algorithm theory, the six variants explained, and landscape features.

## Project Structure

```
src/
├── app/               # Next.js App Router (visualizer + how-it-works)
├── components/        # UI components (board, charts, controls, stats)
├── lib/engine/        # ★ Pure algorithm core (zero React deps)
├── store/             # Zustand simulation store
└── hooks/             # useSimulationDriver, useKeyboardShortcuts
```

The engine is a pure, deterministic TypeScript library — the only non-determinism enters via an injected seeded RNG (mulberry32). Same seed + same config ⇒ identical run.

## Legacy

The original single-file prototype lives in [`legacy/index.html`](./legacy/index.html) for reference.

## Testing

- **Engine** (Vitest): conflict counting, incremental evaluator oracle tests, strategy behavior, restart/sideways logic, determinism
- **Components** (RTL): board rendering, controls, scrubber wiring
- **E2E** (Playwright): start → solved flow, theme toggle, navigation

## Deployment

Optimized for **Vercel** — zero config, just import the repo.
