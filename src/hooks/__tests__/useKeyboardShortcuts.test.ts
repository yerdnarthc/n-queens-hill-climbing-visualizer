import { act, renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { createSimulationStore } from '../../store/simulation-store';

/**
 * Keyboard shortcut semantics (Phase 5):
 *   Space → togglePlay · ArrowLeft → stepBack · ArrowRight → stepForward · r/R → run
 * Guards: ignored on editable targets (input/textarea/select/contenteditable/slider)
 * and when a modifier key is held. The hook is a DOM listener — no timers involved.
 */
describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.useFakeTimers(); // silence any accidental timer usage; not required by the hook
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mount = () => {
    const store = createSimulationStore();
    const hook = renderHook(() => useKeyboardShortcuts(store));
    return { store, ...hook };
  };

  const press = (key: string, options: KeyboardEventInit = {}) =>
    fireEvent.keyDown(window, { key, ...options });

  it('Space toggles playback', () => {
    const { store } = mount();
    store.getState().run();
    act(() => press(' '));
    expect(store.getState().isPlaying).toBe(true);
    act(() => press(' '));
    expect(store.getState().isPlaying).toBe(false);
  });

  it('ArrowRight steps forward and ArrowLeft steps back', () => {
    const { store } = mount();
    store.getState().run();
    act(() => press('ArrowRight'));
    expect(store.getState().currentStep).toBe(1);
    act(() => press('ArrowLeft'));
    expect(store.getState().currentStep).toBe(0);
  });

  it('ArrowLeft at the start is a safe no-op', () => {
    const { store } = mount();
    store.getState().run();
    act(() => press('ArrowLeft'));
    expect(store.getState().currentStep).toBe(0);
  });

  it('R / r re-runs the current config (cursor resets to 0)', () => {
    const { store } = mount();
    store.getState().run();
    store.getState().jumpTo(3);
    act(() => press('r'));
    expect(store.getState().currentStep).toBe(0);
    store.getState().jumpTo(4);
    act(() => press('R'));
    expect(store.getState().currentStep).toBe(0);
  });

  it('ignores keystrokes while a text input is focused (seed field guard)', () => {
    const { store } = mount();
    store.getState().run();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    act(() => fireEvent.keyDown(input, { key: 'r' }));
    act(() => fireEvent.keyDown(input, { key: ' ' }));
    expect(store.getState().currentStep).toBe(0);
    expect(store.getState().isPlaying).toBe(false);
    document.body.removeChild(input);
  });

  it('ignores keystrokes on slider targets (scrubber drag guard)', () => {
    const { store } = mount();
    store.getState().run();
    const slider = document.createElement('div');
    slider.setAttribute('data-slot', 'slider');
    document.body.appendChild(slider);
    act(() => fireEvent.keyDown(slider, { key: ' ' }));
    expect(store.getState().isPlaying).toBe(false);
    document.body.removeChild(slider);
  });

  it('ignores shortcuts when a modifier key is held (browser shortcuts win)', () => {
    const { store } = mount();
    store.getState().run();
    act(() => press(' ', { ctrlKey: true }));
    act(() => press('ArrowRight', { metaKey: true }));
    expect(store.getState().isPlaying).toBe(false);
    expect(store.getState().currentStep).toBe(0);
  });

  it('removes the listener on unmount', () => {
    const { store, unmount } = mount();
    store.getState().run();
    unmount();
    act(() => press(' '));
    expect(store.getState().isPlaying).toBe(false);
  });
});
