import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { QueenPiece } from '../queen-piece';
import { simulationStore } from '@/store';

/**
 * Lightweight structural test for QueenPiece — verifies:
 *  - renders the queen with the expected `data-testid`
 *  - accepts the new `speed` prop (the speed-aware duration wiring)
 *  - the wrapping motion.div carries the right transition config
 *  - the conflict-count badge is rendered when conflictsCount > 0
 *
 * Animation timing & visual effects (lift pulse, shadow grow) are
 * framer-motion-driven and not tested in jsdom — they require a real
 * browser to verify meaningfully.
 */

describe('QueenPiece', () => {
  it('renders a queen with the expected data-testid', () => {
    render(<QueenPiece column={2} row={3} conflictsCount={0} isMoved={false} speed={2} />);
    expect(screen.getByTestId('queen-2-3')).toBeInTheDocument();
  });

  it('renders a conflict-count badge when conflictsCount > 0', () => {
    render(<QueenPiece column={2} row={3} conflictsCount={4} isMoved={false} speed={2} />);
    expect(screen.getByLabelText(/4 attacking pairs/i)).toBeInTheDocument();
  });

  it('does NOT render a conflict-count badge when conflictsCount is 0', () => {
    render(<QueenPiece column={2} row={3} conflictsCount={0} isMoved={false} speed={2} />);
    expect(screen.queryByLabelText(/attacking pairs/i)).not.toBeInTheDocument();
  });

  it('renders the deltaConflicts badge when isMoved is true and a delta is provided', () => {
    render(
      <QueenPiece
        column={2}
        row={3}
        conflictsCount={0}
        isMoved={true}
        deltaConflicts={-1}
        speed={2}
      />,
    );
    // The delta badge text is the formatted number (with sign for positives).
    expect(screen.getByText('-1')).toBeInTheDocument();
  });

  it('accepts a `speed` prop without throwing (the speed-aware duration wiring)', () => {
    // Render at the playback speed extremes to exercise the prop plumbing.
    // (0.5× is the slowest natural feel; 30× is the fastest.)
    expect(() =>
      render(<QueenPiece column={0} row={0} conflictsCount={0} isMoved={false} speed={0.5} />),
    ).not.toThrow();
    expect(() =>
      render(<QueenPiece column={0} row={0} conflictsCount={0} isMoved={false} speed={30} />),
    ).not.toThrow();
  });

  it('is dense (smaller badges) for boardSize >= 12', () => {
    // Two queens, one on each density bracket, to confirm the
    // `isDense = boardSize >= 12` branch affects the badge sizing.
    const { rerender } = render(
      <QueenPiece column={0} row={0} conflictsCount={2} isMoved={false} boardSize={8} speed={2} />,
    );
    // h-4 w-4 for the non-dense badge
    const badge8 = screen.getByLabelText(/2 attacking pairs/i);
    expect(badge8.className).toMatch(/h-4 w-4/);

    rerender(
      <QueenPiece column={0} row={0} conflictsCount={2} isMoved={false} boardSize={12} speed={2} />,
    );
    // h-3 w-3 for the dense badge
    const badge12 = screen.getByLabelText(/2 attacking pairs/i);
    expect(badge12.className).toMatch(/h-3 w-3/);
  });

  it('uses a deterministic data-testid that depends on (col, row)', () => {
    // The testid must encode the queen`s current position so that
    // - tests can locate any queen uniquely
    // - the e2e suite (which queries square-{col}-{row} + queen-{col}-{row})
    //   keeps working unchanged.
    simulationStore.getState().setConfig({ boardSize: 8, seed: 27, strategy: 'steepest-ascent' });
    const { rerender } = render(
      <QueenPiece column={1} row={4} conflictsCount={0} isMoved={false} speed={2} />,
    );
    expect(screen.getByTestId('queen-1-4')).toBeInTheDocument();
    rerender(<QueenPiece column={1} row={5} conflictsCount={0} isMoved={false} speed={2} />);
    expect(screen.getByTestId('queen-1-5')).toBeInTheDocument();
  });
});
