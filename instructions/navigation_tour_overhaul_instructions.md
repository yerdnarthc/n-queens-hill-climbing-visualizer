# Implementation Brief: Navigation Tour Overhaul (Flow & Process Improvement)

## What is it about?

This is a complete overhaul & improvement for the Navigation Tour feature the first time user visits the website.

Currently, I think the flow of the tour doesn't go in-depth on the full controls of what you can do in the visualizer and the step-by-step flow is incomplete.

That's why, I'm proposing a complete overhaul and some several changes for the flow of the Navigation Tour. Below, I'm going to write and describe the expected outcome and what would be the entire flow of the new Navigation Tour.

## The Entire Flow: Step-by-Step

### 1.) Initial welcoming message / dialog

The current Navigation Tour just starts immediately with Step 1, with no any welcoming message or introductions or whatsoever. I want you to add some welcoming message on the very first visit of the user, so that they can really feel the invitation of this visualizer, and it also improves the user-experience. I'm visioning something like:

- "Hello! Welcome to the N-Queens Hill-Climbing Visualizer."
- "Ever wondered what it looks like when an algorithm hunts for a solution? You're in the right place — here you can watch hill climbing tackle the famous N-Queens puzzle, one queen move at a time."
- "Before we press Play, let's take a quick tour of the controls and ideas you'll need. I'll guide you — ready when you are!"
- Buttons: a primary "Let's explore!" (starts Step 1) and a quiet "Skip tour" (marks seen, never nags).

This overall initial flow should have a very nice animations, UI/UX. Use the skills /find-skill or browse animations/motions/designs/interactions/UI/UX related skills to help you with the visuals and the interaction feel for this. Do not worry if we can't achieve it the first try, as we'll do many iterations to improve in your base implementation!

#### Welcome dialog acceptance criteria (for the implementer)

The welcome message is a centered modal, NOT a spotlight step (nothing to spotlight yet). It must satisfy the modal contract from the `motion-patterns` skill, since we already vendor those rules in this codebase:
- `role="dialog"` + `aria-modal="true"`, focus trapped inside while open, Escape closes it (treat as Skip), scroll locked behind it (reuse the existing `useScrollLock` hook).
- Enter AND exit animations, both sides defined together (`AnimatePresence` + stable `key`); entrance uses the `gentle` spring, exit mirrors it — no instant disappear.
- All durations/easings from `@/lib/motion-tokens` only — no inline numbers (foundations Rule 5). Reduced motion collapses everything to an opacity-only fade ≤ 0.2s.
- Buttons: a primary "Let's explore!" (starts Step 1) and a quiet "Skip tour" (marks seen, never nags). Copy stays in the user's voice above — warm, inviting, a little playful.

#### Skill picks for the feel work (find-skills results, verified)

- **Local, already vendored — use these first:** `motion-foundations` (tokens/springs/reduced-motion rules the tour already follows), `motion-patterns` (the Modal + AnimatePresence contract above; stagger 0.05–0.10s if substep lists ever animate in), `motion-advanced` (only if the welcome needs drag/sequence flourishes — probably unnecessary, keep it simple), `ui-ux-pro-max` (interaction/A11y review lens).
- **From the skills ecosystem (`npx skills find interaction motion`):** `kylezantos/design-motion-principles@design-motion-principles` (9.1K installs — passes the 1K quality bar; motion principles for the welcome/tooltip feel) — `npx skills add kylezantos/design-motion-principles@design-motion-principles`, https://skills.sh/kylezantos/design-motion-principles/design-motion-principles. The remaining hits (`freshtechbro motion-framer` 4.1K, `iart-ai micro-interaction` 841, `aladicf animate` 326, `yonatangross animation-motion-design` 186) are either generic or below the trust threshold — skip unless the welcome needs something the local skills can't express.

### 2.) Step 1: Chessboard Frame/Queen Pieces & Semantic Colorings

Here, this is important. I think introducing the user to the chessboard first — which is the main focus of this website — instead of the current board size as Step 1, is more logical and actually more coherent. The idea is, introduce the user that this entire visualizer is just "Chess" in the first place, it's just working with queen pieces only! Tell to the user that the chessboard will be your main focus most of the time, as here, you will see the attack path of queen pieces, what queen piece does this specific queen piece attacks, or if the entire chessboard has already been solved.

Now, tell to the user that there are color legends / indicators in each of the queen pieces. Each color serves a meaning, and you can see their meanings here in the Semantic Visuals below the playback controls.

Then in this order, introduce and tutorial the user:

- Conflicted Queen (Red): First, tell to the user that the queen pieces that have red glowing in them are conflicted queen. This means there are other queen pieces in the chessboard that are attacking it and can see it.
- Now, after this, is a good time to transition to introduce the attacking rays hovering!
- Transition then, by saying that, "Try hovering on the queen pieces to see the attacking path of each queen pieces!".
- Then, even if redundant or like it's an obvious knowledge in Chess, just make sure to still include it in this tutorial because we are not 100% sure that all users who will visit this website have a fundamentals on Chess, so explain there that, "In Chess, a queen piece can move horizontally (left and right), vertically (up and down), and diagonally, all across the chessboard, which is really powerful!". Then describe it that in the attacking rays when hovering, you can actually see it there being visualized!
- Then, guide the user to hover on one of the queen piece that have another queen piece in-sight. After this, tell the user that the red circle ring that emerges on the queen pieces means that "that" queen is being seen, attacked.
- After this, introduce the queen badges that appears all around the queen-piece/queen-glyph.
- First is the red queen badge in the top right. Tell the user that this red queen badge indicates the number of queen pieces that are currently seeing/attacking "this" queen in the chessboard.
- Then, simulate it to the user where when it moves to a step where "this" queen piece either gets an additional queen piece that attacks to it, or reduces the amount of queen piece that attacks to it, tell it to the user that "As you can see, the number on it changes. It increases if more queen pieces can see it, attacks to it. Otherwise, it decreases when some queen piece no longer sees it, attacks to it."
- Then, regarding the reduced amount, connect this to the second queen badge that you're going to guide to the user. The green queen badge that appears on the bottom right. This badge denotes how much queen pieces no longer attacks, sees it. This is denoted always in negative, with "-1" means that one queen piece no longer attacks it, and "-2" means that two queen pieces no longer attacks it.
- The opposite of this is another red queen badge, but positioned in the bottom right, instead of the other top right original one. This denotes the amount of queen pieces that have just entered and is now attacking, sees this queen. This usually can be seen when scrubbing in the timeline backwards.
- Next, is the cyan/blue glow in the queen piece. Tell to the user that this indicates "Moving Queen", which means that this queen had just moved / this is the queen that had moved. You can only see this cyan/blue glow if this queen is the one that had just moved, and it moved to a position where it isn't attacked, seen by other queen pieces. Otherwise, if it moved, and it landed to a position where it's attacked, seen, the red glow overrides the cyan/blue glow!
- Now after this, introduce the cyan/blue square tint trail path. Tell to the user that this shows the path of the movement of the queen, and this is an important visuals to let users see and to describe the movement of the queen pieces along the chessboard.
- Lastly, the amber/orange badge state. This is important to get right: it is NOT a third badge — it is the SAME bottom-right delta badge from above, turned amber. It appears when a move changes nothing (Δ = 0), i.e. a shoulder/plateau move. Tell the user: "See that same bottom-right badge? When the move it describes neither helped nor hurt, it turns amber instead of green or red — that amber is your plateau/shoulder signal, the search walking flat ground." Then describe what a plateau means in the context of the problem (ties directly into the Allow Plateau Moves knob they'll meet in Step 3).
- This is all for the hover, now time to introduce to the user that they can also tap/pin queen pieces in the board. Urge the user to "Try clicking/tapping on this queen piece to see what will happen!"
- Once tapped/clicked, describe that selected/pinned queen piece will show a "White Halo ring" around it. Then, also explain that tapped/clicked queen piece will stick its shown attacking rays when scrubbing the timeline ONLY (both backward and forward). When pressing "Play", it gets deselected. Then, guide the user that to deselect, just press on the selected/pinned queen piece again.

For these bullet points, make sure to make them as a substeps in Step 1.

This ends the navigation tour / tutorial for Step 1: Chessboard Frame/Queen Pieces & Semantic Colorings.

### 3.) Step 2: Timeline Section

With the Step 1: Chessboard Frame/Queen Pieces & Semantic Colorings done, I want you to make a seamless transition to Step 2: Timeline Section. Connect it so that users will feel the seamless user-experience and they will be hooked in the Navigation Tour.

This step here will introduce and guide the user on the Timeline Section, including the timeline scrubber, playback controls, speed controls, and the shortcut label guides.

- First, introduce to the user the Timeline Scrubber. Explain it to the user the "Step No." label, how it changes and tells what step currently the simulation is. Then, the "%" in the rightmost of the timeline scrubber, that indicates how many percentage currently the simulation has done. Then, the important part: The timeline scrubber slider. Guide this to the user, explain what it does, how does it affect the simulation and the chessboard when scrubbing through this slider. Then, also include in the exploration guide the circle color indicator just below the Timeline Scrubber. First is the green circle. This indicates what step number is the best in the problem, the best step is. Guide it to the user. Next, is the Yellow circle, which indicates the part of the timeline where a Restart happens, IF, the "Random Restarts" is ticked on. But I think for the Restart circle indicator, let's save this tour explanation later when it's time for the Random Restart option to be discussed.

- Once done with the Timeline scrubber section, move on to the Playback Controls. Tell to the user the basics of the Playback controls: Skip to Beginning, Move One Frame Backward, Play/Pause/Replay, Move One Frame Forward, Skip to End, Jump to Best Step, Rerun from Step 0. Make sure to explain these all controls to the user one by one and show how it affects in the chessboard.

- Now, next of this is the speed playback controls. Here, there are 6 speed choices the user can choose by just selecting/clicking: 0.5x, 1x, 2x, 5x, 10x, and 20x. Also do the same as the playback controls by showing how it affects and the visualization of it in the chessboard. Then aside from this, there's also the Speed Slide control on the right, which has a range from 0.5x - 20x. Tell this to the user if they want more precise control over the speed of the animation of the simulation.

- Now below of this, is the Best step label with the color green circle badge, and the Shortcuts label guide. Tell this to the user one-by-one, explaining to them. And for the shortcuts, inform the user, and let them do the shortcuts one-by-one for more interactive and demonstrative tour/explanation guide in this section.

Also for these bullet points, make sure to make them as a substeps in Step 2.

This ends the navigation tour / tutorial for Step 2: Timeline Section.

### 4.) Step 3: Configuration Panel

Now, the interesting part and the heart of the customization for this simulator/visualizer. First of all, introduce to the user this configuration panel. Tell it to them that this is where you will mostly spend your time customizing the settings of the simulation, how it behaves, manipulates the board size, the type of algorithm for it to solve the hill climbing, seed randomizations, and more rules.

Now, in this order, guide / tour the user and explain each controls/concept in-depth:

- First is the Board Dimension. Explain it to the user how does the Board Dimension affects the chessboard simulation and let them have the control for its slider. Tell to them that it changes the board dimension/size, and also the number of queens present in the chessboard, and that the larger the board dimension is, the more the problem is gonna be computationally costly.

- Now next is the Hill Climbing Variant dropdown selections. This is the part where I want you to really explain the Hill-Climbing concepts very well and make sure that users can really get the grasp of this concept by this demonstration / navigation tour. Guide the user to select specific hill-climbing variants, then after them selecting it, demonstrate what happens after that, what it does, how does it affect the chessboard, the overall problem and how the entire simulation behaves now. Make this interaction/navigation tour as interactive and responsive as possible! Scope decision (locked): give the FULL interactive demo treatment to steepest-ascent and min-conflicts only — the contrast between greedy-best and first-found teaches the concept fastest — then guide the user to try the remaining three variants themselves with a short prompt per variant ("Your turn — pick Simulated Annealing and press Play. Watch what the temperature does to the board."). A full demo matrix for all five would make Step 3 drag; the 2+3 pattern keeps it tight without hiding anything.

- Next part is the RNG Seed Section. Tell to the user that this is the settings to randomize the seed of the simulation. When randomizing, this will randomize/change the queen pieces' placements across the chessboard, and it will also affect how much easy/hard for the current configuration of the queens for it to solve the N-Queens Problem with Hill-Climbing. Let the user interact with the input number for precise seeds, or click the "Random" or "Randomize" button to randomize the seed of the simulation.

- Now, the hidden configuration, the Advanced Policy Knobs dropdown. Guide the user to this that if they want more control and manipulation in the policies of their simulation, there's more controls under this hidden configuration dropdown by clicking on it. Now, guide the user to the knobs inside this Advanced Policy Knobs:

    - Allow Plateau Moves Knob: Now this concept is where I've misunderstood it too, so please, explain this concept very well, making sure users can easily get the grasp of what this knob will really do if toggled on / toggled off. Guide the user on the interaction of this settings and how it affects the overall simulation behavior and how it approaches the Hill-Climbing problem. Then below this, there's also a Max Plateau Streak Slider. Also, let the user interact with this and after every interactions, describe and inform the user what it does in the environment/simulation, what that slider means in the overall context, and how did it impacted the simulation. Make the guide interactive/easy-to-grasp/and direct to the point, explain the concepts very clearly!

    - Random Restarts Knob: Now back to this. Remember what I've said back in the Step 2: Timeline Section? This is actually the good place to also connect the Yellow circle, which indicates the part of the timeline where a Restart happens, IF, the "Random Restarts" is ticked on. Explain first what the knob does to the user, then let them interact with it. After toggling it on, connect the explanation of the Yellow Circle indicator in the timeline, guide the user that by enabling the Random Restarts on, they will eventually see Restarts indicator in the timeline where the Restarts happen. Explain overall very well!

Again, for these bullet points, make sure to make them as a substeps in Step 3.

This ends the navigation tour / tutorial for Step 3: Configuration Panel.

### 5.) Step 4: Analytics Graph/Chart & Optimization Panel

Now we move to the right side of the visualizer — the Analytics & Optimization panel. This is where the user sees the *whole run at a glance* instead of one board at a time. First, orient the user: this panel has three tabs — Convergence, Landscape, and Diagnostics — and the zoom level is shared across the chart tabs, so zooming in one place carries over. Tell the user that everything here follows the playback cursor: as the simulation plays or scrubs, the charts track the current step automatically.

Then, in this order, guide / tour the user and explain each part in-depth:

- First is the Convergence tab (the default). Explain that the main line is the conflicts curve `h(s)` going down as the search improves, and that the vertical cursor line + "Step N" label is the same current-step marker as the timeline — scrubbing either one moves both, so demo this by clicking a point on the chart and showing the chessboard jump to that step. Then cover the extras: the dashed Temperature line and its legend entry only appear for Simulated Annealing; the Restarts legend entry only appears when the run actually restarted; and the "Trajectory baseline at h=0 (Global Optimum)" note tells the user what the flat line at the bottom means. Then demo the zoom: wheel-zoom or drag the slider, and show how the chart auto-follows the cursor while playing (and that the zoom level survives tab switches).
- Next is the Landscape tab. Explain that unlike Convergence (one line over time), here every step is its own marker, colored and shaped by phase — walk the legend one by one: Improving, Shoulder, Exploration (worsening), Restart, Solved. Then have the user hover a marker so the tooltip appears, and connect it back to Step 1 vocabulary: the tooltip shows the same phase names, the move in `Col → Row` form, and the restart attempt when there is one. Demo click-to-scrub here too, since it works the same as Convergence.
- Lastly is the Diagnostics tab. This one is read-only, no interaction needed — just a guided look. Walk the four stat tiles in order: Initial Conflicts (the starting board's difficulty), Best Reached (with the SOLVED badge when it hits 0), Total Steps across all attempts, and Avg Eval / Step (how many neighbor moves get checked per step — connects nicely to the "N(N-1) neighbors" idea from Step 1). Then the Search Phase Breakdown stacked bar: show how the percentages map to the same phase colors from the Landscape legend, and end on the footer note — deterministic replay is guaranteed, every step is captured immutably. That sentence is the thesis of the whole website, so let it land.

Again, for these bullet points, make sure to make them as substeps in Step 4.

This ends the navigation tour / tutorial for Step 4: Analytics Graph/Chart & Optimization Panel.

### 6.) Step 5: Stats Rail Under the Analytics Panel

Right below the Analytics panel sits the Stats Rail context dashboard, and this is the "at a glance, right now" counterpart to the charts above (which show "the whole run"). First, frame that contrast for the user: charts = history, stats rail = live current-step readout. Then walk the tiles in order:

- First row is the 2×2 grid: Timeline (cursor position like "Step X / Y"), Step Phase (the current snapshot's phase in words — improving, shoulder, restart, etc., same vocabulary as everywhere else), Attacking Pairs `h(s)` (the live conflict count), and Restarts-or-Temperature (restart count normally, live temperature readout for Simulated Annealing).
- Then the full-width Run Status hero card below it, plus the `h(s)` value and step count line. Tell the user this hero is the single fastest answer to "how is my run doing?"
- Now make it interactive and demonstrative: have the user scrub the timeline (or step with the arrow keys from Step 2!) and watch every tile update live with each step. This is the payoff moment that ties Steps 1–2 to the numbers — the board moves, the charts track, AND the tiles tick. Let them play with it for a bit before moving on.

Again, for these bullet points, make sure to make them as substeps in Step 5.

This ends the navigation tour / tutorial for Step 5: Stats Rail Under the Analytics Panel.

### 7.) Step 6: Downloadable Snapshot History as CSV

Short and sweet — this one is a single-action step, no substeps needed. Guide the user to the Export button in the Analytics panel header ("Export run as CSV", tooltip: "Download the full snapshot history as CSV"). Explain what they're getting: the full snapshot history of the run as a file — every step's board state, conflict counts, and move cost metrics, the same data behind the Diagnostics tab — so they can analyze or plot it in their own tools outside the website. Have them click it once so they see the download happen, then move on. If no run exists yet (fresh page, nothing played), tell the user the button needs a finished or in-progress run first — and since the tour has been playing and scrubbing all along, there will always be one by this point.

This ends the navigation tour / tutorial for Step 6: Downloadable Snapshot History as CSV.

### 8.) Step 7: Copy Share Link to Reproduce Simulation

This is the finale, so make it feel like one — this step closes the loop all the way back to Step 3's seed lesson. Guide the user to the Copy share link button in the Configuration Panel (the share control). Explain the idea first: the URL encodes the entire configuration, so the link reproduces this exact run bit-identically on anyone's machine — same board size, same seed, same strategy, same policies. Then connect it explicitly: "Remember the seed lesson from Step 3? *This* is why it matters — determinism turns a run into something you can hand to someone else."

Then the interactive demo: have the user click the button and confirm the feedback (icon swaps to a checkmark for ~2 seconds). Tell them they can paste that link anywhere — a fresh visit with that URL hydrates the exact same run (this is the mount-only URL hydration doing its thing). After that, wrap up the whole tour with a proper send-off message, something like "That's the tour — happy hill-climbing!" plus a reminder that they can replay anytime from the "Replay tour" button in the footer.

This ends the navigation tour / tutorial for Step 7: Copy Share Link to Reproduce Simulation — and the whole Navigation Tour.

## Interaction Scoping Contract (how the tour must feel — non-negotiable)

By all means, every step here mentioned, every substep, every demonstration, and every interactive, AT ALL COSTS, must limit user control to only the current scope of whatever part of the website is highlighted. In the user's perspective it must feel organized, scoped, neat, and properly managed — and it prevents unexpected interactions outside the lesson. The goal is maximum interactivity, demonstration, and entertainment, prioritizing user-experience, ease-of-navigation, and responsiveness. Concretely, the implementer must enforce:

1. **Dimmed = dead.** Everything outside the spotlight cutout is pointer-inert except the tooltip itself. The ONLY interactive surface per step is the spotlighted control(s) named in that step's script.
2. **Explicit Play, never auto-continue.** Any tour interaction that calls `setConfig` (every Step 3 demo!) pauses playback by design (D-057) — the tour script must then explicitly press Play or step for each before/after demo, and must never assume playback survived a knob touch. Scrubbing/stepping (Steps 1–2 demos) does not pause and needs no such handling.
3. **Snapshot everything on entry, restore on exit.** The current tour restores only the strategy; the overhaul demos touch board size, seed, variants, and policies, so snapshot the FULL `SimulationConfig` + speed + playback state when the tour opens, and restore all of it on finish, skip, or Escape. The tour must leave the UI exactly as it found it — no exceptions.
4. **One lesson per spotlight.** If a script needs two controls (e.g. "change the variant, then press Play"), that's two substeps with two spotlights, not one wide cutout. Narrow spotlights read as guidance; wide ones read as "figure it out yourself."
5. **Reduced motion + keyboard always work.** Every new animation follows the existing tour's rules (opacity-only ≤ 0.2s under reduced motion, all values from motion tokens). Every substep must be completable by keyboard alone, and Escape always exits cleanly with state restored per rule 3.

## Technical Appendix (for the implementer — verified against the codebase)

### A. Spotlight anchor inventory (all verified to exist in `src/`)

| Anchor | Lives on | Used by |
|---|---|---|
| `data-tour="board-size"` | Config panel N slider | Step 3 |
| `data-tour="strategy"` | Variant dropdown | Step 3 |
| `data-tour="seed"` | Seed input block | Step 3 |
| `data-tour="advanced"`, `data-tour="advanced-trigger"` | Advanced collapsible (auto-open/restore exists) | Step 3 |
| `data-tour="plateau"`, `data-tour="restarts"`, `data-tour="cooling"` | Policy knobs (cooling renders for SA only — keep skip-if-missing) | Step 3 |
| `data-tour="playback"` | Playback controls cluster | Step 2 |
| `data-tour="share"` | Copy share link button (config panel) | Step 8 (finale) |
| `data-testid="chessboard-grid"` | Board grid | Step 1 frame |
| `data-testid="square-{col}-{row}"`, `data-testid="queen-{col}-{row}"` | Individual squares/queens | Step 1 hover/pin demos |
| `data-testid="analytics-panel"` | Analytics panel | Step 4 frame |
| `data-testid="stats-rail"` + `data-variant="context"` | Context dashboard | Step 5 |
| `aria-label="Export run as CSV"` | Analytics header export button | Step 6 (no new anchor needed) |

### B. New anchors the overhaul needs (add with the steps that use them)

- Timeline scrubber slider, speed preset cluster, fine-speed slider, shortcuts legend (Step 2 substeps need narrower targets than the whole `playback` cluster — see contract rule 4).
- Analytics tab triggers (`TabsTrigger value="convergence" | "landscape" | "diagnostics"`) and the Stats Rail tiles, unless the implementer spotlights via existing testids/roles.
- Naming convention: `data-tour="<step>-<part>"` (e.g. `data-tour="timeline-scrubber"`), matching the existing kebab-case anchors.

### C. Step-definition conventions (extends the current `TourStepDef`)

- Keep `id` stable + `selectors[]` first-match-wins (survives layout variants); every new step gets unit coverage in the existing tour test file, which already mocks storage via the `MemoryStorage` helper.
- Substeps are data, not prose: each substep names its spotlight anchor, the exact user action ("hover queen (2,3)", "press Play"), the expected observable ("badge ticks 2 → 1"), and the advance condition. If it can't be written in that form, the substep is too vague — rewrite it.
- Keep `?tour=1` / footer Replay / "Don't show again" behavior unchanged; new steps appear in the existing "Step X of N" counter automatically.

### D. Open questions (answer before implementation starts)

1. **Per-variant demo matrix (Step 3) — LOCKED:** full interactive demo for steepest-ascent + min-conflicts, guided "try the rest yourself" for the other three. Written into Step 3 above.
2. **Badge copy verification — DONE (2026-09-09):** audited against `queen-piece.tsx`. Six of seven claims held verbatim (including the conflict-beats-moved glow priority, `hasConflict ? 'conflict' : isMoved ? 'improving' : 'none'`). One correction applied: the amber badge is the same bottom-right delta slot at Δ = 0, not a third badge — Step 1 now says so.
3. **Welcome copy final wording — DONE (2026-09-09):** approved copy lives in the welcome section above (warm + playful, no "T_T" — that stayed in the group chat where it belongs).
