import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { TourProvider } from '@reactour/tour';
import { InteractiveBeat } from '../tour-interactive-beat';
import type { FlatTourBeat } from '../tour-adapter';
import { simulationStore } from '@/store';

/**
 * Interactive demo beats (Step 1, beats 3–4): watch → continue → do → done.
 * Rendered inside a bare TourProvider — nav actions need the tour context,
 * but phase/copy/gate behavior is asserted on what's rendered.
 */

const TEST_BEAT: FlatTourBeat = {
  key: 'chessboard:hover-invite',
  groupId: 'chessboard',
  topIndex: 0,
  topTotal: 7,
  subIndex: 2,
  subTotal: 10,
  selector: '[data-testid="chessboard-grid"]',
  title: 'Try hovering a queen',
  body: 'Hover any queen piece to see its attacking path light up.',
};

function renderBeat(
  beatId: 'hover-invite' | 'hit-ring' = 'hover-invite',
  beat: FlatTourBeat = TEST_BEAT,
) {
  return render(
    // Two dummy steps so the beat is mid-tour (done shows Next, Back shows).
    <TourProvider
      steps={[
        { selector: 'body', content: 'a' },
        { selector: 'body', content: 'b' },
      ]}
    >
      <InteractiveBeat beat={beat} beatId={beatId} />
    </TourProvider>,
  );
}

/** jsdom has no media engine — stub play() so the replay path stays silent. */
function stubVideoPlay() {
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined) as unknown as (
    this: HTMLMediaElement,
  ) => Promise<void>;
}

const DEFAULT_MATCH_MEDIA = window.matchMedia;

function mockCoarsePointer(coarse: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: coarse && query.includes('coarse'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe('InteractiveBeat', () => {
  beforeEach(() => {
    stubVideoPlay();
    simulationStore.getState().setConfig({ strategy: 'steepest-ascent' });
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: DEFAULT_MATCH_MEDIA });
    document.body
      .querySelectorAll('[data-testid="queen-rays"], [data-testid^="queen-ray-hit-"]')
      .forEach((node) => node.remove());
  });

  it('pauses playback on mount so the board holds still for the demo', () => {
    simulationStore.getState().play();
    expect(simulationStore.getState().isPlaying).toBe(true);
    renderBeat();
    expect(simulationStore.getState().isPlaying).toBe(false);
  });

  it('starts locked: video playing, no nav buttons', () => {
    renderBeat();
    const video = screen.getByTestId('tour-demo-video');
    expect(video.getAttribute('src')).toBe('/tour-demo-vids/hover-queen-demo.mp4');
    expect(screen.queryByRole('button', { name: /^Next$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Continue$/ })).not.toBeInTheDocument();
    expect(screen.getByText(/watch the demo/i)).toBeInTheDocument();
  });

  it('shows Continue after the first loop ends and loops the video', () => {
    renderBeat();
    const video = screen.getByTestId('tour-demo-video');
    fireEvent.ended(video);
    expect(screen.getByRole('button', { name: /^Continue$/ })).toBeInTheDocument();
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('a broken video skips straight to Continue (never traps the user)', () => {
    renderBeat();
    fireEvent.error(screen.getByTestId('tour-demo-video'));
    expect(screen.getByRole('button', { name: /^Continue$/ })).toBeInTheDocument();
  });

  it('Continue opens the do phase with a skip (still no Next)', () => {
    renderBeat();
    fireEvent.ended(screen.getByTestId('tour-demo-video'));
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }));
    expect(screen.getByText(/now you try/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip this demo/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Next$/ })).not.toBeInTheDocument();
  });

  it('rays in the DOM complete the hover beat with an ack + Next', async () => {
    renderBeat();
    fireEvent.ended(screen.getByTestId('tour-demo-video'));
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }));
    const rays = document.createElement('div');
    rays.setAttribute('data-testid', 'queen-rays');
    document.body.appendChild(rays);
    expect(
      await screen.findByRole('button', { name: /^Next$/ }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/attack lines/i)).toBeInTheDocument();
  });

  it('hit-ring waits for an actual red ring — rays alone are not enough', async () => {
    renderBeat('hit-ring', {
      ...TEST_BEAT,
      key: 'chessboard:hit-ring',
      title: 'Red ring = under attack',
    });
    fireEvent.ended(screen.getByTestId('tour-demo-video'));
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }));
    // Rays without hits: still waiting.
    const rays = document.createElement('div');
    rays.setAttribute('data-testid', 'queen-rays');
    document.body.appendChild(rays);
    await expect(
      screen.findByRole('button', { name: /^Next$/ }, { timeout: 300 }),
    ).rejects.toThrow();
    // A rendered ring completes the beat.
    const hit = document.createElement('div');
    hit.setAttribute('data-testid', 'queen-ray-hit-0-0');
    document.body.appendChild(hit);
    expect(
      await screen.findByRole('button', { name: /^Next$/ }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/red rings mean/i)).toBeInTheDocument();
  });

  it('uses tap wording on coarse pointers, hover wording otherwise', () => {
    mockCoarsePointer(true);
    const { unmount } = renderBeat();
    fireEvent.ended(screen.getByTestId('tour-demo-video'));
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }));
    expect(screen.getByText(/tap any queen/i)).toBeInTheDocument();
    unmount();
    mockCoarsePointer(false);
    renderBeat();
    fireEvent.ended(screen.getByTestId('tour-demo-video'));
    fireEvent.click(screen.getByRole('button', { name: /^Continue$/ }));
    expect(screen.getByText(/hover any queen/i)).toBeInTheDocument();
  });
});
