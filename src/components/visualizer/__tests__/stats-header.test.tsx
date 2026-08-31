import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { StatsHeader } from '../stats-header';
import { simulationStore } from '@/store';

describe('StatsHeader', () => {
  beforeEach(() => {
    // Reset and initialize store with deterministic config
    simulationStore.getState().setConfig({ boardSize: 8, seed: 27, strategy: 'steepest-ascent' });
  });

  it('renders visualizer title and branding', () => {
    render(<StatsHeader />);
    expect(screen.getByText(/N-Queens Hill Climbing/i)).toBeInTheDocument();
    expect(screen.getByText(/Local Search Visualizer/i)).toBeInTheDocument();
  });

  it('displays timeline step cursor and total steps', () => {
    render(<StatsHeader />);
    const totalSteps = simulationStore.getState().result?.totalSteps ?? 0;
    expect(screen.getByText(new RegExp(`/ ${totalSteps} steps`, 'i'))).toBeInTheDocument();
  });

  it('displays run status badge', () => {
    render(<StatsHeader />);
    const result = simulationStore.getState().result;
    if (result?.status === 'solved') {
      expect(screen.getByText(/Solved/i)).toBeInTheDocument();
    }
  });

  it('displays attacking pairs conflicts count', () => {
    render(<StatsHeader />);
    expect(screen.getByText(/Attacking Pairs/i)).toBeInTheDocument();
  });
});
