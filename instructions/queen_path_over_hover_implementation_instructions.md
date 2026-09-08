# Implementation Brief: Queen Attack Rays on Hover / Tap (Desktop First, Mobile Included)

> Status: **implemented** (Phase 16, 2026-09-06 — 15 commits to feature, pending doc commit). Goal: when the user inspects a queen,
> the board reveals *why that queen attacks whom* — 8 sight-lines plus a
> convergence marker on every queen caught in them. This turns the
> abstract conflict count into something you can see.

## 1. Engine-truth correction (read first — it changes the premise)

The original draft framed these paths as the queen's **move-set**
("where it can move and land" horizontally, vertically, diagonally).
That is true for real chess but **false for this visualizer**, and
shipping it would teach the wrong thing in an educational app:

- Our engine is `rows[col] = row` — one queen per column, and a move
  relocates a queen **within its own column only** (`src/lib/engine/
  types.ts`, `MoveDetail { column, fromRow, toRow }`, D-003). Horizontal
  and diagonal moves can never happen here (same lesson as the
  sideways→plateau rename, D-047).
- What the horizontal / diagonal lines **do** truthfully show is the
  queen's **lines of sight** — exactly the three line families the
  conflict evaluator counts (`src/lib/engine/conflicts.ts`: row
  occupancy + both diagonal families + column by construction).
  A queen on any of these lines from the hovered queen *is* an
  attacking pair, which is precisely what `h(s)` counts.

**Therefore: build attack rays, not move previews.** Name everything
"attack rays" / "sight lines" in code, copy, and tests — never "moves"
or "possible landings". One honest footnote to surface in the UI copy:
only the *column* ray coincides with legal moves; the other seven
show sight lines. That single sentence prevents the exact confusion
this project already fixed once.

## 2. Interaction spec

Three triggers, one shared code path (per the `ui-ux-pro-max` skill:
hover-only is a High-severity anti-pattern — *"Don't: rely only on
hover"*, *"Do: use click/tap for primary interactions"*).

| Trigger | Platform | Behavior |
|---|---|---|
| `mouseenter` / `mouseleave` on a queen | Desktop | Rays preview while hovering; vanish on leave (unless pinned) |
| Click / tap on a queen | Desktop + mobile (PRIMARY) | Rays pin until: second tap on the same queen, tap elsewhere, Esc, or step change |
| Keyboard `focus` / `blur` on a queen | All (a11y) | Same as hover. Queens become focusable (`tabIndex={0}`, visible focus ring — never remove it, skill Priority 1) |

Rules:
- Hover never *pins*; tap never *requires* hover. Either works alone.
- Pinned = "attack rays from this queen stay visible after you move away"
  (the *queen* itself never freezes — it still travels with the
  algorithm; "pinned" just means this inspection is locked on, the
  analogue of pinning a tooltip).
- **Q3 answer (middle path, confirmed: "solid!"):** pinned rays survive
  manual scrubbing (paused playback) — they track the pinned queen's
  new row on every `currentStep` while `isPlaying === false`. The
  instant Play resumes (`isPlaying → true`), pinned rays auto-clear.
  No setting, one heuristic.
- `Esc` clears pinned rays (consistent with the tour's Esc contract).
- Cursor: `cursor-pointer` on queens (skill: hover feedback on
  interactive elements) + `touch-action: manipulation` on the board
  (kills the 300 ms mobile tap delay per the skill's Tap Delay result).

## 3. Visual spec

- **8 rays** split at the first hit (per user: **blocked, solid ghost** — not
  full opaque, not dashed): the segment from the inspected queen to the
  first queen on a line is solid 90 % in the conflict token; the
  remainder to the board edge is a solid low-opacity ghost (30 %, neutral
  ink, still visible but clearly "beyond the blocker"). Every queen *on*
  any ray — before **or** after the first hit — still gets a ring, so a
  line with 3 queens on the same diagonal shows 3 rings (the nearest's
  ray is solid, the beyond is ghost).

  (Earlier draft recommended full-length opaque rays for truthfulness to
  the pair-scan oracle. You chose the blocked-but-ghost hybrid — keeps
  the truth (all pairs still ringed) while making the *nearest blocker*
  readable at a glance.)
- **Convergence markers** on every *hit* queen on a ray (blocked +
  ghost alike): a crisp ring in the conflict token + a small pill naming
  the pair (e.g. `Qc3 ↔ Qf6`), reusing the existing conflict-badge
  language — ring + label is the always-visible affordance (per your
  answer to Q2). Hovering **the hit queen itself** also shows that same
  pair text as a native `title` tooltip (the second half of your Q2
  answer: ring + hover-tooltip on the hit queen).
- **Ray styling**: 2 px solid lines in a neutral ink at ~60 % opacity
  with round caps — quiet enough to read as overlay, not board
  furniture. Rays that hit a queen switch to the conflict token for
  the segment from hovered queen to that queen (the "attack" portion),
  staying neutral past it. No gradients (project-wide flat rule).
- **Legend**: one line in the existing semantic legend
  (`src/app/page.tsx` legend row) — "Ray = line of sight · ring =
  attacked queen".

## 4. Motion spec (tokens only, no new values inline)

- Ray draw-on via SVG `pathLength` 0 → 1 (per `motion-advanced`;
  presentation attribute, not layout — foundations Rule 4 safe),
  `motionTokens.duration.fast` + `motionTokens.easing.smooth`.
- Micro-cascade stagger 20–40 ms per ray, total under 200 ms
  (motion-design stagger budgets); order: column ray first (it's the
  move axis), then row, then diagonals.
- Markers pop with `scale` from the token set (`motionTokens.scale.pop`).
- `prefers-reduced-motion` → rays + markers appear instantly, zero
  animation (existing `useReducedMotion` pattern in `chessboard.tsx`).
- Hover-off / unpin: fade out at `duration.fast`; no exit choreography.

## 5. Libraries: none new

SVG `<line>`/`<path>` elements rendered inside the **existing**
absolute queen overlay in `chessboard.tsx` (it already converts
`(column, row)` → pixels from the shared grid rect — rays reuse that
exact coordinate space, so no new measurement code). Animation via
installed `motion/react`; marker icon via installed `lucide-react`
(`Swords` suggested). The brief's "discover other libraries"
invitation is closed with rationale: one overlay + two installed
packages cover it; a new dependency for lines would violate the
no-surprise-dependency rule.

## 6. Accessibility contract

- Queens become interactive ⇒ each gets an accessible name
  (`aria-label="Queen at c3, 2 attackers"` — live conflict count from
  the existing per-queen evaluator call) and a visible `:focus-visible`
  ring. They are currently decorative (`aria-hidden`); that must flip
  deliberately, not accidentally.
- Pinned-ray state exposed via `aria-pressed` on the queen (toggle
  semantics for tap).
- Reduced motion collapses all ray animation (see §4).
- Contrast: ray ink vs both wood squares ≥ 3:1 for non-text graphics.

## 7. Mobile answer (the open question, resolved)

There is no hover on touch, so **tap-to-pin IS the mobile
implementation** — not a fallback, the primary path, sharing 100 % of
the desktop click code (skill: tap for primary interactions). No
separate mobile design needed:
- Tap queen → rays pin. Tap same queen / elsewhere / Esc → clear.
- `touch-action: manipulation` removes the 300 ms delay.
- Layout note: on `<lg` the board is full-width stacked, so rays have
  room; tooltips/labels must clamp into the viewport (reuse the tour's
  `placeTourTooltip` clamping approach, not its code).
- Test on a real touch device per `motion-advanced` Rule 1 (emulator
  gestures lie about thresholds).

## 8. Testing (follow project conventions)

- **Pure helper first**: `computeAttackRays(col, row, n)` → 8 rays as
  cell lists, plus `queensOnRay(board, ray)` → columns hit. Fully
  unit-testable with machine-harvested fixtures (D-014) — rays for
  corners/edges/center, N=4..16.
- **Component** (`queen-rays.tsx` + test): `fireEvent.mouseEnter/
  mouseLeave/click/focus` in jsdom assert show/pin/unpin; pinned rays
  clear on step change (rerender with new snapshot).
- **E2E**: Playwright `.hover()` + tap assert rays appear
  (`data-testid="queen-rays"`); e2e fixture already suppresses the
  tour, no interference.
- **Regression guard**: rays never render `gradient` fills (matches
  the queen-piece no-gradients test).

## 9. File touch-points (estimate: 1 new component, 3 edits)

- NEW `src/components/visualizer/queen-rays.tsx` (+ `__tests__/`)
  — ray geometry (pure part importable for tests), SVG overlay,
  markers. No engine imports except types (purity, D-002).
- EDIT `src/components/visualizer/chessboard.tsx` — mount
  `<QueenRays>` in the overlay; own the pinned-queen state (or a
  tiny `useState` in a wrapper — not the Zustand store; this is
  transient UI, not simulation state).
- EDIT `src/components/visualizer/queen-piece.tsx` — make the token
  hoverable/focusable (`tabIndex`, `aria-label`, `aria-pressed`,
  `cursor-pointer`); forward hover/focus/tap callbacks.
- EDIT `e2e/` — one spec for hover + tap-pin.
- Untouched: engine, store, driver, URL state, charts.

## 10. Acceptance checklist

- [x] Hovering any queen draws 8 rays in < 200 ms total (ghost solid not dashed)
- [x] Every queen on a ray gets a ring + pair label; count matches
  that queen's conflict badge *and* the ghost still lets 2nd-hit queens
  show their ring (solid beyond, not cut off)
- [x] Tap pins on desktop AND mobile emulation; second tap / Esc clears;
  pinned survives scrubbing while paused, cleared on Play resume
  (`isPlaying → true` effect)
- [x] Keyboard-only: Tab reaches queens, focus shows rays, Esc clears;
  `title` hover-tooltip on hit queens
- [x] `prefers-reduced-motion`: instant, no animation
- [x] No gradients; ray contrast on both wood squares
- [x] `lint` + `typecheck` clean, unit tests added, memory bank pending
  (D-entry: why attack rays, not move previews)
- [x] Legend includes "Ray = line of sight · ring = attacked queen"

## 11. Remaining questions for the author

All three are now confirmed — no open questions remain. Answers
recorded here for build traceability:

1. **Blocked vs full-length** → blocked with **solid 30 % ghost** beyond
   the first hit (your: "solid!"). Formalizes to: segment A solid 90 %,
   segment B solid 30 % neutral, every queen on any segment still ringed.
2. **Marker content** → **ring + pair label (always) + ring +
   hover-tooltip on the hit queen** (your Q2). Pill on the board plus
   the same text as a native `title` on the hit queen for N=16 crunch.
3. **Pin vs scrub** → **middle path** (your Q3): pinned while paused /
   scrubbing, cleared the instant Play resumes.
