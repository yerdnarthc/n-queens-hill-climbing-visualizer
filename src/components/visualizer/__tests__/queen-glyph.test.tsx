import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { QueenGlyph } from '../queen-glyph';

/**
 * Structural test for QueenGlyph — verifies the user-supplied queen artwork
 * (`src/assets/icons/chess-queen.svg`, inlined as path data):
 *  - one decorative landmark (aria-hidden) holding the 512-grid svg
 *  - a single silhouette path filling currentColor with a black outline stroke
 *  - glow rendered as a crossfading overlay copy (opacity-only animation),
 *    never as an interpolated filter — so no color math can flash black
 */
describe('QueenGlyph', () => {
  it('renders a decorative landmark with the 512-grid svg', () => {
    render(<QueenGlyph className="text-stone-100" />);
    const glyph = screen.getByTestId('queen-glyph');
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
    const svg = glyph.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 512 512');
  });

  it('is a single solid silhouette filling currentColor', () => {
    const { container } = render(<QueenGlyph className="text-stone-100" />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(1);
    expect(paths[0]?.getAttribute('fill')).toBe('currentColor');
    expect(paths[0]?.getAttribute('d')?.length).toBeGreaterThan(100);
  });

  it('has a black outline stroke and no gradient definitions', () => {
    const { container } = render(<QueenGlyph className="text-stone-100" />);
    const path = container.querySelector('path');
    expect(path?.getAttribute('stroke')).toBe('#000000');
    expect(path?.getAttribute('paint-order')).toBe('stroke');
    expect(container.innerHTML).not.toMatch(/gradient/i);
  });

  it('renders no glow overlay when glow is none', () => {
    const { container } = render(<QueenGlyph className="text-stone-100" glow="none" />);
    expect(container.querySelectorAll('svg').length).toBe(1);
  });

  it('renders the glow as a separate overlay copy carrying its final colored filter', () => {
    const { container } = render(<QueenGlyph className="text-stone-100" glow="conflict" />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
    expect(svgs[1]?.style.filter).toContain('var(--feature-conflict)');
  });

  it('swaps the overlay filter per glow color without touching the base silhouette', () => {
    const { container } = render(<QueenGlyph className="text-stone-100" glow="improving" />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
    expect(svgs[1]?.style.filter).toContain('var(--feature-improving)');
    // Base copy stays unfiltered in all states.
    expect(svgs[0]?.style.filter).toBe('');
  });
});
