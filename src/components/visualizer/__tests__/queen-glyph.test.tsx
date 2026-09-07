import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { QueenGlyph } from '../queen-glyph';

/**
 * Structural test for QueenGlyph — verifies the user-supplied queen artwork
 * (`src/assets/icons/chess-queen.svg`, inlined as path data):
 *  - one decorative <svg> landmark (aria-hidden) on the 512 grid
 *  - a single silhouette path filling currentColor (no strokes, no gradients)
 */
describe('QueenGlyph', () => {
  it('renders a decorative svg on the 512 grid', () => {
    render(<QueenGlyph className="text-stone-100" />);
    const svg = screen.getByTestId('queen-glyph');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('viewBox')).toBe('0 0 512 512');
  });

  it('is a single solid silhouette filling currentColor', () => {
    const { container } = render(<QueenGlyph className="text-stone-100" />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(1);
    expect(paths[0]?.getAttribute('fill')).toBe('currentColor');
    expect(paths[0]?.getAttribute('d')?.length).toBeGreaterThan(100);
  });

  it('contains no strokes or gradient definitions (flat by design)', () => {
    const { container } = render(<QueenGlyph className="text-stone-100" />);
    expect(container.querySelectorAll('[stroke]').length).toBe(0);
    expect(container.innerHTML).not.toMatch(/gradient/i);
  });
});
