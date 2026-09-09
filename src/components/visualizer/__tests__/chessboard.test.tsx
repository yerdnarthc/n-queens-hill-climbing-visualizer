import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import * as React from 'react';
import { Chessboard } from '../chessboard';
import { simulationStore } from '@/store';

describe('Chessboard', () => {
  beforeEach(() => {
    simulationStore.getState().setConfig({ boardSize: 4, seed: 42, strategy: 'steepest-ascent' });
  });

  it('renders a 4x4 grid of 16 squares for N=4', () => {
    render(<Chessboard />);
    const grid = screen.getByTestId('chessboard-grid');
    expect(grid).toBeInTheDocument();
    // Overlay-alignment invariant: the measured grid must be borderless
    // so its border-box == the cells area exactly (the ray/queen overlay
    // divides the measured rect by N — a border leaks 2px into every
    // cell and the tints drift off-square, worse at larger N). The 1px
    // board border lives on the grid's parent instead.
    expect(grid.className).not.toMatch(/(^|\s)border(\s|$)/);
    expect(grid.parentElement?.className).toMatch(/(^|\s)border(\s|$)/);

    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        expect(screen.getByTestId(`square-${c}-${r}`)).toBeInTheDocument();
      }
    }
  });

  it('renders exactly 4 queen pieces on the board for N=4', () => {
    render(<Chessboard />);
    const board = simulationStore.getState().result?.snapshots[0].board ?? [];
    expect(board.length).toBe(4);

    for (let col = 0; col < 4; col++) {
      const row = board[col];
      expect(screen.getByTestId(`queen-${col}-${row}`)).toBeInTheDocument();
    }
  });

  it('ghost + moved glow follow the undone move when scrubbing backwards', () => {
    const store = simulationStore.getState();
    store.setConfig({ boardSize: 8, seed: 27, strategy: 'steepest-ascent' });
    const result = simulationStore.getState().result!;
    // First real improving move at k >= 2 (non-zero delta so the badge is
    // observable; k >= 2 so the backward scrub lands on k-1 >= 1, where the
    // reversed ghost is shown — step 0 intentionally shows no trail/ghost).
    const k = result.snapshots.findIndex(
      (s, i) =>
        i >= 2 && s.move !== null && s.move.fromRow !== s.move.toRow && s.move.deltaConflicts !== 0,
    );
    expect(k).toBeGreaterThan(1);
    const mv = result.snapshots[k]!.move!;
    render(<Chessboard />);

    act(() => {
      store.jumpTo(k);
    });
    // Forward arrival: ghost marks where the queen came from.
    expect(screen.getByTestId('origin-echo').getAttribute('title')).toBe(
      `Moved from row ${mv.fromRow + 1}`,
    );

    act(() => {
      store.stepBack();
    });
    // Backward scrub to k-1: ghost must mark the UNDONE move's origin
    // (its toRow — where the queen just left going backward), not the
    // previous queen's path (move_{k-1}).
    expect(screen.getByTestId('origin-echo').getAttribute('title')).toBe(
      `Moved from row ${mv.toRow + 1}`,
    );
    expect(screen.getByText(`R${mv.toRow + 1}`)).toBeInTheDocument();
    // Moved-queen glow follows too, with the negated (truthful reverse) delta.
    const queen = screen.getByTestId(`queen-${mv.column}-${mv.fromRow}`);
    const expected = -mv.deltaConflicts;
    expect(
      within(queen).getByText(expected > 0 ? `+${expected}` : `${expected}`),
    ).toBeInTheDocument();
  });
});
