import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OriginEcho } from '../origin-echo';

/**
 * Lightweight structural test for OriginEcho — verifies:
 *  - renders nothing when `move` is null
 *  - renders nothing when fromRow === toRow (defensive no-op)
 *  - renders a data-testid="origin-echo" element when a real move fires
 *
 * The scale/opacity animation is framer-motion-driven and not tested
 * here — it requires a real browser to verify meaningfully.
 */

describe('OriginEcho', () => {
  it('renders nothing when move is null', () => {
    const { container } = render(<OriginEcho move={null} speed={2} />);
    expect(screen.queryByTestId('origin-echo')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when fromRow === toRow (defensive no-op)', () => {
    const { container } = render(
      <OriginEcho move={{ column: 1, fromRow: 3, toRow: 3 }} speed={2} />,
    );
    expect(screen.queryByTestId('origin-echo')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders a data-testid="origin-echo" element when a real move fires', () => {
    render(<OriginEcho move={{ column: 1, fromRow: 2, toRow: 5 }} speed={2} />);
    expect(screen.getByTestId('origin-echo')).toBeInTheDocument();
  });

  it('includes a title attribute that surfaces the from-row in human form', () => {
    render(<OriginEcho move={{ column: 1, fromRow: 2, toRow: 5 }} speed={2} />);
    // fromRow is 0-indexed internally; the title surfaces it as 1-indexed
    // for users (e.g. "Moved from row 3" = 0-indexed row 2).
    expect(screen.getByTestId('origin-echo').getAttribute('title')).toBe('Moved from row 3');
  });

  it('re-keys on the move (a new move gets a fresh element)', () => {
    const { rerender } = render(
      <OriginEcho move={{ column: 1, fromRow: 2, toRow: 5 }} speed={2} />,
    );
    const first = screen.getByTestId('origin-echo');

    rerender(<OriginEcho move={{ column: 1, fromRow: 5, toRow: 6 }} speed={2} />);
    const second = screen.getByTestId('origin-echo');

    // Different keys ⇒ React unmounts and re-mounts the element, so the
    // identity should differ. This is the contract that retriggers the
    // scale/opacity animation on every move.
    expect(first).not.toBe(second);
  });
});
