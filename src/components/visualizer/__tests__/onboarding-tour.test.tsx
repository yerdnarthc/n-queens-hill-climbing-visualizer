import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import * as React from 'react';
import {
  OnboardingTour,
  ONBOARDING_TOUR_STEPS,
  TOUR_STORAGE_KEY,
  placeTourTooltip,
  reopenOnboardingTour,
} from '../onboarding-tour';
import { simulationStore } from '@/store';

/** Fake page targets so every (non-conditional) step resolves an element. */
function FakeTargets() {
  return (
    <div>
      <div data-tour="board-size">board</div>
      <div data-tour="strategy">strategy</div>
      <div data-tour="seed">seed</div>
      <div data-tour="advanced-trigger" data-state="closed">
        advanced
      </div>
      <div data-tour="plateau">plateau</div>
      <div data-tour="restarts">restarts</div>
      <div data-testid="chessboard-grid">grid</div>
      <div data-tour="playback">playback</div>
      <div data-testid="analytics-panel">analytics</div>
      <div data-testid="stats-rail" data-variant="context">
        stats
      </div>
      <div data-tour="share">share</div>
    </div>
  );
}

function renderOpenTour() {
  window.localStorage.clear();
  return render(
    <>
      <FakeTargets />
      <OnboardingTour />
    </>,
  );
}

describe('placeTourTooltip', () => {
  it('prefers below the spotlight when there is room', () => {
    const tip = placeTourTooltip({ top: 100, left: 200, width: 300, height: 100 }, 1280, 900);
    expect(tip.top).toBe(100 + 100 + 12);
    // Centered on the spotlight.
    expect(tip.left).toBe(200 + 150 - 160);
  });

  it('flips above the spotlight when there is no room below', () => {
    const tip = placeTourTooltip({ top: 800, left: 200, width: 300, height: 80 }, 1280, 900);
    expect(tip.top).toBeLessThan(800);
  });

  it('clamps horizontally into the viewport', () => {
    const leftEdge = placeTourTooltip({ top: 100, left: 0, width: 40, height: 40 }, 1280, 900);
    expect(leftEdge.left).toBeGreaterThanOrEqual(12);
    const rightEdge = placeTourTooltip({ top: 100, left: 1200, width: 60, height: 40 }, 1280, 900);
    expect(rightEdge.left + 320).toBeLessThanOrEqual(1280 - 12 + 1);
  });
});

describe('OnboardingTour', () => {
  beforeEach(() => {
    window.localStorage.clear();
    simulationStore.getState().setConfig({ strategy: 'steepest-ascent' });
  });

  it('opens on first visit and shows the first step', () => {
    renderOpenTour();
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument();
    expect(screen.getByText(ONBOARDING_TOUR_STEPS[0]?.title ?? '')).toBeInTheDocument();
    // Cooling is SA-only: skipped on the forced steepest-ascent path.
    expect(screen.getByText(/Step 1 of 10/)).toBeInTheDocument();
  });

  it('stays closed when the tour was already seen', () => {
    window.localStorage.setItem(TOUR_STORAGE_KEY, '1');
    render(
      <>
        <FakeTargets />
        <OnboardingTour />
      </>,
    );
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
  });

  it('advances with Next and with a backdrop click', async () => {
    renderOpenTour();
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    // mode="wait": the entering tooltip mounts after the exit completes.
    expect(await screen.findByText(ONBOARDING_TOUR_STEPS[1]?.title ?? '')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('onboarding-tour-backdrop-top'));
    expect(await screen.findByText(ONBOARDING_TOUR_STEPS[2]?.title ?? '')).toBeInTheDocument();
  });

  it('Escape closes the tour and remembers it for this browser', () => {
    renderOpenTour();
    fireEvent.keyDown(screen.getByTestId('onboarding-tour'), { key: 'Escape' });
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
  });

  it('“Don’t show again” persists a permanent opt-out', () => {
    renderOpenTour();
    fireEvent.click(screen.getByRole('button', { name: /Don’t show again/ }));
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_STORAGE_KEY)).toBe('forever');
  });

  it('forces steepest-ascent while open and restores the strategy on close', () => {
    simulationStore.getState().setConfig({ strategy: 'min-conflicts' });
    renderOpenTour();
    expect(simulationStore.getState().config.strategy).toBe('steepest-ascent');
    fireEvent.keyDown(screen.getByTestId('onboarding-tour'), { key: 'Escape' });
    expect(simulationStore.getState().config.strategy).toBe('min-conflicts');
  });

  it('reopens on demand even after being seen', () => {
    window.localStorage.setItem(TOUR_STORAGE_KEY, '1');
    render(
      <>
        <FakeTargets />
        <OnboardingTour />
      </>,
    );
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
    act(() => {
      reopenOnboardingTour();
    });
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument();
  });

  it('finishes from the last step with Done', async () => {
    renderOpenTour();
    // Active steps on the forced steepest-ascent path (cooling is SA-only).
    const expected = ONBOARDING_TOUR_STEPS.filter((s) => s.id !== 'cooling');
    // Walk the whole tour. After each click we await the NEXT step's title:
    // mode="wait" mounts it only after the 180 ms exit completes, and
    // awaiting also guarantees the clicked button belongs to the current
    // (not exiting) tooltip.
    for (let i = 0; i < expected.length - 1; i++) {
      const next = await screen.findByRole('button', { name: /^Next$/ }, { timeout: 3000 });
      fireEvent.click(next);
      expect(
        await screen.findByText(expected[i + 1]?.title ?? '', {}, { timeout: 3000 }),
      ).toBeInTheDocument();
    }
    const done = await screen.findByRole('button', { name: /^Done$/ }, { timeout: 3000 });
    fireEvent.click(done);
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
  });

  it('advertises the tooltip as draggable (grab cursor, touch-ready)', () => {
    renderOpenTour();
    const dialog = screen.getByTestId('onboarding-tour');
    expect(dialog.className).toMatch(/cursor-grab/);
    expect(dialog.className).toMatch(/touch-none/);
  });

  it('a press on non-button area starts a drag without breaking button clicks', async () => {
    renderOpenTour();
    const dialog = screen.getByTestId('onboarding-tour');
    // Press on the tooltip body (not a button): routes to dragControls.
    // Motion attaches move/up listeners; with no movement nothing changes
    // and — critically — nothing throws in jsdom.
    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(dialog);
    // Buttons still work afterwards: Next advances to step 2.
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    expect(
      await screen.findByText(ONBOARDING_TOUR_STEPS[1]?.title ?? '', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
