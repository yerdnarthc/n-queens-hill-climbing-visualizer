import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { ChartWrapper } from '../chart-wrapper';
import type { ChartWrapperProps } from '../chart-wrapper';
import type { EChartsOption } from 'echarts';

// Hoisted mock factory so variables are available in the vi.mock call.
// The mock instance must support `getOption()` because the dataZoom event
// handler reads back the current zoom range from the chart after a user
// interaction.
const { mockInit, mockSetOption, mockOn, mockDispose, mockGetOption } = vi.hoisted(() => {
  const mockSetOption = vi.fn();
  const mockOn = vi.fn();
  const mockDispose = vi.fn();
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
    dispose: mockDispose,
    resize: vi.fn(),
    getOption: mockGetOption,
    getZr: vi.fn(() => ({ on: vi.fn(), off: vi.fn() })),
  }));
  return { mockInit, mockSetOption, mockOn, mockDispose, mockGetOption };
});

vi.mock('echarts', () => ({
  init: mockInit,
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

function renderChartWrapper(props: Partial<ChartWrapperProps> = {}) {
  const defaults: ChartWrapperProps = {
    option: { series: [{ type: 'line', data: [1, 2, 3] }] } as EChartsOption,
    height: '100px',
  };
  return render(<ChartWrapper {...defaults} {...props} />);
}

describe('ChartWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls setOption with notMerge:false (merge mode) - prevents getRawIndex crash', () => {
    const option = { series: [{ type: 'line', data: [1, 2, 3] }] } as EChartsOption;
    renderChartWrapper({ option });

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockSetOption).toHaveBeenCalledTimes(1);
    expect(mockSetOption).toHaveBeenCalledWith(option, {
      notMerge: false,
      lazyUpdate: true,
    });
  });

  it('does NOT re-call setOption when only onPointClick changes (stale closure guard)', () => {
    const option = { series: [{ type: 'line', data: [1, 2, 3] }] } as EChartsOption;
    const callback1 = vi.fn();
    const { rerender } = renderChartWrapper({ option, onPointClick: callback1 });

    // setOption called once on mount
    expect(mockSetOption).toHaveBeenCalledTimes(1);

    // Re-render with a NEW onPointClick but identical option and height
    const callback2 = vi.fn();
    rerender(
      <ChartWrapper
        option={option}
        height="100px"
        onPointClick={callback2}
        data-testid="chart-wrapper"
      />,
    );

    // setOption should NOT have been called again - onPointClick is stored in a ref
    expect(mockSetOption).toHaveBeenCalledTimes(1);

    // But the click handler should still use the latest callback
    const clickHandler = mockOn.mock.calls.find((call: unknown[]) => call[0] === 'click')?.[1] as (
      params: unknown,
    ) => void;
    expect(clickHandler).toBeDefined();

    act(() => {
      clickHandler({ dataIndex: 2 });
    });
    expect(callback2).toHaveBeenCalledWith(2);
    expect(callback1).not.toHaveBeenCalled();
  });

  it('registers the click handler exactly once on init', () => {
    const option = { series: [{ type: 'line', data: [1, 2, 3] }] } as EChartsOption;
    const callback = vi.fn();
    const { rerender } = renderChartWrapper({ option, onPointClick: callback });

    // Re-render multiple times with different callbacks
    rerender(
      <ChartWrapper
        option={option}
        height="100px"
        onPointClick={vi.fn()}
        data-testid="chart-wrapper"
      />,
    );
    rerender(
      <ChartWrapper
        option={option}
        height="100px"
        onPointClick={vi.fn()}
        data-testid="chart-wrapper"
      />,
    );

    const clickRegistrations = mockOn.mock.calls.filter((call: unknown[]) => call[0] === 'click');
    expect(clickRegistrations).toHaveLength(1);
    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it('re-calls setOption with merge mode when the option object changes', () => {
    const option1 = { series: [{ type: 'line', data: [1, 2, 3] }] } as EChartsOption;
    const { rerender } = renderChartWrapper({ option: option1 });

    expect(mockSetOption).toHaveBeenCalledTimes(1);
    expect(mockSetOption).toHaveBeenCalledWith(option1, {
      notMerge: false,
      lazyUpdate: true,
    });

    // New option object -> setOption should be called again
    const option2 = { series: [{ type: 'line', data: [4, 5, 6] }] } as EChartsOption;
    rerender(<ChartWrapper option={option2} height="100px" />);

    expect(mockSetOption).toHaveBeenCalledTimes(2);
    expect(mockSetOption).toHaveBeenLastCalledWith(option2, {
      notMerge: false,
      lazyUpdate: true,
    });
  });

  it('calls dispose on unmount', () => {
    const { unmount } = renderChartWrapper();
    unmount();
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });

  it('click handler extracts step from value[0] when dataIndex is absent', () => {
    const callback = vi.fn();
    renderChartWrapper({ onPointClick: callback });

    const clickHandler = mockOn.mock.calls.find((call: unknown[]) => call[0] === 'click')?.[1] as (
      params: unknown,
    ) => void;
    expect(clickHandler).toBeDefined();

    act(() => {
      clickHandler({ value: [3, 'some-metadata'] });
    });
    expect(callback).toHaveBeenCalledWith(3);
  });

  it('click handler is a no-op when onPointClick is not provided', () => {
    renderChartWrapper();

    const clickHandler = mockOn.mock.calls.find((call: unknown[]) => call[0] === 'click')?.[1] as (
      params: unknown,
    ) => void;
    expect(clickHandler).toBeDefined();

    // Should not throw
    act(() => {
      clickHandler({ dataIndex: 5 });
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // dataZoom event handler (X-axis zoom preservation)
  // ──────────────────────────────────────────────────────────────────

  it('registers a datazoom event handler exactly once on init', () => {
    const option = { series: [{ type: 'line', data: [1, 2, 3] }] } as EChartsOption;
    const callback = vi.fn();
    const { rerender } = renderChartWrapper({ option, onZoomChange: callback });

    // Re-render multiple times with new onZoomChange callbacks
    rerender(
      <ChartWrapper
        option={option}
        height="100px"
        onZoomChange={vi.fn()}
        data-testid="chart-wrapper"
      />,
    );
    rerender(
      <ChartWrapper
        option={option}
        height="100px"
        onZoomChange={vi.fn()}
        data-testid="chart-wrapper"
      />,
    );

    const dataZoomRegistrations = mockOn.mock.calls.filter(
      (call: unknown[]) => call[0] === 'datazoom',
    );
    expect(dataZoomRegistrations).toHaveLength(1);
    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it('does NOT re-call setOption when only onZoomChange changes (stale closure guard)', () => {
    const option = { series: [{ type: 'line', data: [1, 2, 3] }] } as EChartsOption;
    const callback1 = vi.fn();
    const { rerender } = renderChartWrapper({ option, onZoomChange: callback1 });

    // setOption called once on mount
    expect(mockSetOption).toHaveBeenCalledTimes(1);

    // Re-render with a NEW onZoomChange but identical option and height
    const callback2 = vi.fn();
    rerender(
      <ChartWrapper
        option={option}
        height="100px"
        onZoomChange={callback2}
        data-testid="chart-wrapper"
      />,
    );

    // setOption should NOT have been called again - onZoomChange is stored in a ref
    expect(mockSetOption).toHaveBeenCalledTimes(1);
  });

  it('datazoom handler reads the current range and forwards it to the latest callback', () => {
    // The chart instance returns a fresh start/end each time getOption is
    // called, simulating the user dragging the slider.
    mockGetOption.mockReturnValue({
      dataZoom: [
        { start: 0, end: 100 },
        { type: 'slider', start: 25, end: 75 },
      ],
    });

    const callback = vi.fn();
    renderChartWrapper({ onZoomChange: callback });

    const dataZoomHandler = mockOn.mock.calls.find(
      (call: unknown[]) => call[0] === 'datazoom',
    )?.[1] as () => void;
    expect(dataZoomHandler).toBeDefined();

    act(() => {
      dataZoomHandler();
    });

    // The handler should have read the slider's (index 1) start/end and
    // forwarded them as a `{ start, end }` pair to the callback.
    expect(callback).toHaveBeenCalledWith({ start: 25, end: 75 });
  });

  it('datazoom handler is a no-op when onZoomChange is not provided', () => {
    renderChartWrapper();

    const dataZoomHandler = mockOn.mock.calls.find(
      (call: unknown[]) => call[0] === 'datazoom',
    )?.[1] as () => void;
    expect(dataZoomHandler).toBeDefined();

    // Should not throw even though no onZoomChange is wired up.
    act(() => {
      dataZoomHandler();
    });
  });

  it('datazoom handler falls back to the first dataZoom entry if the slider entry is missing', () => {
    // Defensive: if ECharts ever returns a single-entry dataZoom (e.g. when
    // only the `inside` variant is configured), the handler should still
    // find a start/end to report rather than silently no-op.
    mockGetOption.mockReturnValue({
      dataZoom: [{ start: 40, end: 60 }],
    });

    const callback = vi.fn();
    renderChartWrapper({ onZoomChange: callback });

    const dataZoomHandler = mockOn.mock.calls.find(
      (call: unknown[]) => call[0] === 'datazoom',
    )?.[1] as () => void;

    act(() => {
      dataZoomHandler();
    });

    expect(callback).toHaveBeenCalledWith({ start: 40, end: 60 });
  });
});
