import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { QueenPiece } from '../queen-piece';
import { simulationStore } from '@/store';

/**
 * Lightweight structural test for QueenPiece — verifies:
 *  - renders the queen with the expected `data-testid`
 *  - accepts the explicit-travel props (x/y/size/durationMs) that replaced
 *    the old `speed` prop + `layout` animation
 *  - the conflict-count badge is rendered when conflictsCount > 0
 *
 * Animation timing & visual effects (travel tween, lift pulse, shadow grow)
 * are Motion-driven and not tested in jsdom — they require a real browser
 * to verify meaningfully.
 */

const TRAVEL = { x: 50, y: 100, size: 50, durationMs: 300, reducedMotion: false } as const;

describe('QueenPiece', () => {
  it('renders a queen with the expected data-testid', () => {
    render(<QueenPiece column={2} row={3} conflictsCount={0} isMoved={false} {...TRAVEL} />);
    expect(screen.getByTestId('queen-2-3')).toBeInTheDocument();
  });

  it('sized itself to exactly one square via inline width/height', () => {
    render(<QueenPiece column={2} row={3} conflictsCount={0} isMoved={false} {...TRAVEL} />);
    const queen = screen.getByTestId('queen-2-3');
    // `size` drives the token footprint — the parent overlay positions it
    // via x/y transforms, so width/height must match the square size.
    expect(queen.style.width).toBe('50px');
    expect(queen.style.height).toBe('50px');
  });

  it('renders a conflict-count badge when conflictsCount > 0', () => {
    render(<QueenPiece column={2} row={3} conflictsCount={4} isMoved={false} {...TRAVEL} />);
    expect(screen.getByLabelText(/4 attacking pairs/i)).toBeInTheDocument();
  });

  it('does NOT render a conflict-count badge when conflictsCount is 0', () => {
    render(<QueenPiece column={2} row={3} conflictsCount={0} isMoved={false} {...TRAVEL} />);
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
        {...TRAVEL}
      />,
    );
    // The delta badge text is the formatted number (with sign for positives).
    expect(screen.getByText('-1')).toBeInTheDocument();
  });

  it('accepts travel props without throwing (the explicit x/y wiring)', () => {
    // Render at the duration extremes to exercise the prop plumbing.
    // (0 = reduced-motion snap; 400 = slowest graceful arc.)
    expect(() =>
      render(<QueenPiece column={0} row={0} conflictsCount={0} isMoved={false} {...TRAVEL} />),
    ).not.toThrow();
    expect(() =>
      render(
        <QueenPiece
          column={0}
          row={0}
          conflictsCount={0}
          isMoved={false}
          x={0}
          y={0}
          size={40}
          durationMs={0}
          reducedMotion={true}
        />,
      ),
    ).not.toThrow();
  });

  it('is dense (smaller badges) for boardSize >= 12', () => {
    // Two queens, one on each density bracket, to confirm the
    // `isDense = boardSize >= 12` branch affects the badge sizing.
    const { rerender } = render(
      <QueenPiece
        column={0}
        row={0}
        conflictsCount={2}
        isMoved={false}
        boardSize={8}
        {...TRAVEL}
      />,
    );
    // h-4 w-4 for the non-dense badge
    const badge8 = screen.getByLabelText(/2 attacking pairs/i);
    expect(badge8.className).toMatch(/h-4 w-4/);

    rerender(
      <QueenPiece
        column={0}
        row={0}
        conflictsCount={2}
        isMoved={false}
        boardSize={12}
        {...TRAVEL}
      />,
    );
    // h-3 w-3 for the dense badge
    const badge12 = screen.getByLabelText(/2 attacking pairs/i);
    expect(badge12.className).toMatch(/h-3 w-3/);
  });

  it('uses flat fills (no gradients) in every state', () => {
    // Regression guard for the minimal flat restyle: neither the halo,
    // the token disc, nor the badges may use gradient fills.
    const { rerender } = render(
      <QueenPiece column={2} row={3} conflictsCount={0} isMoved={false} {...TRAVEL} />,
    );
    const queen = screen.getByTestId('queen-2-3');
    const hasGradient = () =>
      [...queen.querySelectorAll('div, span')].some((el) => el.className.includes('gradient'));
    expect(hasGradient()).toBe(false);

    rerender(<QueenPiece column={2} row={3} conflictsCount={4} isMoved={false} {...TRAVEL} />);
    expect(hasGradient()).toBe(false);

    rerender(
      <QueenPiece
        column={2}
        row={3}
        conflictsCount={0}
        isMoved={true}
        deltaConflicts={-1}
        {...TRAVEL}
      />,
    );
    expect(hasGradient()).toBe(false);
  });

  it('renders the flat queen glyph inside the token', () => {
    const { container } = render(
      <QueenPiece column={2} row={3} conflictsCount={0} isMoved={false} {...TRAVEL} />,
    );
    expect(container.querySelector('[data-testid="queen-glyph"]')).not.toBeNull();
  });

  it('uses a deterministic data-testid that depends on (col, row)', () => {
    // The testid must encode the queen`s current position so that
    // - tests can locate any queen uniquely
    // - the e2e suite (which queries square-{col}-{row} + queen-{col}-{row})
    //   keeps working unchanged.
    simulationStore.getState().setConfig({ boardSize: 8, seed: 27, strategy: 'steepest-ascent' });
    const { rerender } = render(
      <QueenPiece column={1} row={4} conflictsCount={0} isMoved={false} {...TRAVEL} />,
    );
    expect(screen.getByTestId('queen-1-4')).toBeInTheDocument();
    rerender(<QueenPiece column={1} row={5} conflictsCount={0} isMoved={false} {...TRAVEL} />);
    expect(screen.getByTestId('queen-1-5')).toBeInTheDocument();
  });
});
