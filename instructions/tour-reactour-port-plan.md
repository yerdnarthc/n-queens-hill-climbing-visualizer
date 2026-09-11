# Full-Port Plan: Custom Tour → Reactour v3

Living memory for the tour-library migration. Read this before starting any
phase; update the checkboxes as phases land.

**Status:** PORTED + MERGED 2026-09-11 (D-064). §1–§5 all landed:
6 scoped commits on `feat/tour-reactour-port`, fast-forwarded to master.
`onboarding-tour.tsx` deleted. Branches kept for reference.

**Decision log:** Shepherd.js eliminated (AGPL-3.0 copyleft — unacceptable
for a public portfolio repo). Onborda eliminated (`framer-motion>=11` peer
dep conflicts with our motion-only rule + the deliberate framer-motion
removal; also stale since Dec 2024). Finalists: Reactour v3 first,
React Joyride v3 fallback.

---

## 1. Spike gate (must pass before §3 starts)

On a throwaway branch, install `@reactour/tour` and rebuild exactly three
beats: (a) the welcome modal, (b) chessboard intro → conflict calm reveal,
(c) one config plateau beat. Judge go/no-go on:

- [x] Rounded spotlight renders over board + panel targets with correct padding.
  (`padding={{ mask: 12 }}`, `styles.maskRect rx: 4` — matches our 12px ring.)
- [x] Calm-then-red glow reveal survives inside Reactour's model.
  (Per-beat `action`/`actionAfter` on `tourUiStore.setCalmQueens` — verified in screenshots.)
- [x] Keyboard (arrows/Esc), focus behavior, and reduced-motion acceptable.
  (Custom `keyboardHandler` owns Esc/arrows/past-the-end; RM screenshot identical.)
- [x] E2E can hook stable selectors (`data-testid="onboarding-tour"` keeps working).
  (Custom `ContentComponent` wrapper carries the testid + `data-tour-phase`.)
- [x] Bundle delta recorded: **+32.0 KB raw client JS** (2398.9 vs 2366.9 KB
  `.next/static`), lib ceiling ~26 KB gzip double-counted (CJS+ESM) ≈ **~13 KB
  real** — inside the +50 KB budget.

## 1b. Spike caveats → full-port prerequisites (all found empirically)

1. **Late-appearing targets blank the step.** `disableWhenSelectorFalsy`
   suppresses AND stays suppressed — no retry when the target mounts later
   (our `action` opening Advanced). Fix proven: per-step
   `mutationObservables` + `resizeObservables` on the host panel.
2. **Restore on close must key off `isOpen`, not `beforeClose`.**
   `beforeClose` fires on Tour mount/unmount only — closing after steps leaves
   it unfired. Proven: `SpikeBridge` open→closed transition effect runs the
   snapshot restore (config + speed + step + Advanced + calm).
3. **Tour keys leak into app shortcuts.** Same-node `window` listeners can't
   be separated by `stopPropagation`, and after clicking Next focus falls to
   `<body>`. Proven: presence-based guard in `useKeyboardShortcuts`
   (`[data-testid="onboarding-tour"]` in DOM → yield) — also fixes the latent
   leak in the custom tour. Port must carry this guard over.
4. **Default popover shell wraps `ContentComponent`.** White frame behind our
   card until `styles.popover` resets background/padding/shadow (README recipe).
5. **Welcome `position: 'center'` lands right-of-center** (~100px off).
   Cosmetic; full port should set an explicit popover offset/width or a
   centered `onTransition` override and re-screenshot.

Pass → proceed below. Fail → either spike Joyride the same way or keep the
custom tour; delete the spike branch either way.

---

## 2. What migrates vs what stays

**Replaced (the shell):** spotlight rendering, tooltip positioning,
Next/Back/dots navigation, keyboard handling, focus lock, backdrop-click
advance, skip-if-missing resolution. I.e. most of `onboarding-tour.tsx`
render + state machine.

**Kept untouched (our IP):** the 35-beat scripts + substep model (flattened
at the adapter layer, §3.2), welcome copy, full snapshot/restore logic,
calm-queens staging, `useScrollLock`, localStorage gating (`nqueens-tour:v1`),
`?tour=1` / Replay event, draggable tooltip code, motion tokens, e2e
strategy (retargeted selectors only).

## 3. Construct mapping (custom → Reactour)

| Ours | Reactour equivalent | Notes |
|---|---|---|
| `TourStepDef` + `substeps[]` (35 beats) | Flat `StepType[]`; substeps become consecutive steps sharing a target | Adapter flattens once; counter math (§3.3) restores "Step X of 7" display |
| Welcome modal | Step with `position: 'center'` (no selector) | Keep our modal copy + buttons; keep AnimatePresence contract |
| Skip-if-missing (rAF-defer) | `disableWhenSelectorFalsy` | Built in; delete our resolver |
| Dimmed = dead + spotlight live | `disableInteraction` globally + `stepInteraction` per interactive beat | Exact match for the scoping contract |
| Backdrop-click advance | `onClickMask` → advance | Keep same UX |
| Esc/arrows/Tab trap | Built-in keyboard nav + FocusScope; `keyboardHandler` only if gaps found | Do not re-implement focus lock |
| Progress dots + "Step X of 7" | Custom `badgeContent` / `ContentComponent` | Library counts flat steps; our grouping counter lives in the custom badge |
| Snapshot/restore on open/close | `afterOpen` + `beforeClose` (or keep our `close()` — whichever the spike validates) | D-057 resume-after-pause rule unchanged |
| Calm-queens staging | Per-beat `action` / `actionAfter` hooks set/clear the flag | Existing crossfade does the animation; no new motion |
| Draggable tooltip | `ContentComponent` reusing our drag code + tokens | Keep `TOUR_TOOLTIP_DRAG_GLIDE`, grip, hint |
| `?tour=1`, Replay event, storage keys | Keep verbatim | Zero behavior change |
| Rounded spotlight language | `styles` functions + `highlightedMaskClassName`, per-step `padding` | Match current 12px-pad aesthetic; verify against screenshots |

### 3.1 Setup

- `npm i @reactour/tour` (MIT; React 16–19 peers already satisfied).
- `TourProvider` mounted at the visualizer page level (client component
  boundary, like today's tour — no SSR internals assumed; dynamic import
  only if the spike shows hydration noise).
- Steps array generated by a pure adapter from the existing
  `ONBOARDING_TOUR_STEPS` shape (keeps copy in one place during transition).

### 3.2 Counter math

The badge must show top-level progress ("Step 3 of 7") plus substep position,
not the flat index. Rule: beats carry `{ topStep, topTotal, subIndex,
subTotal }` metadata from the adapter; `badgeContent` renders from metadata,
never from the flat index.

### 3.3 Order of work (LANDED 2026-09-11 — each a reviewable commit)

- [x] Data module + adapter + adapter tests (`a7e2278`).
- [x] Provider shell + mount + keyboard guard + behavior tests (`1ed8961`).
- [x] Per-beat travel scroll with settle relock (`1a3ed7f` — new vs plan).
- [x] Pre-open Advanced before resolve (`a187db2` — new vs plan).
- [x] Self-centering welcome card (`3a72398` — new vs plan).
- [x] Delete `onboarding-tour.tsx` + old tests (`9a1283d`).
- [x] Memory bank D-064 + ARCHITECTURE tour rewrite (this doc's §1b caveats
  all resolved in the port: meta-mark funnel, presence guard, transparent
  shell, welcome centering, observables rule kept for config beats).

---

## 4. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Mask enter/exit transitions ignore reduced-motion | Spike checklist item; fallback is CSS `motion-reduce` overrides on mask classes |
| `@reactour/*` sibling version drift | Pin all three (`tour`, `mask`, `popover`) to the same tested versions |
| React 19 edge cases in FocusScope | Covered by existing keyboard/a11y unit tests ported 1:1 |
| Single-maintainer bus factor (4.1k stars, 73 open issues) | Our shell stays thin and swappable — steps remain data; Joyride fallback stays warm |
| Bundle regression | Record delta in spike; budget: must stay under +50KB gz vs today |

---

## 5. Acceptance criteria (ALL MET 2026-09-11)

- [x] All 35 beats reachable by keyboard alone; Esc exits with full restore.
  (8-assertion Playwright walk: plateau/sendoff/Done/restore/no-reopen green.)
- [x] Welcome → step 1 → … → sendoff walkthrough passes in e2e (tour spec
  green UNCHANGED — 3/3, no retargeting needed).
- [x] Calm-then-red reveal pixel-identical in feel to today (screenshot compare).
- [x] Reduced-motion run: opacity-only, no transforms, no layout animation.
  (RM screenshot verified: conflict beat renders clean, zero errors.)
- [x] Full unit suite green, lint + typecheck clean, build clean.
  (400/400 across 36 suites; e2e 30/35 — only the 5 pre-existing failures.)
- [x] Old tour code deleted; `data-tour` anchors all still live (reused verbatim).
- [x] Memory bank: D-064 ADR + ARCHITECTURE tour section rewritten + PROGRESS row.

## 6. Rollback

Single cutover commit (§3.3 step 6) reverts cleanly; the spike branch is
never merged. If Reactour regresses post-merge, `git revert` restores the
custom tour verbatim (its tests travel with it until deletion).
