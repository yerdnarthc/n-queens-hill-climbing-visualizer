import { describe, it, expect } from 'vitest';
import { createTourUiStore } from '../tour-ui-store';

describe('tour-ui-store', () => {
  it('starts calm (glow visible) and toggles on demand', () => {
    const store = createTourUiStore();
    expect(store.getState().calmQueens).toBe(false);
    store.getState().setCalmQueens(true);
    expect(store.getState().calmQueens).toBe(true);
    store.getState().setCalmQueens(false);
    expect(store.getState().calmQueens).toBe(false);
  });
});
