'use client';

/**
 * useKeyboardShortcuts — Phase 5 keyboard controls for the visualizer page.
 *
 * Scoped to the page that mounts it (currently `app/page.tsx`, alongside the
 * playback driver). Maps:
 *   Space      → play / pause
 *   ArrowLeft  → step back
 *   ArrowRight → step forward
 *   R          → rerun current config from step 0
 *
 * The store stays headless (D-020) — this is purely a DOM listener that
 * DISPATCHES the store's existing actions, adding no new timer. Critical
 * guards keep it from hijacking normal typing/navigation:
 *   - ignored while focus is inside text inputs / selects / sliders / any
 *     contenteditable (so typing a seed in the config panel never triggers it);
 *   - ignored when a modifier (Ctrl/⌘/Alt) is held, so browser & OS shortcuts win.
 */
import { useEffect } from 'react';
import type { StoreApi } from 'zustand/vanilla';
import { simulationStore } from '@/store';
import type { SimulationState } from '@/store/simulation-store';

const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** True when focus sits in an editable / mouse-dragged (slider) surface. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    INTERACTIVE_TAGS.has(target.tagName) ||
    target.isContentEditable ||
    target.closest('[data-slot="slider"]') !== null
  );
}

export function useKeyboardShortcuts(store: StoreApi<SimulationState> = simulationStore): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      switch (event.key) {
        case ' ':
          event.preventDefault(); // stop Space from scrolling a focused page
          store.getState().togglePlay();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          store.getState().stepBack();
          break;
        case 'ArrowRight':
          event.preventDefault();
          store.getState().stepForward();
          break;
        case 'r':
        case 'R':
          store.getState().run();
          break;
        default:
          return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [store]);
}
