'use client';

/**
 * QueenGlyph — a minimal flat Staunton queen silhouette (own drawing, 45×45
 * viewBox to match the classic chess-diagram grid).
 *
 * Why not the lucide `Crown`? A generic crown icon in a gradient bubble is
 * what made the old token read as AI-slop. A real queen reads instantly:
 * five-ball coronet → zigzag crown → collar bar → tapered stem → wide base
 * (proportions eyeballed against the Cburnett standard set, then reduced to
 * straight geometry — no curves except the ball circles and bar end-caps).
 *
 * Flat by design: the silhouette fills `currentColor` (set the size + ink
 * via `className`, e.g. `h-1/2 w-1/2 text-stone-100`), and the two inner
 * detail lines + stem jewel stroke in a second tone passed as a Tailwind
 * `stroke-*` class via `detailClassName` (e.g. `stroke-stone-900`). No
 * gradients, no blur, no drop-shadows — the disc and ring around it carry
 * the state color. Always `aria-hidden`: state meaning lives in the badges,
 * labels, and rings, never in this decoration.
 */
interface QueenGlyphProps {
  /** Size + silhouette ink (e.g. `"h-1/2 w-1/2 text-stone-100"`). */
  className?: string;
  /** Detail-line tone as a Tailwind stroke class (e.g. `"stroke-stone-900"`).
   * Omit for a pure one-color silhouette (used by the dissolving ghost). */
  detailClassName?: string;
}

export function QueenGlyph({ className, detailClassName }: QueenGlyphProps) {
  return (
    <svg viewBox="0 0 45 45" className={className} aria-hidden="true" data-testid="queen-glyph">
      {/* Coronet balls */}
      <g fill="currentColor">
        <circle cx="6" cy="12" r="2.3" />
        <circle cx="14" cy="9" r="2.3" />
        <circle cx="22.5" cy="7" r="2.3" />
        <circle cx="31" cy="9" r="2.3" />
        <circle cx="39" cy="12" r="2.3" />
        {/* Zigzag crown */}
        <path d="M9 26 L7 14 L13 22 L14 11 L19.5 23.5 L22.5 9.5 L25.5 23.5 L31 11 L32 22 L38 14 L36 26 Z" />
        {/* Collar bar */}
        <rect x="8.5" y="25.5" width="28" height="3.6" rx="1.8" />
        {/* Tapered stem */}
        <path d="M15.5 29.5 L29.5 29.5 L32.5 37 L12.5 37 Z" />
        {/* Base bar */}
        <rect x="8" y="37" width="29" height="4.6" rx="2.3" />
      </g>
      {/* Inner details in the second tone */}
      {detailClassName !== undefined && (
        <g
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={detailClassName}
          aria-hidden="true"
        >
          <path d="M12.5 27.3 H32.5" />
          <circle cx="22.5" cy="33.4" r="1.3" />
          <path d="M12.5 39.3 H32.5" />
        </g>
      )}
    </svg>
  );
}
