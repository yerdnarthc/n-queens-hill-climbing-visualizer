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

  it('renders the brand mark icon', () => {
    const { container } = render(<StatsHeader />);
    // The Zap icon is a lucide-react <svg> — verify it exists in the header
    const svg = container.querySelector('header svg');
    expect(svg).toBeInTheDocument();
  });

  it('does NOT render the live metric cards (those moved to StatsRail)', () => {
    render(<StatsHeader />);
    // The five live metrics now live in StatsRail, not here.
    expect(screen.queryByText(/Run Status/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Timeline Cursor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Attacking Pairs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Step Phase/i)).not.toBeInTheDocument();
  });
});
