import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChartThemeColors } from '../chart-wrapper';
import { DEFAULT_DARK_COLORS, DEFAULT_LIGHT_COLORS } from '../chart-helpers';

vi.mock('next-themes', () => ({
  useTheme: () => ({
    // Start "resolved" as dark so the hook seeds dark colors on first render.
    resolvedTheme: 'dark',
  }),
}));

/**
 * Deterministic MutationObserver stub that captures the observer callback so we
 * can assert the hook recomputes exactly when the theme class on <html> changes.
 */
type ObserveCallback = () => void;
let capturedObserver: ObserveCallback | null = null;

class FakeMutationObserver {
  constructor(callback: ObserveCallback) {
    capturedObserver = callback;
  }
  observe() {}
  disconnect() {
    capturedObserver = null;
  }
}

describe('useChartThemeColors', () => {
  const originalMutationObserver = global.MutationObserver;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedObserver = null;
    // Match the seed theme: start with the `dark` class applied on <html>.
    document.documentElement.className = 'dark';
    // jsdom returns empty custom-property values, so the hook uses theme defaults.
    global.MutationObserver = FakeMutationObserver as unknown as typeof MutationObserver;
  });

  afterEach(() => {
    global.MutationObserver = originalMutationObserver;
    document.documentElement.className = '';
    capturedObserver = null;
  });

  it('seeds dark colors on first render when resolvedTheme is dark', () => {
    const { result } = renderHook(() => useChartThemeColors());
    expect(result.current.grid).toBe(DEFAULT_DARK_COLORS.grid);
    expect(result.current.card).toBe(DEFAULT_DARK_COLORS.card);
  });

  it('recomputes to light colors when the <html> class switches to light', () => {
    const { result } = renderHook(() => useChartThemeColors());
    // Sanity: seeded dark.
    expect(result.current.grid).toBe(DEFAULT_DARK_COLORS.grid);

    // Simulate next-themes swapping `dark` -> `light` on <html>.
    act(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      capturedObserver?.();
    });

    // The hook must now report LIGHT colors — this drives the ECharts
    // grid/axis recolor in real time. Before the fix, colors stayed stale.
    expect(result.current.grid).toBe(DEFAULT_LIGHT_COLORS.grid);
    expect(result.current.card).toBe(DEFAULT_LIGHT_COLORS.card);
    expect(result.current.foreground).toBe(DEFAULT_LIGHT_COLORS.foreground);
  });

  it('recomputes to dark colors when the <html> class switches to dark (reverse direction)', () => {
    const { result } = renderHook(() => useChartThemeColors());

    // First switch to light.
    act(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      capturedObserver?.();
    });
    expect(result.current.grid).toBe(DEFAULT_LIGHT_COLORS.grid);

    // Then switch back to dark.
    act(() => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      capturedObserver?.();
    });
    expect(result.current.grid).toBe(DEFAULT_DARK_COLORS.grid);
    expect(result.current.card).toBe(DEFAULT_DARK_COLORS.card);
  });

  it('disconnects its MutationObserver on unmount', () => {
    const { unmount } = renderHook(() => useChartThemeColors());
    expect(capturedObserver).not.toBeNull();
    unmount();
    // disconnect() clears the captured callback.
    expect(capturedObserver).toBeNull();
  });
});
