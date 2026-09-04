import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { MoveTrajectory } from '../move-trajectory';
import type { MoveDetail } from '@/lib/engine';

/**
 * Lightweight structural test for MoveTrajectory — verifies:
 *  - renders nothing when `move` is null
 *  - renders the SVG with the expected testid when `move` is set
 *  - the line's x1/y1/x2/y2 attrs reflect origin/destination correctly
 *    (chessboard grid is 100×100 in this test, so coordinates are
 *     computed as fractions of the rect)
 *  - the static (reduced-motion) branch is taken when `reducedMotion` is true
 *
 * Visual aspects (line draw animation, gradient stops) are CSS-driven and
 * not tested here — they require a real browser to verify meaningfully.
 */

// jsdom returns 0×0 for getBoundingClientRect() by default. We mock the
// grid element to return a known size so coordinate math is testable.
const MOCK_RECT = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 100,
  bottom: 100,
  width: 100,
  height: 100,
  toJSON() {
    return this;
  },
} as DOMRect;

function makeGridRef(): React.RefObject<HTMLDivElement | null> {
  const el = document.createElement('div');
  // Override getBoundingClientRect on this test-only element. Cast to
  // `unknown` first to bypass the strict DOMRect-only signature; jsdom
  // returns a real DOMRect by default, but here we want a known size.
  (el as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () =>
    MOCK_RECT;
  return { current: el };
}

describe('MoveTrajectory', () => {
  beforeEach(() => {
    // jsdom lacks ResizeObserver — stub it.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it('renders nothing when move is null', () => {
    const ref = makeGridRef();
    const { container } = render(
      <MoveTrajectory move={null} boardSize={8} gridRef={ref} durationMs={300} />,
    );
    expect(screen.queryByTestId('move-trajectory')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders an SVG with the expected testid when move is set', () => {
    const ref = makeGridRef();
    const move: MoveDetail = {
      column: 2,
      fromRow: 1,
      toRow: 5,
      deltaConflicts: -1,
      evaluatedMoves: 8,
    };
    render(<MoveTrajectory move={move} boardSize={8} gridRef={ref} durationMs={300} />);
    expect(screen.getByTestId('move-trajectory')).toBeInTheDocument();
  });

  it('computes the line endpoints from the (col, fromRow, toRow) move + boardSize', () => {
    const ref = makeGridRef();
    const move: MoveDetail = {
      column: 2,
      fromRow: 1,
      toRow: 5,
      deltaConflicts: -1,
      evaluatedMoves: 8,
    };
    const { container } = render(
      <MoveTrajectory move={move} boardSize={8} gridRef={ref} durationMs={300} />,
    );
    const line = container.querySelector('line');
    expect(line).not.toBeNull();
    // cellW = 100/8 = 12.5, cellH = 100/8 = 12.5
    // x1 = (2 + 0.5) * 12.5 = 31.25
    // y1 = (1 + 0.5) * 12.5 = 18.75
    // x2 = (2 + 0.5) * 12.5 = 31.25  (same column)
    // y2 = (5 + 0.5) * 12.5 = 68.75
    expect(line?.getAttribute('x1')).toBe('31.25');
    expect(line?.getAttribute('y1')).toBe('18.75');
    expect(line?.getAttribute('x2')).toBe('31.25');
    expect(line?.getAttribute('y2')).toBe('68.75');
  });

  it('uses a static (un-animated) line when reducedMotion is true', () => {
    const ref = makeGridRef();
    const move: MoveDetail = {
      column: 0,
      fromRow: 0,
      toRow: 3,
      deltaConflicts: 0,
      evaluatedMoves: 4,
    };
    const { container } = render(
      <MoveTrajectory move={move} boardSize={4} gridRef={ref} durationMs={300} reducedMotion />,
    );
    const line = container.querySelector('line');
    expect(line).not.toBeNull();
    // The reduced-motion branch does NOT set stroke-dasharray (which is
    // what drives the draw animation in the non-reduced branch). The line
    // is just static at opacity 0.7.
    expect(line?.getAttribute('stroke-dasharray')).toBeNull();
    expect(line?.getAttribute('opacity')).toBe('0.7');
  });
});
