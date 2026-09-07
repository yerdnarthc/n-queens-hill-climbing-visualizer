'use client';

import * as React from 'react';

/**
 * useScrollLock — hard body scroll lock while `locked` is true.
 *
 * Used by the onboarding tour: while the tour is open the page must not
 * move under the spotlight (user scrolls fought the `getBoundingClientRect`
 * tracking and could strand the spotlight off-screen). The tour's own
 * `scrollIntoView` calls remain the single source of scroll truth.
 *
 * Technique: `position: fixed` + negative `top` (not just
 * `overflow: hidden`) — this also kills iOS rubber-banding and the layout
 * shift from the disappearing scrollbar (`width: 100%` holds the width).
 * On unlock, inline styles are restored and the exact pre-lock `scrollY`
 * is re-applied, so Esc/backdrop-close lands the user where they were.
 */
export function useScrollLock(locked: boolean): void {
  React.useEffect(() => {
    if (!locked) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      overflow: body.style.overflow,
      width: body.style.width,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.overflow = 'hidden';
    body.style.width = '100%';
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.overflow = prev.overflow;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
