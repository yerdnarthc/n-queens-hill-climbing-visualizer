/**
 * Flat-step adapter — turns the grouped tour content (`TourStepDef` +
 * substeps) into the linear beat list Reactour walks.
 *
 * Reactour counts flat steps, but our UI contract counts top-level steps
 * ("Step 3 of 7") — so every beat carries its grouping metadata and the
 * tooltip badge renders from THAT, never from the flat index (plan §3.2).
 *
 * Selector chains resolve to the first match in the live DOM at tour start;
 * beats with no match are dropped (the old tour's skip-if-missing, made
 * deterministic up front instead of mid-walk).
 */
import type { TourStepDef } from './tour-steps';

export interface FlatTourBeat {
  /** `groupId:subId` — stable key for React. */
  key: string;
  /** Top-level group id (drives staging: calm queens, Advanced auto-open). */
  groupId: string;
  /** 0-based top-level index (drives the "Step X of 7" badge + dots). */
  topIndex: number;
  /** Top-level group count AFTER drops (drives the badge total). */
  topTotal: number;
  /** 0-based substep index within its group. */
  subIndex: number;
  /** Substep count within its group. */
  subTotal: number;
  /** Resolved single selector for Reactour. */
  selector: string;
  title: string;
  body: string;
}

export interface FlattenOptions {
  /** Substep ids to drop (e.g. SA-only `cooling` on the forced path). */
  dropSubstepIds?: ReadonlySet<string>;
  /**
   * First-match resolver over a selector chain. Defaults to the live DOM.
   * Returns null when nothing matches (beat is dropped).
   */
  resolve?: (selectors: string[]) => string | null;
}

function defaultResolve(selectors: string[]): string | null {
  if (typeof document === 'undefined') return selectors[0] ?? null;
  for (const selector of selectors) {
    if (document.querySelector(selector) !== null) return selector;
  }
  return null;
}

/**
 * Flatten grouped steps to linear beats. Pure given `resolve` (the default
 * reads the live DOM, so call it at tour start, not render).
 */
export function flattenTourSteps(
  groups: TourStepDef[],
  options: FlattenOptions = {},
): FlatTourBeat[] {
  const { dropSubstepIds, resolve = defaultResolve } = options;
  // First pass: resolve + drop, preserving group shape for the counters.
  const resolved = groups.map((group) => {
    const subs = group.substeps ?? [];
    const beats = (
      subs.length > 0
        ? subs.map((sub) => ({
            id: sub.id,
            selectors: sub.selectors ?? group.selectors,
            title: sub.title ?? group.title,
            body: sub.body,
          }))
        : [
            {
              id: group.id,
              selectors: group.selectors,
              title: group.title,
              body: group.body,
            },
          ]
    )
      .filter((beat) => !(dropSubstepIds?.has(beat.id) ?? false))
      .map((beat) => ({ ...beat, selector: resolve(beat.selectors) }))
      .filter((beat): beat is typeof beat & { selector: string } => beat.selector !== null);
    return { group, beats };
  });
  // Groups left with zero beats vanish (their number is skipped, same as
  // the old tour skipping a missing target mid-walk).
  const live = resolved.filter((g) => g.beats.length > 0);
  const topTotal = live.length;
  return live.flatMap(({ group, beats }, topIndex) =>
    beats.map((beat, subIndex) => ({
      key: `${group.id}:${beat.id}`,
      groupId: group.id,
      topIndex,
      topTotal,
      subIndex,
      subTotal: beats.length,
      selector: beat.selector,
      title: beat.title,
      body: beat.body,
    })),
  );
}
