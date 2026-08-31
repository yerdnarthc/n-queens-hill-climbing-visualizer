import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
