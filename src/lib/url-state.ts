/**
 * URL ↔ config bridge — pure, React-free (Phase 6, D-030).
 *
 * The simulation store stays the single source of truth (D-017/D-018); the URL
 * is a typed, clamped PROJECTION of `store.config` so any link reproduces the
 * exact same run (D-004 determinism). Parsing is total: bad / unknown / hostile
 * values clamp into the UI domain instead of throwing (the engine's
 * `resolveConfig` throws on e.g. `saCoolingRate ≥ 1` — see D-011/EngineConfigError).
 *
 * Defaults are omitted from serialized URLs (`clearOnDefault`), keeping share
 * links short: `/?n=12&seed=42&strategy=min-conflicts`.
 */
import {
  createLoader,
  createSerializer,
  parseAsBoolean,
  parseAsFloat,
  parseAsInteger,
  parseAsStringLiteral,
} from 'nuqs';
import { BOARD_SIZE_LIMITS, STRATEGY_IDS, type StrategyId } from '@/lib/engine';
import { DEFAULT_CONFIG, clampBoardSize, clampSeed } from '@/store/simulation-store';
import type { SimulationConfig } from '@/store/simulation-store';

/** UI bounds for the optional policy knobs (mirror the ConfigPanel sliders). */
const STREAK_LIMITS = { min: 1, max: 200 } as const;
const RESTARTS_LIMITS = { min: 1, max: 50 } as const;
const COOLING_LIMITS = { min: 0.8, max: 0.999 } as const;

/** Typed query-param schema. Keys are short but unambiguous. */
export const urlParsers = {
  n: parseAsInteger.withDefault(DEFAULT_CONFIG.boardSize),
  seed: parseAsInteger.withDefault(DEFAULT_CONFIG.seed),
  strategy: parseAsStringLiteral(STRATEGY_IDS).withDefault(DEFAULT_CONFIG.strategy),
  sideways: parseAsBoolean.withDefault(true),
  streak: parseAsInteger.withDefault(100),
  restarts: parseAsBoolean.withDefault(false),
  maxRestarts: parseAsInteger.withDefault(10),
  cooling: parseAsFloat.withDefault(0.99),
};

export type UrlConfigValues = {
  n: number;
  seed: number;
  strategy: StrategyId;
  sideways: boolean;
  streak: number;
  restarts: boolean;
  maxRestarts: number;
  cooling: number;
};

const clampRange = (value: number, min: number, max: number, fallback: number): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

/** Clamp the SA cooling rate into the UI slider domain (the engine throws outside (0,1)). */
export function clampCooling(cooling: number): number {
  return (
    Math.round(clampRange(cooling, COOLING_LIMITS.min, COOLING_LIMITS.max, 0.99) * 1000) / 1000
  );
}

/** Pure loader — parses a search string into typed values (defaults filled in). */
export const loadUrlConfigValues = createLoader(urlParsers);

/** Convert parsed URL values into a clamped, engine-safe SimulationConfig. */
export function urlValuesToConfig(values: UrlConfigValues): SimulationConfig {
  return {
    boardSize: clampBoardSize(values.n),
    seed: clampSeed(values.seed),
    strategy: values.strategy,
    allowSideways: values.sideways,
    maxConsecutiveSideways: Math.round(
      clampRange(values.streak, STREAK_LIMITS.min, STREAK_LIMITS.max, 100),
    ),
    allowRestarts: values.restarts,
    maxRestarts: Math.round(
      clampRange(values.maxRestarts, RESTARTS_LIMITS.min, RESTARTS_LIMITS.max, 10),
    ),
    saCoolingRate: clampCooling(values.cooling),
  };
}

/** Parse a raw query string (leading `?` optional) into a SimulationConfig. */
export function parseConfigFromSearch(search: string): SimulationConfig {
  return urlValuesToConfig(loadUrlConfigValues(search));
}

/** Flatten a SimulationConfig into the URL value shape (policy defaults filled). */
export function configToUrlValues(config: SimulationConfig): UrlConfigValues {
  return {
    n: config.boardSize,
    seed: config.seed,
    strategy: config.strategy,
    sideways: config.allowSideways ?? true,
    streak: config.maxConsecutiveSideways ?? 100,
    restarts: config.allowRestarts ?? false,
    maxRestarts: config.maxRestarts ?? 10,
    cooling: config.saCoolingRate ?? 0.99,
  };
}

/** Pure serializer — `?a=b&c=d` with defaults omitted (`clearOnDefault`). */
export const serializeUrlValues = createSerializer(urlParsers);

/** Serialize a SimulationConfig into a canonical query string (no leading `?`). */
export function serializeConfigToSearch(config: SimulationConfig): string {
  return serializeUrlValues(configToUrlValues(config)).replace(/^\?/, '');
}

/** True when `a` and `b` describe the same run (policy knobs filled with defaults). */
export function sameUrlConfig(a: SimulationConfig, b: SimulationConfig): boolean {
  const ka = configToUrlValues(a);
  const kb = configToUrlValues(b);
  return (
    ka.n === kb.n &&
    ka.seed === kb.seed &&
    ka.strategy === kb.strategy &&
    ka.sideways === kb.sideways &&
    ka.streak === kb.streak &&
    ka.restarts === kb.restarts &&
    ka.maxRestarts === kb.maxRestarts &&
    ka.cooling === kb.cooling
  );
}

/** True when two URL value records hold identical primitive fields. */
export function sameUrlValues(a: UrlConfigValues, b: UrlConfigValues): boolean {
  return (
    a.n === b.n &&
    a.seed === b.seed &&
    a.strategy === b.strategy &&
    a.sideways === b.sideways &&
    a.streak === b.streak &&
    a.restarts === b.restarts &&
    a.maxRestarts === b.maxRestarts &&
    a.cooling === b.cooling
  );
}

/** `BOARD_SIZE_LIMITS` re-exported for the hook/tests (keeps the import list tidy). */
export { BOARD_SIZE_LIMITS };
