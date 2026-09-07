import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { QueenGlyph } from '../queen-glyph';

/**
 * Structural test for QueenGlyph — verifies the classic queen artwork
 * (nikfrank/react-chess-pieces Q-white paths, Cburnett-derived):
 *  - one decorative <svg> landmark (aria-hidden)
 *  - 5 coronet balls + crown + body + 2 collar detail lines
 *  - silhouette fills currentColor, outline/details stroke the passed class
 *  - no gradient definitions anywhere (flat by design)
 */
describe('QueenGlyph', () => {
  it('renders a decorative svg with the five-ball coronet', () => {
    const { container } = render(
      <QueenGlyph className="text-stone-100" strokeClassName="stroke-stone-900" />,
    );
    const svg = screen.getByTestId('queen-glyph');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('viewBox')).toBe('0 0 45 45');
    expect(container.querySelectorAll('circle').length).toBe(5);
  });

  it('fills the silhouette with currentColor and strokes the outline class', () => {
    const { container } = render(
      <QueenGlyph className="text-stone-100" strokeClassName="stroke-stone-900" />,
    );
    const group = container.querySelector('g');
    expect(group?.getAttribute('fill')).toBe('currentColor');
    expect(group?.getAttribute('class')).toContain('stroke-stone-900');
    // Crown + body + 2 detail paths, all stroked (no fill on the details).
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(4);
    const detailLines = container.querySelectorAll('path[fill="none"]');
    expect(detailLines.length).toBe(2);
  });

  it('contains no gradient definitions (flat by design)', () => {
    const { container } = render(
      <QueenGlyph className="text-stone-100" strokeClassName="stroke-stone-900" />,
    );
    expect(container.innerHTML).not.toContain('linearGradient');
    expect(container.innerHTML).not.toContain('radialGradient');
    expect(container.innerHTML).not.toMatch(/gradient/i);
  });
});
