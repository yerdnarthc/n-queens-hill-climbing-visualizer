import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { AnalyticsPanel } from '../analytics-panel';
import { simulationStore } from '@/store';

// Mock ECharts so we can inspect the option passed to the chart on each
// setOption call. This is the only way to verify that the lifted-up
// zoom state in AnalyticsPanel actually flows through to both chart
// components — and survives a tab switch.
const { mockInit, mockSetOption, mockOn, mockGetOption } = vi.hoisted(() => {
  const mockSetOption = vi.fn();
  const mockOn = vi.fn();
  const mockGetOption = vi.fn(() => ({
    dataZoom: [
      { start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100 },
    ],
  }));
  const mockInit = vi.fn(() => ({
    setOption: mockSetOption,
    on: mockOn,
    off: vi.fn(),
    dispose: vi.fn(),
    resize: vi.fn(),
    getOption: mockGetOption,
    getZr: vi.fn(() => ({ on: vi.fn(), off: vi.fn() })),
  }));
  return { mockInit, mockSetOption, mockOn, mockGetOption };
});

vi.mock('echarts', () => ({
  init: mockInit,
}));

describe('AnalyticsPanel Component', () => {
  beforeEach(() => {
    // Initialize deterministic run
    simulationStore.getState().setConfig({
      boardSize: 8,
      seed: 27,
      strategy: 'steepest-ascent',
    });
    simulationStore.getState().run();
    // Clear the ECharts mock call records between tests so each test
    // starts with a clean slate (the mocks are hoisted to module scope).
    vi.clearAllMocks();
  });

  it('renders analytics panel header, tabs, and current state badge', () => {
    render(<AnalyticsPanel />);

    expect(screen.getByTestId('analytics-panel')).toBeInTheDocument();
    expect(screen.getByText('Analytics & Optimization')).toBeInTheDocument();

    // Tab triggers
    expect(screen.getByRole('tab', { name: /convergence/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /landscape/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /diagnostics/i })).toBeInTheDocument();

    // Convergence chart container rendered by default
    expect(screen.getByTestId('convergence-chart')).toBeInTheDocument();
  });

  it('allows switching to Landscape tab and renders landscape chart container', async () => {
    const user = userEvent.setup();
    render(<AnalyticsPanel />);

    const landscapeTab = screen.getByRole('tab', { name: /landscape/i });
    await user.click(landscapeTab);

    expect(screen.getByTestId('landscape-chart')).toBeInTheDocument();
  });

  it('allows switching to Diagnostics tab and displays run summary metrics', async () => {
    const user = userEvent.setup();
    render(<AnalyticsPanel />);

    const diagnosticsTab = screen.getByRole('tab', { name: /diagnostics/i });
    await user.click(diagnosticsTab);

    expect(screen.getByText('Initial Conflicts')).toBeInTheDocument();
    expect(screen.getByText('Best Reached')).toBeInTheDocument();
    expect(screen.getByText('Search Phase Breakdown')).toBeInTheDocument();
  });

  it('displays empty state placeholder when no result is present', () => {
    // Force empty result
    simulationStore.setState({ result: null });

    render(<AnalyticsPanel />);
    expect(screen.getByTestId('convergence-chart-empty')).toBeInTheDocument();
  });

  it('preserves the X-axis zoom range across tab switches (shared parent state)', async () => {
    // Regression test for the "zoom resets when switching tabs" bug.
    //
    // Previously each chart owned its zoom state in local useState, so
    // Radix Tabs unmounting the inactive chart would destroy that state
    // and reset the dataZoom slider to the full 0–100 range. The fix
    // lifts the zoom state up to AnalyticsPanel (which never unmounts),
    // and both chart components read it as a prop.
    //
    // This test simulates the bug: it captures the slider dataZoom
    // start/end values from the last setOption call on each chart, and
    // verifies that the value a user "set" on one chart is the same
    // value the other chart receives after a tab switch.
    const user = userEvent.setup();
    render(<AnalyticsPanel />);

    // The convergence chart is mounted by default. Find the dataZoom
    // handler that was registered on the convergence chart's ECharts
    // instance — it's the most recent 'datazoom' registration, but
    // we can also find it by inspecting the setOption call for the
    // option's dataZoom.
    const rawHandler = mockOn.mock.calls
      .filter((call: unknown[]) => call[0] === 'datazoom')
      .at(-1)?.[1] as unknown;
    expect(rawHandler).toBeDefined();
    const convergenceDataZoomHandler = rawHandler as () => void;

    // Simulate the user zooming on the convergence chart. ECharts'
    // datazoom event fires with the chart's current state.
    mockGetOption.mockReturnValue({
      dataZoom: [
        { start: 30, end: 70 },
        { type: 'slider', start: 30, end: 70 },
      ],
    });
    act(() => {
      convergenceDataZoomHandler();
    });

    // Switch to the landscape tab. Radix Tabs unmounts the convergence
    // chart and mounts the landscape chart. The landscape chart's
    // dataZoom slider should have the SAME start/end (30, 70) because
    // the parent owns the state and feeds it to both.
    await user.click(screen.getByRole('tab', { name: /landscape/i }));

    // The landscape chart is now mounted and has called setOption at
    // least once. Find the most recent setOption call (which carries
    // the option for the landscape chart) and inspect its dataZoom
    // slider entry.
    const lastCall = mockSetOption.mock.calls.at(-1)?.[0] as
      { dataZoom?: Array<{ start: number; end: number }> } | undefined;
    expect(lastCall).toBeDefined();
    expect(lastCall?.dataZoom).toBeDefined();
    const slider = lastCall?.dataZoom?.[1];
    // The slider's start/end should reflect the user's previous zoom
    // on the convergence chart. Before the fix, this would be {0, 100}
    // because the landscape chart's local useState was just initialized
    // to null on mount.
    expect(slider?.start).toBe(30);
    expect(slider?.end).toBe(70);
  });
});
