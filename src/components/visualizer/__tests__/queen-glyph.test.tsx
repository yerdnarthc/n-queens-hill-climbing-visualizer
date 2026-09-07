import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { QueenGlyph } from '../queen-glyph';

/**
 * Structural test for QueenGlyph — verifies the flat Staunton silhouette:
 *  - one <svg> landmark (decorative ⇒ aria-hidden)
 *  - 5 coronet balls + crown/stem/base shapes, all filling currentColor
 *  - detail lines render ONLY when a detailClassName is given (the echo
 *    ghost omits them for a pure one-color dissolve)
 */
describe('QueenGlyph', () => {
  it('renders a decorative svg with the five-ball coronet', () => {
    const { container } = render(<QueenGlyph className="text-stone-100" />);
    const svg = screen.getByTestId('queen-glyph');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('circle').length).toBeGreaterThanOrEqual(5);
  });

  it('fills the silhouette with currentColor and no gradients', () => {
    const { container } = render(<QueenGlyph className="text-stone-100" />);
    const filled = container.querySelectorAll('[fill="currentColor"]');
    expect(filled.length).toBeGreaterThan(0);
    expect(container.innerHTML).not.toContain('linearGradient');
    expect(container.innerHTML).not.toContain('radialGradient');
  });

  it('renders detail lines only when detailClassName is provided', () => {
    const bare = render(<QueenGlyph />);
    expect(bare.container.querySelectorAll('g[fill="none"]').length).toBe(0);
    bare.unmount();

    const detailed = render(<QueenGlyph detailClassName="stroke-stone-900" />);
    const details = detailed.container.querySelectorAll('g[fill="none"]');
    expect(details.length).toBe(1);
    expect(details[0]?.getAttribute('class')).toContain('stroke-stone-900');
  });
});
