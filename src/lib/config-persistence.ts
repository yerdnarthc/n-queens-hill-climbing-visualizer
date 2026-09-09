/**
 * Visualizer config persistence — localStorage bridge (D-060).
 *
 * Why this exists: the Zustand store is in-memory, and the URL only
 * carries params while the visualizer page is mounted. Navigating to
 * /how-it-works and back remounts the page with a bare URL, whose
 * mount-only hydration would clobber the surviving in-memory config
 * with defaults. Persisting the last config (+ speed) to localStorage
 * makes the visualizer stateful across in-app navigation AND reloads,
 * while the URL stays the share mechanism (explicit params always win —
 * see `useUrlConfigSync` for the precedence).
 *
 * Design notes (per `client-localstorage-schema` guidance):
 * - Versioned key (`nqueens-config:v1`) so a future schema change can
 *   bump the version instead of parsing stale shapes.
 * - Minimal payload: the 8 URL-mirrored config fields + speed. No
 *   snapshots, no playback state (a fresh paused run on return matches
 *   the D-057 clean-reset rule).
 * - All reads are defensive: missing key, unparseable JSON, wrong
 *   shapes, and storage errors (e.g. private-mode quota) degrade to
 *   "no stored state" — the URL/defaults path then applies.
 */
import { DEFAULT_SPEED, clampSpeed, type SimulationConfig } from '@/store/simulation-store';
import { configToUrlValues, sanitizeUrlConfigValues, urlValuesToConfig } from '@/lib/url-state';

/** Versioned storage key — bump the suffix if the payload shape changes. */
export const CONFIG_STORAGE_KEY = 'nqueens-config:v1';

export interface PersistedVisualizerState {
  /** Fully resolved, clamped engine input (safe to pass to `setConfig`). */
  config: SimulationConfig;
  /** Clamped steps/second (safe to pass to `setSpeed`). */
  speed: number;
}

/** Write-through the current visualizer state (called on every config change). */
export function saveVisualizerState(config: SimulationConfig, speed: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify({ config: configToUrlValues(config), speed }),
    );
  } catch {
    // Storage unavailable or full (e.g. private mode) — the URL remains
    // the share path, so this degrades silently by design.
  }
}

/**
 * Read back the last persisted state, or null when there is nothing
 * usable (missing key, bad JSON, hostile shapes — all degrade to null
 * so the caller falls through to URL/defaults).
 */
export function loadVisualizerState(): PersistedVisualizerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { config, speed } = parsed as { config?: unknown; speed?: unknown };
    return {
      config: urlValuesToConfig(sanitizeUrlConfigValues(config)),
      speed: typeof speed === 'number' ? clampSpeed(speed) : DEFAULT_SPEED,
    };
  } catch {
    return null;
  }
}

/** Remove the persisted state (used by tests; no UI surface calls this). */
export function clearVisualizerState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CONFIG_STORAGE_KEY);
  } catch {
    // Ignore — nothing to clean.
  }
}
