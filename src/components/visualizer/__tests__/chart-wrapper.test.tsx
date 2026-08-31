import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { ChartWrapper } from '../chart-wrapper';
import type { ChartWrapperProps } from '../chart-wrapper';
import type { EChartsOption } from 'echarts';

// Hoisted mock factory so variables are available in the vi.mock call
const { mockInit, mockSetOption, mockOn, mockDispose } = vi.hoisted(() => {
  const mockSetOption = vi.fn();
  const mockOn = vi.fn();
  const mockDispose = vi.fn();
  const mockInit = vi.fn(() => ({
    setOption: mockSetOption,
    on: mockOn,
    off: vi.fn(),
    dispose: mockDispose,
    resize: vi.fn(),
    getZr: vi.fn(() => ({ on: vi.fn(), off: vi.fn() })),
  }));
  return { mockInit, mockSetOption, mockOn, mockDispose };
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
});
