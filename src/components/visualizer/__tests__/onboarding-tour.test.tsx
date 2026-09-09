import { describe, it, expect, beforeEach, vi } from 'vitest';
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
      <div data-tour="config">config</div>
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
      <div data-tour="timeline-scrubber">scrubber</div>
      <div data-tour="transport">transport</div>
      <div data-tour="speed-presets">presets</div>
      <div data-tour="speed-fine">fine</div>
      <div data-tour="shortcuts">shortcuts</div>
      <div data-testid="analytics-panel">analytics</div>
      <div data-tour="tab-convergence">tab-c</div>
      <div data-tour="tab-landscape">tab-l</div>
      <div data-tour="tab-diagnostics">tab-d</div>
      <div data-testid="stats-rail" data-variant="context">
        stats
      </div>
      <div data-tour="stats-tiles">tiles</div>
      <div data-tour="stats-hero">hero</div>
      <button type="button" aria-label="Export run as CSV">
        export
      </button>
      <div data-tour="share">share</div>
    </div>
  );
}

/** Dismiss the welcome modal into the guided steps. */
async function enterGuide() {
  fireEvent.click(screen.getByRole('button', { name: /let's explore/i }));
  // mode="wait": the guide tooltip mounts after the welcome exit completes.
  await screen.findByText('The chessboard', {}, { timeout: 3000 });
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
    // The tour restores scrollY on close — stub the viewport-less jsdom API.
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    simulationStore.getState().setConfig({ strategy: 'steepest-ascent' });
  });

  it('opens on first visit with the welcome modal, then enters step 1', async () => {
    renderOpenTour();
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument();
    expect(screen.getByText(/welcome to the n-queens/i)).toBeInTheDocument();
    await enterGuide();
    expect(screen.getByText('The chessboard')).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 7/)).toBeInTheDocument();
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

  it('advances substeps with Next and with a backdrop click', async () => {
    renderOpenTour();
    await enterGuide();
    // First Next walks the chessboard substeps (same spotlight, new copy).
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    // mode="wait": the entering tooltip mounts after the exit completes.
    expect(await screen.findByText(/glowing red are conflicted/i)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('onboarding-tour-backdrop-top'));
    expect(await screen.findByText(/try hovering/i)).toBeInTheDocument();
  });

  it('walks substeps then advances to the next top-level step', async () => {
    renderOpenTour();
    await enterGuide();
    // Exhaust the 10 chessboard substeps → lands on the timeline step's
    // scrubber substep (every beat has a unique title, so each await
    // pins the live tooltip, never a stale one).
    for (let i = 0; i < 10; i++) {
      const next = await screen.findByRole('button', { name: /^Next$/ }, { timeout: 3000 });
      fireEvent.click(next);
      // Settle each beat before clicking again: awaiting the next title
      // keeps clicks off exiting tooltips (a stale click is a silent
      // no-op that would stall the walk).
      const titles = [
        'Red glow means attacked',
        'Try hovering a queen',
        'Red ring = under attack',
        'Top-right badge: attacker count',
        'Bottom-right badge: what just changed',
        'Amber badge: flat ground',
        'Blue glow: just moved',
        'Trail: where it flew',
        'Try pinning a queen',
        'Timeline scrubber',
      ];
      expect(await screen.findByText(titles[i] ?? '', {}, { timeout: 3000 })).toBeInTheDocument();
    }
    expect(screen.getByText(/Step 2 of 7/)).toBeInTheDocument();
  });

  it('Back retreats through substeps before the previous step', async () => {
    renderOpenTour();
    await enterGuide();
    const next = await screen.findByRole('button', { name: /^Next$/ }, { timeout: 3000 });
    fireEvent.click(next);
    expect(await screen.findByText(/glowing red are conflicted/i)).toBeInTheDocument();
    const back = await screen.findByRole('button', { name: /^Back$/ }, { timeout: 3000 });
    fireEvent.click(back);
    expect(await screen.findByText('The chessboard', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('Escape closes the tour and remembers it for this browser', () => {
    renderOpenTour();
    fireEvent.keyDown(screen.getByTestId('onboarding-tour'), { key: 'Escape' });
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
  });

  it('“Don’t show again” persists a permanent opt-out', async () => {
    renderOpenTour();
    await enterGuide();
    fireEvent.click(screen.getByRole('button', { name: /Don’t show again/ }));
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_STORAGE_KEY)).toBe('forever');
  });

  it('forces steepest-ascent while open and restores the full snapshot on close', () => {
    simulationStore.getState().setConfig({ strategy: 'min-conflicts', boardSize: 12 });
    simulationStore.getState().setSpeed(10);
    renderOpenTour();
    expect(simulationStore.getState().config.strategy).toBe('steepest-ascent');
    fireEvent.keyDown(screen.getByTestId('onboarding-tour'), { key: 'Escape' });
    const s = simulationStore.getState();
    expect(s.config.strategy).toBe('min-conflicts');
    expect(s.config.boardSize).toBe(12);
    expect(s.speed).toBe(10);
  });

  it('resumes playback on close when the user was playing on entry', () => {
    // Different strategy so tour entry itself reruns (and pauses, D-057).
    simulationStore.getState().setConfig({ boardSize: 8, seed: 27, strategy: 'min-conflicts' });
    simulationStore.getState().play();
    expect(simulationStore.getState().isPlaying).toBe(true);
    renderOpenTour();
    // Forcing steepest-ascent paused playback mid-tour…
    expect(simulationStore.getState().isPlaying).toBe(false);
    fireEvent.keyDown(screen.getByTestId('onboarding-tour'), { key: 'Escape' });
    // …and closing resumes it explicitly.
    expect(simulationStore.getState().isPlaying).toBe(true);
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

  it('finishes from the last substep with Done', async () => {
    renderOpenTour();
    await enterGuide();
    // Walk every substep asserting each screen in turn. Awaiting each
    // title guarantees the clicked button belongs to the live tooltip,
    // never an exiting one (mode="wait" keeps the old mounted briefly,
    // and a stale click would be a silent no-op that stalls the walk).
    // Expected titles on the forced steepest path (SA-only cooling
    // substep is dropped at start, mirroring the tour).
    const expectedTitles: string[] = [];
    for (const step of ONBOARDING_TOUR_STEPS) {
      const subs = (step.substeps ?? []).filter((s) => s.id !== 'cooling');
      if (subs.length === 0) expectedTitles.push(step.title);
      else for (const sub of subs) expectedTitles.push(sub.title ?? step.title);
    }
    for (let i = 1; i < expectedTitles.length; i++) {
      const next = await screen.findByRole('button', { name: /^Next$/ }, { timeout: 3000 });
      fireEvent.click(next);
      expect(
        await screen.findByText(expectedTitles[i] ?? '', {}, { timeout: 3000 }),
      ).toBeInTheDocument();
    }
    const done = await screen.findByRole('button', { name: /^Done$/ }, { timeout: 3000 });
    fireEvent.click(done);
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
    // ~35 beats × exit/enter cycle each exceeds the 5 s default timeout.
  }, 60000);

  it('shows the welcome modal with the approved copy and Skip path', async () => {
    renderOpenTour();
    expect(screen.getByText(/welcome to the n-queens/i)).toBeInTheDocument();
    expect(screen.getByText(/one queen move at a time/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /skip tour/i }));
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
  });

  it('advertises the tooltip as draggable (grab cursor, touch-ready)', async () => {
    renderOpenTour();
    await enterGuide();
    const dialog = screen.getByTestId('onboarding-tour');
    expect(dialog.className).toMatch(/cursor-grab/);
    expect(dialog.className).toMatch(/touch-none/);
  });

  it('a press on non-button area starts a drag without breaking button clicks', async () => {
    renderOpenTour();
    await enterGuide();
    const dialog = screen.getByTestId('onboarding-tour');
    // Press on the tooltip body (not a button): routes to dragControls.
    // Motion attaches move/up listeners; with no movement nothing changes
    // and — critically — nothing throws in jsdom.
    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(dialog);
    // Buttons still work afterwards: Next advances within step 1 substeps.
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    expect(await screen.findByText(/glowing red are conflicted/i)).toBeInTheDocument();
  });

  it('shows a grip handle advertising draggability', async () => {
    renderOpenTour();
    await enterGuide();
    const grip = screen.getByTestId('tour-drag-handle');
    expect(grip).toBeInTheDocument();
    expect(grip.getAttribute('aria-hidden')).toBe('true');
  });

  it('hints at dragging on the first substep only (progressive disclosure)', async () => {
    renderOpenTour();
    await enterGuide();
    expect(screen.getByText(/drag me aside/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    expect(await screen.findByText(/glowing red are conflicted/i)).toBeInTheDocument();
    expect(screen.queryByText(/drag me aside/i)).not.toBeInTheDocument();
  });

  it('locks body scroll while open and restores it on close', () => {
    renderOpenTour();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');
    fireEvent.keyDown(screen.getByTestId('onboarding-tour'), { key: 'Escape' });
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.position).toBe('');
    expect(window.scrollTo).toHaveBeenCalled();
  });
});
