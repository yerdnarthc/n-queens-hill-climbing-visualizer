import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { ChartWrapper } from '../chart-wrapper';
import type { ChartWrapperProps } from '../chart-wrapper';
import type { EChartsOption } from 'echarts';

// Hoisted mock factory so variables are available in the vi.mock call.
// The mock instance must support `getOption()` because the dataZoom event
// handler reads back the current zoom range from the chart after a user
// interaction. It also needs `dispatchAction()` because the
// "follow current step" auto-scroll effect calls it to programmatically
// shift the dataZoom window.
const { mockInit, mockSetOption, mockOn, mockDispose, mockGetOption, mockDispatchAction } =
  vi.hoisted(() => {
    const mockSetOption = vi.fn();
    const mockOn = vi.fn();
    const mockDispose = vi.fn();
    const mockDispatchAction = vi.fn();
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
      dispatchAction: mockDispatchAction,
      getZr: vi.fn(() => ({ on: vi.fn(), off: vi.fn() })),
    }));
    return {
      mockInit,
      mockSetOption,
      mockOn,
      mockDispose,
      mockGetOption,
      mockDispatchAction,
    };
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

  // ──────────────────────────────────────────────────────────────────
  // updateAxisPointer + click-fallback (empty-space click-to-scrub)
  // ──────────────────────────────────────────────────────────────────

  it('registers an updateAxisPointer event handler exactly once on init', () => {
    // ECharts dispatches the 'updateAxisPointer' action on every
    // mousemove that updates the axisPointer. We listen for it to track
    // the snapped step number so a click in empty space can still
    // resolve to a step (the "click in the gaps" UX fix).
    renderChartWrapper();

    const updateAxisPointerRegs = mockOn.mock.calls.filter(
      (call: unknown[]) => call[0] === 'updateAxisPointer',
    );
    expect(updateAxisPointerRegs).toHaveLength(1);
    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it("click handler falls back to the axisPointer's last known value on empty-space clicks", () => {
    // The Landscape chart is a scatter series — clicking in the empty
    // space between markers does not produce a `dataIndex` in the click
    // event. The fallback path uses the last `updateAxisPointer` value
    // so clicks anywhere on the plot still resolve to a step.
    const callback = vi.fn();
    renderChartWrapper({ onPointClick: callback });

    // Step 1: the user hovers over the chart. ECharts dispatches
    // 'updateAxisPointer' with axesInfo[0].value = 3 (the snapped step).
    const updateAxisPointerHandler = mockOn.mock.calls.find(
      (call: unknown[]) => call[0] === 'updateAxisPointer',
    )?.[1] as (params: unknown) => void;

    act(() => {
      updateAxisPointerHandler({ axesInfo: [{ value: 3 }] });
    });

    // Step 2: the user clicks on empty space — params has no dataIndex
    // and no value[0], so the original handler can't resolve a step.
    const clickHandler = mockOn.mock.calls.find((call: unknown[]) => call[0] === 'click')?.[1] as (
      params: unknown,
    ) => void;

    act(() => {
      // Simulate a click on the grid background (no series element hit).
      clickHandler({});
    });

    // The fallback should have resolved to step 3 from the axisPointer.
    expect(callback).toHaveBeenCalledWith(3);
  });

  it('click handler prefers dataIndex when the click hits a series element', () => {
    // The dataIndex path is still the primary way clicks resolve. The
    // axisPointer fallback should only kick in when dataIndex is
    // absent. This test pins the priority: direct hit > value[0] > fallback.
    const callback = vi.fn();
    renderChartWrapper({ onPointClick: callback });

    // Pretend the axisPointer is hovering over step 7.
    const updateAxisPointerHandler = mockOn.mock.calls.find(
      (call: unknown[]) => call[0] === 'updateAxisPointer',
    )?.[1] as (params: unknown) => void;
    act(() => {
      updateAxisPointerHandler({ axesInfo: [{ value: 7 }] });
    });

    // Now the user clicks directly on a marker with dataIndex: 2.
    const clickHandler = mockOn.mock.calls.find((call: unknown[]) => call[0] === 'click')?.[1] as (
      params: unknown,
    ) => void;
    act(() => {
      clickHandler({ dataIndex: 2 });
    });

    // dataIndex wins (2), not the axisPointer value (7).
    expect(callback).toHaveBeenCalledWith(2);
    expect(callback).not.toHaveBeenCalledWith(7);
  });

  it('click handler does nothing if no onPointClick callback is provided', () => {
    // Defensive — the axisPointer tracking itself should not crash
    // when there is no consumer.
    renderChartWrapper();

    const updateAxisPointerHandler = mockOn.mock.calls.find(
      (call: unknown[]) => call[0] === 'updateAxisPointer',
    )?.[1] as (params: unknown) => void;
    const clickHandler = mockOn.mock.calls.find((call: unknown[]) => call[0] === 'click')?.[1] as (
      params: unknown,
    ) => void;

    expect(() => {
      act(() => {
        updateAxisPointerHandler({ axesInfo: [{ value: 5 }] });
      });
      act(() => {
        clickHandler({});
      });
    }).not.toThrow();
  });

  it('updateAxisPointer handler ignores payloads with no numeric axesInfo value', () => {
    // Defensive: ECharts can dispatch updateAxisPointer with the pointer
    // having no value (e.g. when the cursor leaves the plot). The ref
    // should remain at its previous value, and the click fallback should
    // still use that previous value rather than blowing up.
    const callback = vi.fn();
    renderChartWrapper({ onPointClick: callback });

    const updateAxisPointerHandler = mockOn.mock.calls.find(
      (call: unknown[]) => call[0] === 'updateAxisPointer',
    )?.[1] as (params: unknown) => void;

    // First, set a known good value.
    act(() => {
      updateAxisPointerHandler({ axesInfo: [{ value: 4 }] });
    });

    // Then a no-value dispatch (e.g. cursor left the plot).
    act(() => {
      updateAxisPointerHandler({ axesInfo: [{}] });
    });
    act(() => {
      updateAxisPointerHandler({ axesInfo: [] });
    });

    // The click fallback should still resolve to the last good value (4).
    const clickHandler = mockOn.mock.calls.find((call: unknown[]) => call[0] === 'click')?.[1] as (
      params: unknown,
    ) => void;
    act(() => {
      clickHandler({});
    });

    expect(callback).toHaveBeenCalledWith(4);
  });

  // ──────────────────────────────────────────────────────────────────
  // followStep — auto-scroll the dataZoom window to keep the
  // current-step marker visible.
  // ──────────────────────────────────────────────────────────────────

  it('does not call dispatchAction when followStep is not provided', () => {
    // Baseline: no followStep prop → the wrapper must not touch the
    // dataZoom window. This is the "feature off" path.
    renderChartWrapper();
    expect(mockDispatchAction).not.toHaveBeenCalled();
  });

  it('does not call dispatchAction when the marker is already inside the window', () => {
    // Default mock window is 0–100. Marker at step 50 → in view → no
    // dispatch. This pins the most important invariant of the feature:
    // if the marker is visible, do nothing.
    renderChartWrapper({
      followStep: { currentStep: 50, firstStep: 0, lastStep: 100 },
    });
    expect(mockDispatchAction).not.toHaveBeenCalled();
  });

  it('dispatches a dataZoom action when the marker scrolls past the right edge', () => {
    // Window 0–60, marker at step 80 of 0–100 (pct=80 > 60).
    // width=60. newEnd = min(100, 80 + 60*0.3) = 98.
    // newStart = max(0, 98 - 60) = 38.
    mockGetOption.mockReturnValue({
      dataZoom: [
        { start: 0, end: 60 },
        { type: 'slider', start: 0, end: 60 },
      ],
    });

    renderChartWrapper({
      followStep: { currentStep: 80, firstStep: 0, lastStep: 100 },
    });

    expect(mockDispatchAction).toHaveBeenCalledTimes(1);
    expect(mockDispatchAction).toHaveBeenCalledWith({
      type: 'dataZoom',
      dataZoomIndex: 1,
      start: 38,
      end: 98,
      // `animation: { duration: 50 }` overrides ECharts' internal
      // dataZoom slider animation so the handle snaps (with a brief
      // 50ms confirmation) to the new range, matching the markLine's
      // snappy cursor mode set in `chart-helpers.ts`. Without this,
      // the slider handle would slide for ~300ms after every
      // auto-scroll, reading as perceptible lag.
      animation: { duration: 50 },
    });
  });

  it('dispatches a dataZoom action when the marker scrolls past the left edge', () => {
    // Window 30–80, marker at step 20 of 0–100 (pct=20 < 30).
    // newStart = max(0, 20 - 50*0.3) = 5. newEnd = 55.
    mockGetOption.mockReturnValue({
      dataZoom: [
        { start: 30, end: 80 },
        { type: 'slider', start: 30, end: 80 },
      ],
    });

    renderChartWrapper({
      followStep: { currentStep: 20, firstStep: 0, lastStep: 100 },
    });

    expect(mockDispatchAction).toHaveBeenCalledTimes(1);
    expect(mockDispatchAction).toHaveBeenCalledWith({
      type: 'dataZoom',
      dataZoomIndex: 1,
      start: 5,
      end: 55,
      // See the scroll-right test for the rationale on
      // `animation: { duration: 50 }`.
      animation: { duration: 50 },
    });
  });

  it('falls back to the first dataZoom entry if the slider entry is missing', () => {
    // Defensive: if ECharts ever returns a single-entry dataZoom, the
    // effect should still find a start/end to use. Same fallback chain
    // as the `datazoom` event handler.
    mockGetOption.mockReturnValue({
      dataZoom: [{ start: 20, end: 70 }],
    });

    // Marker at 90 of 0–100, past the right edge of 20–70.
    // width=50. newEnd = min(100, 90 + 50*0.3) = 100. newStart = 50.
    renderChartWrapper({
      followStep: { currentStep: 90, firstStep: 0, lastStep: 100 },
    });

    expect(mockDispatchAction).toHaveBeenCalledWith({
      type: 'dataZoom',
      dataZoomIndex: 1,
      start: 50,
      end: 100,
      // See the scroll-right test for the rationale on
      // `animation: { duration: 50 }`.
      animation: { duration: 50 },
    });
  });

  it('does not call dispatchAction when currentStep is out of data range (defensive guard)', () => {
    // Engine should clamp currentStep, but if it ever leaks an
    // out-of-range value, the wrapper should no-op rather than fight
    // the engine. The pure function returns null in this case.
    renderChartWrapper({
      followStep: { currentStep: 999, firstStep: 0, lastStep: 100 },
    });
    expect(mockDispatchAction).not.toHaveBeenCalled();
  });

  it('does not call dispatchAction when the dataZoom entry is missing entirely', () => {
    // If ECharts returns no dataZoom (e.g. before init completes), the
    // effect should bail rather than crash.
    mockGetOption.mockReturnValue({ dataZoom: undefined } as never);
    renderChartWrapper({
      followStep: { currentStep: 80, firstStep: 0, lastStep: 100 },
    });
    expect(mockDispatchAction).not.toHaveBeenCalled();
  });
});
