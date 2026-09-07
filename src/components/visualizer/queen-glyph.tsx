'use client';

/**
 * QueenGlyph — the classic Staunton queen artwork from
 * `nikfrank/react-chess-pieces` (`src/Q-white.svg`: five coronet balls,
 * zigzag crown, curved body, two collar detail lines), which itself derives
 * from the Wikimedia "Chess Pieces Sprite" standard set by Cburnett
 * (CC BY-SA 3.0 — attribution recorded here and in `memory-bank/
 * DECISIONS.md` D-049).
 *
 * Adapted for our state system: the source uses fixed `#ffffff` fill +
 * `#000000` stroke, but our queens sit on state-colored discs, so fill is
 * `currentColor` (set the size + ink via `className`, e.g. `h-3/4 w-3/4
 * text-stone-100`) and the outline + detail lines stroke in the tone passed
 * as a Tailwind `stroke-*` class via `strokeClassName` (e.g.
 * `stroke-stone-900`). Same two-tone contract as the source — white ink,
 * dark outline — parameterized instead of hardcoded. Ball circles follow
 * the set's black-queen variant (clean `<circle>` elements rather than the
 * white variant's translated arc paths); crown/body/detail paths follow
 * the white variant.
 *
 * Always `aria-hidden`: state meaning lives in the badges, labels, and
 * rings around the token, never in this decoration.
 */
interface QueenGlyphProps {
  /** Size + silhouette ink (e.g. `"h-3/4 w-3/4 text-stone-100"`). */
  className?: string;
  /** Outline + detail-line tone as a Tailwind stroke class
   * (e.g. `"stroke-stone-900"`). Required — the design's character comes
   * from its dark keyline; the echo ghost passes its own ink color for a
   * one-color dissolve. */
  strokeClassName: string;
}

export function QueenGlyph({ className, strokeClassName }: QueenGlyphProps) {
  return (
    <svg viewBox="0 0 45 45" className={className} aria-hidden="true" data-testid="queen-glyph">
      <g
        fill="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeClassName}
      >
        {/* Coronet balls */}
        <circle cx="6" cy="12" r="2.75" />
        <circle cx="14" cy="9" r="2.75" />
        <circle cx="22.5" cy="8" r="2.75" />
        <circle cx="31" cy="9" r="2.75" />
        <circle cx="39" cy="12" r="2.75" />
        {/* Zigzag crown */}
        <path
          d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38,14 L 31,25 L 31,11 L 25.5,24.5 L 22.5,9.5 L 19.5,24.5 L 14,10.5 L 14,25 L 7,14 L 9,26 z"
          strokeLinecap="butt"
        />
        {/* Curved body + base */}
        <path
          d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 10.5,36 10.5,36 C 9,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z"
          strokeLinecap="butt"
        />
        {/* Collar detail lines (fill none, same outline tone as the source) */}
        <path d="M 11.5,30 C 15,29 30,29 33.5,30" fill="none" />
        <path d="M 12,33.5 C 18,32.5 27,32.5 33,33.5" fill="none" />
      </g>
    </svg>
  );
}
