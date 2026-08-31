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
});
