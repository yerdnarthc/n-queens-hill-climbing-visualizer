import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OriginEcho } from '../origin-echo';

/**
 * Lightweight structural test for OriginEcho — verifies:
 *  - renders nothing when `move` is null
 *  - renders nothing when fromRow === toRow (defensive no-op)
 *  - renders a data-testid="origin-echo" element when a real move fires,
 *    carrying the ghost crown + origin-row label
 *
 * The fade/bloom animation is Motion-driven and not tested here — it
 * requires a real browser to verify meaningfully.
 */

describe('OriginEcho', () => {
  it('renders nothing when move is null', () => {
    const { container } = render(<OriginEcho move={null} durationMs={300} reducedMotion={false} />);
    expect(screen.queryByTestId('origin-echo')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when fromRow === toRow (defensive no-op)', () => {
    const { container } = render(
      <OriginEcho
        move={{ column: 1, fromRow: 3, toRow: 3 }}
        durationMs={300}
        reducedMotion={false}
      />,
    );
    expect(screen.queryByTestId('origin-echo')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders a data-testid="origin-echo" element when a real move fires', () => {
    render(
      <OriginEcho
        move={{ column: 1, fromRow: 2, toRow: 5 }}
        durationMs={300}
        reducedMotion={false}
      />,
    );
    expect(screen.getByTestId('origin-echo')).toBeInTheDocument();
  });

  it('renders the ghost crown and the origin-row label', () => {
    const { container } = render(
      <OriginEcho
        move={{ column: 1, fromRow: 2, toRow: 5 }}
        durationMs={300}
        reducedMotion={false}
      />,
    );
    // The ghost is a lucide Crown (an <svg>); the label names the 1-indexed
    // origin row (0-indexed row 2 ⇒ "R3").
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('R3')).toBeInTheDocument();
  });

  it('includes a title attribute that surfaces the from-row in human form', () => {
    render(
      <OriginEcho
        move={{ column: 1, fromRow: 2, toRow: 5 }}
        durationMs={300}
        reducedMotion={false}
      />,
    );
    // fromRow is 0-indexed internally; the title surfaces it as 1-indexed
    // for users (e.g. "Moved from row 3" = 0-indexed row 2).
    expect(screen.getByTestId('origin-echo').getAttribute('title')).toBe('Moved from row 3');
  });

  it('renders the static marker (same contract) under reduced motion', () => {
    render(
      <OriginEcho move={{ column: 1, fromRow: 2, toRow: 5 }} durationMs={0} reducedMotion={true} />,
    );
    expect(screen.getByTestId('origin-echo')).toBeInTheDocument();
    expect(screen.getByText('R3')).toBeInTheDocument();
  });
});
