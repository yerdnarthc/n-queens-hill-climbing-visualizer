import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { QueenRays } from '../queen-rays';

function RaysHarness({ pinned = false }: { pinned?: boolean }) {
  // Mirrors Chessboard's hover + pinned logic at a smaller harness: pin
  // survives scrubbing conceptually, but we just test hover/pin branching.
  const board = [0, 1, 2, 3] as const;
  const [hovered, setHovered] = React.useState<{ col: number; row: number } | null>(null);
  const [pinnedState, setPinnedState] = React.useState<{ col: number; row: number } | null>(
    pinned ? { col: 0, row: 0 } : null,
  );
  const inspected = pinnedState ?? hovered;
  return (
    <div>
      <button
        type="button"
        aria-label="Queen at a4"
        onMouseEnter={() => setHovered({ col: 0, row: 0 })}
        onMouseLeave={() => setHovered(null)}
        onClick={() => setPinnedState((prev) => (prev?.col === 0 ? null : { col: 0, row: 0 }))}
      >
        queen
      </button>
      <QueenRays
        inspected={inspected}
        board={[...board]}
        cellW={40}
        cellH={40}
        n={4}
        reducedMotion={true}
      />
    </div>
  );
}

describe('Queen attack-ray inspector (QueenRays)', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });

  it('hides rays when nothing is inspected, shows/hides on hover, pins on tap', async () => {
    render(<RaysHarness />);
    expect(screen.queryByTestId('queen-rays')).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByLabelText(/Queen at a4/i));
    expect(await screen.findByTestId('queen-rays')).toBeInTheDocument();
    expect(screen.getByTestId('queen-ray-hit-1-1')).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByLabelText(/Queen at a4/i));
    expect(screen.queryByTestId('queen-rays')).not.toBeInTheDocument();

    // Tap pins — rays survive "scrub" (unrelated mouseLeave would hide a preview).
    fireEvent.click(screen.getByLabelText(/Queen at a4/i));
    expect(screen.getByTestId('queen-rays')).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByLabelText(/Queen at a4/i));
    expect(screen.getByTestId('queen-rays')).toBeInTheDocument();
    // Second tap unpins.
    fireEvent.click(screen.getByLabelText(/Queen at a4/i));
    expect(screen.queryByTestId('queen-rays')).not.toBeInTheDocument();
  });
});
