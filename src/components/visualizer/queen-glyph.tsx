'use client';

/**
 * QueenGlyph — the queen artwork from `src/assets/icons/chess-queen.svg`
 * (via SVG Repo), inlined as path data so it themes with the token.
 *
 * The source is a single solid silhouette (crown with ball tips, collar
 * bar, base bar) on a 512×512 grid — no strokes, no detail layer — so this
 * component is one `<path>` filling `currentColor`. Set size + ink via
 * `className` (e.g. `"h-4/5 w-4/5 text-stone-100"`); the surrounding disc
 * and ring carry the state color. Always `aria-hidden`: state meaning
 * lives in the badges, labels, and rings, never in this decoration.
 */
interface QueenGlyphProps {
  /** Size + silhouette ink (inherits `currentColor`, e.g. from the token disc). */
  className?: string;
}

export function QueenGlyph({ className }: QueenGlyphProps) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true" data-testid="queen-glyph">
      <path
        fill="currentColor"
        d="M477.518 181.966a25 25 0 0 1-34.91 23l-62.29 150.26h-248.92l-62.24-150.19a25 25 0 1 1 9.73-7.29l87 71.2 20.92-126.4a25 25 0 1 1 14.7-1.85l54.31 117 54.42-117.3a25 25 0 1 1 14.58 2.08l20.93 126.42 87.26-71.3a25 25 0 1 1 44.51-15.63zm-71.66 241.25h-300v60h300v-60zm-27.75-52h-244.22v36h244.22v-36z"
      />
    </svg>
  );
}
