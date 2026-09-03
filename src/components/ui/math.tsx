import * as React from 'react';
import katex from 'katex';
import { cn } from '@/lib/utils';

interface MathProps {
  /** LaTeX source, e.g. "h(s)" or "N(N-1)". */
  children: string;
  /** true = display math (block, centered); false = inline (default). */
  block?: boolean;
  className?: string;
}

/**
 * Renders a LaTeX string via KaTeX. Server-renderable (no client hooks),
 * sanitizes its own output (no XSS surface), and inherits text color from
 * the parent so it works in both light and dark themes automatically.
 *
 * Use inline (default) for variables in flowing prose; pass `block` for
 * standalone equations that should be centered on their own line.
 */
export function Math({ children, block = false, className }: MathProps) {
  const html = katex.renderToString(children, {
    throwOnError: false, // bad LaTeX → visible error span, not a thrown exception
    displayMode: block,
    output: 'html',
    colorIsTextColor: true, // cascade color from parent (works with dark/light)
    strict: 'ignore', // allow HTML entities without complaint
  });

  return (
    <span
      // KaTeX generates well-formed HTML and self-sanitizes; safe to inject.
      dangerouslySetInnerHTML={{ __html: html }}
      className={cn(block ? 'my-0 block text-center' : 'inline', className)}
    />
  );
}
