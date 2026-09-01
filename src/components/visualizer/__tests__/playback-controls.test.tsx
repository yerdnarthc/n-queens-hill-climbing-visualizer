import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { PlaybackControls } from '../playback-controls';
import { simulationStore } from '@/store';

describe('PlaybackControls', () => {
  beforeEach(() => {
    simulationStore.getState().setConfig({ boardSize: 8, seed: 27, strategy: 'steepest-ascent' });
  });

  it('renders playback action buttons', () => {
    render(<PlaybackControls />);
    expect(screen.getByRole('button', { name: /play simulation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /step forward/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /jump to start/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /jump to end/i })).toBeInTheDocument();
  });

  it('toggles play/pause when Play button is clicked', () => {
    render(<PlaybackControls />);
    const playBtn = screen.getByRole('button', { name: /play simulation/i });
    fireEvent.click(playBtn);
    expect(simulationStore.getState().isPlaying).toBe(true);

    const pauseBtn = screen.getByRole('button', { name: /pause simulation/i });
    fireEvent.click(pauseBtn);
    expect(simulationStore.getState().isPlaying).toBe(false);
  });

  it('advances current step when Step Forward is clicked', () => {
    render(<PlaybackControls />);
    expect(simulationStore.getState().currentStep).toBe(0);

    const stepForwardBtn = screen.getByRole('button', { name: /step forward/i });
    fireEvent.click(stepForwardBtn);
    expect(simulationStore.getState().currentStep).toBe(1);
  });

  it('changes speed preset when clicking speed buttons', () => {
    render(<PlaybackControls />);
    const speed5Btn = screen.getByRole('button', { name: /^5×$/ });
    fireEvent.click(speed5Btn);
    expect(simulationStore.getState().speed).toBe(5);
  });

  it('renders a Jump-to-Best button that lands on the global-best step', () => {
    render(<PlaybackControls />);
    const bestBtn = screen.getByRole('button', { name: /jump to best/i });
    fireEvent.click(bestBtn);
    const s = simulationStore.getState();
    expect(s.currentStep).toBe(s.result!.bestStep);
    expect(s.currentStep).toBe(5); // seed 27 default run — solved at step 5
  });

  it('shows the best-event marker and legend for the solved default run', () => {
    render(<PlaybackControls />);
    // seed 27 default run reaches 0 conflicts at step 5 (see store-test fixtures)
    expect(screen.getByText(/Best \(step 5\)/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Best \(0 conflicts\) at step 5/i)).toBeInTheDocument();
  });

  it('shows restart markers and legend for a run that restarts', () => {
    const base = simulationStore.getState().result!;
    const snap = (
      step: number,
      conflicts: number,
      phase: 'initial' | 'restart' | 'shoulder',
      restartCount: number,
    ) => ({
      step,
      board: [] as number[],
      conflicts,
      phase,
      move: null,
      iterationInRestart: 0,
      restartCount,
      temperature: null,
    });
    simulationStore.setState({
      result: {
        ...base,
        status: 'stagnated' as const,
        solved: false,
        finalConflicts: 0,
        totalSteps: 2,
        restarts: 1,
        bestConflicts: 0,
        bestStep: 2,
        snapshots: [snap(0, 4, 'initial', 0), snap(1, 4, 'restart', 1), snap(2, 0, 'shoulder', 1)],
      },
      currentStep: 0,
    });
    render(<PlaybackControls />);
    expect(screen.getByTitle(/Restart at step 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Restart/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Best \(0 conflicts\) at step 2/i)).toBeInTheDocument();
  });

  it('shows the keyboard shortcut legend', () => {
    render(<PlaybackControls />);
    expect(screen.getAllByText('Space').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R').length).toBeGreaterThan(0);
  });
});
