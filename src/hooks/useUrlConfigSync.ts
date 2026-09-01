'use client';

/**
 * useUrlConfigSync — bidirectional bridge between the URL and the simulation
 * store (Phase 6, D-030). The STORE stays the single source of truth; the URL
 * is a clamped projection of `store.config`.
 *
 * Mount this hook BEFORE `useSimulationDriver()` in the page: its effects are
 * declared first, so the driver's bootstrap run already sees the hydrated
 * config (one engine run on load, not two).
 *
 * Flow:
 *   - URL → store: MOUNT-ONLY hydration (share links) plus healing of
 *     non-canonical (hostile / clamped) params back into the UI domain.
 *     After mount the store is authoritative and this effect never writes
 *     to it again.
 *   - store → URL: the only post-mount writer. Whenever the store config
 *     changes (sliders, selects, new seed), the serialized params are
 *     written with `history: 'replace'` (no history spam while dragging)
 *     and `clearOnDefault` (defaults omitted).
 *
 * Loop safety: nuqs's reconciler can momentarily flip `values` back to a
 * stale URL snapshot (its writes are throttled while the Next router syncs
 * `useSearchParams` asynchronously). With a single post-mount writer and
 * pure content guards there is no second writer to race against, so such a
 * revert is corrected in one pass instead of oscillating into React's
 * "Maximum update depth exceeded".
 */
import { useEffect, useRef } from 'react';
import { useQueryStates } from 'nuqs';
import { useStore } from 'zustand/react';
import type { StoreApi } from 'zustand/vanilla';
import { simulationStore } from '@/store';
import type { SimulationState } from '@/store/simulation-store';
import {
  configToUrlValues,
  sameUrlConfig,
  sameUrlValues,
  urlParsers,
  urlValuesToConfig,
} from '@/lib/url-state';

const URL_UPDATE_OPTIONS = { history: 'replace', throttleMs: 150 } as const;

export function useUrlConfigSync(store: StoreApi<SimulationState> = simulationStore): void {
  const [values, setValues] = useQueryStates(urlParsers, URL_UPDATE_OPTIONS);
  const config = useStore(store, (s) => s.config);

  /** False until the mount hydration pass (URL → store) has run. */
  const hydratedRef = useRef(false);
  /** False until the first store→URL pass — that render still holds the
   *  pre-hydration config, which must not be written to the URL. */
  const syncArmedRef = useRef(false);

  // URL → store: MOUNT-ONLY hydration + hostile-URL healing.
  //
  // After mount the STORE is the single source of truth and this effect never
  // writes to it again. That is what keeps the bridge loop-free: nuqs's
  // reconciler can momentarily flip `values` back to a stale URL snapshot
  // (its URL write is throttled while the Next router's searchParams sync
  // asynchronously), and the previous design — two effects guarded by a
  // shared lastPushedRef that each overwrote with one-render-stale closures —
  // turned that revert into an infinite setConfig ⇄ setValues ping-pong
  // (React "Maximum update depth exceeded"). With a mount-only reader there
  // is no second writer to fight.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const nextConfig = urlValuesToConfig(values);
    if (!sameUrlConfig(nextConfig, store.getState().config)) {
      store.getState().setConfig(nextConfig);
    }
    // Heal non-canonical params (hostile or clamped values, e.g. ?n=99) so
    // the URL can never disagree with the clamped config the store now holds.
    const canonical = configToUrlValues(nextConfig);
    if (!sameUrlValues(values, canonical)) void setValues(canonical);
  }, [values, store, setValues]);

  // Store → URL: the ONLY post-mount writer. Pure content guard — write only
  // when the URL projection differs from the current store config. A stale
  // revert of `values` is corrected in a single pass; because nothing else
  // writes the store afterwards, the correction converges instead of looping.
  useEffect(() => {
    if (!syncArmedRef.current) {
      syncArmedRef.current = true;
      return;
    }
    if (sameUrlConfig(config, urlValuesToConfig(values))) return;
    void setValues(configToUrlValues(config));
  }, [config, values, setValues]);
}
