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
 *   - URL → store: on mount AND whenever the URL values change externally
 *     (e.g. manual query edit). `setConfig` no-ops when identical.
 *   - store → URL: whenever the store config changes (sliders, selects,
 *     new seed), the serialized params are written with `history: 'replace'`
 *     (no history spam while dragging) and `clearOnDefault` (defaults omitted).
 *   - `lastPushedRef` breaks the echo loop between the two directions.
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
  serializeConfigToSearch,
  urlParsers,
  urlValuesToConfig,
} from '@/lib/url-state';

const URL_UPDATE_OPTIONS = { history: 'replace', throttleMs: 150 } as const;

export function useUrlConfigSync(store: StoreApi<SimulationState> = simulationStore): void {
  const [values, setValues] = useQueryStates(urlParsers, URL_UPDATE_OPTIONS);
  const config = useStore(store, (s) => s.config);

  /** Query string last written by THIS hook (either direction) — loop guard. */
  const lastPushedRef = useRef<string | null>(null);
  /** False until the first (mount) store→URL pass has been skipped. */
  const hydratedRef = useRef(false);

  // URL → store (mount hydration + external URL changes such as manual edits).
  // `sameUrlConfig` fills policy-knob defaults on both sides, so a URL without
  // params NO-OPs against the sparse DEFAULT_CONFIG — the driver's bootstrap
  // run stays the only engine run on a plain load.
  useEffect(() => {
    const nextConfig = urlValuesToConfig(values);
    lastPushedRef.current = serializeConfigToSearch(nextConfig);
    if (sameUrlConfig(nextConfig, store.getState().config)) return;
    store.getState().setConfig(nextConfig);
  }, [values, store]);

  // Store → URL (skip the very first render, which still holds pre-hydration config).
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    const search = serializeConfigToSearch(config);
    if (search === lastPushedRef.current) return;
    lastPushedRef.current = search;
    void setValues(configToUrlValues(config));
  }, [config, setValues]);
}
