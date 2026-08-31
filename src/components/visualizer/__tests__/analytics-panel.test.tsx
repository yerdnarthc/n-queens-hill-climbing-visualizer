import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { AnalyticsPanel } from '../analytics-panel';
import { simulationStore } from '@/store';

describe('AnalyticsPanel Component', () => {
  beforeEach(() => {
    // Initialize deterministic run
    simulationStore.getState().setConfig({
      boardSize: 8,
      seed: 27,
      strategy: 'steepest-ascent',
    });
    simulationStore.getState().run();
  });

  it('renders analytics panel header, tabs, and current state badge', () => {
    render(<AnalyticsPanel />);

    expect(screen.getByTestId('analytics-panel')).toBeInTheDocument();
    expect(screen.getByText('Analytics & Optimization')).toBeInTheDocument();

    // Tab triggers
    expect(screen.getByRole('tab', { name: /convergence/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /landscape/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /diagnostics/i })).toBeInTheDocument();

    // Convergence chart container rendered by default
    expect(screen.getByTestId('convergence-chart')).toBeInTheDocument();
  });

  it('allows switching to Landscape tab and renders landscape chart container', async () => {
    const user = userEvent.setup();
    render(<AnalyticsPanel />);

    const landscapeTab = screen.getByRole('tab', { name: /landscape/i });
    await user.click(landscapeTab);

    expect(screen.getByTestId('landscape-chart')).toBeInTheDocument();
  });

  it('allows switching to Diagnostics tab and displays run summary metrics', async () => {
    const user = userEvent.setup();
    render(<AnalyticsPanel />);

    const diagnosticsTab = screen.getByRole('tab', { name: /diagnostics/i });
    await user.click(diagnosticsTab);

    expect(screen.getByText('Initial Conflicts')).toBeInTheDocument();
    expect(screen.getByText('Best Reached')).toBeInTheDocument();
    expect(screen.getByText('Search Phase Breakdown')).toBeInTheDocument();
  });

  it('displays empty state placeholder when no result is present', () => {
    // Force empty result
    simulationStore.setState({ result: null });

    render(<AnalyticsPanel />);
    expect(screen.getByTestId('convergence-chart-empty')).toBeInTheDocument();
  });
});
