import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollLock } from '../useScrollLock';

/**
 * Contract: while `locked`, the body is pinned with `position: fixed`
 * (kills iOS rubber-banding and scrollbar-shift, unlike overflow-only);
 * on unlock the previous inline styles return and the exact pre-lock
 * `scrollY` is re-applied, so the user lands where they were.
 */
describe('useScrollLock', () => {
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // jsdom has no scrolling viewport — stub it to observe the calls.
    scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.overflow = '';
    document.body.style.width = '';
  });

  it('does nothing while unlocked', () => {
    renderHook(() => useScrollLock(false));
    expect(document.body.style.position).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('locks on mount and restores scroll position on unlock', () => {
    const scrollY = window.scrollY;
    const { rerender, unmount } = renderHook(
      ({ locked }: { locked: boolean }) => useScrollLock(locked),
      { initialProps: { locked: true } },
    );

    expect(document.body.style.position).toBe('fixed');
    // Numeric negation (CSS serializes -0px as 0px; matches the hook).
    expect(document.body.style.top).toBe(`${-scrollY}px`);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.width).toBe('100%');

    rerender({ locked: false });
    expect(document.body.style.position).toBe('');
    expect(document.body.style.top).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(scrollTo).toHaveBeenCalledWith(0, scrollY);
    unmount();
  });

  it('restores pre-existing inline body styles (does not blank them)', () => {
    document.body.style.overflow = 'scroll';
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });
});
