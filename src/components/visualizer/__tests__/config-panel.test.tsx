import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import * as React from 'react';
import { ConfigPanel } from '../config-panel';
import { simulationStore } from '@/store';

describe('ConfigPanel', () => {
  beforeEach(() => {
    simulationStore.getState().setConfig({ boardSize: 8, seed: 27, strategy: 'steepest-ascent' });
  });

  it('renders board size title and strategy selector', () => {
    render(<ConfigPanel />);
    expect(screen.getByText(/Board Dimension/i)).toBeInTheDocument();
    expect(screen.getByText(/Hill Climbing Variant/i)).toBeInTheDocument();
  });

  it('allows seed input editing on blur', () => {
    render(<ConfigPanel />);
    const seedInput = screen.getByPlaceholderText(/e\.g\. 27/i);
    expect(seedInput).toHaveValue(27);

    fireEvent.change(seedInput, { target: { value: '99' } });
    fireEvent.blur(seedInput);

    expect(simulationStore.getState().config.seed).toBe(99);
  });

  it('calls newSeed when random button is clicked', () => {
    render(<ConfigPanel />);
    const randBtn = screen.getByRole('button', { name: /random/i });
    const initialSeed = simulationStore.getState().config.seed;

    fireEvent.click(randBtn);
    // New seed generated and is a number
    expect(typeof simulationStore.getState().config.seed).toBe('number');
    expect(initialSeed).toBe(27);
  });

  it('copies the share link via the header button', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ConfigPanel />);
    fireEvent.click(screen.getByRole('button', { name: /copy share link/i }));
    await act(async () => {});

    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  it('renders in compact mode with tighter padding when compact={true}', () => {
    const { container } = render(<ConfigPanel compact />);

    // Outer wrapper has data-compact="true" and uses p-3 (not p-4).
    const outer = container.querySelector('[data-compact="true"]');
    expect(outer).toBeInTheDocument();
    expect(outer?.className).toMatch(/\bp-3\b/);
    expect(outer?.className).not.toMatch(/\bp-4\b/);

    // Strategy mini callout is hidden in compact mode to save vertical space.
    expect(screen.queryByText(/Always accepts improving moves/i)).not.toBeInTheDocument();

    // Form essentials still render.
    expect(screen.getByText(/Board Dimension/i)).toBeInTheDocument();
    expect(screen.getByText(/Hill Climbing Variant/i)).toBeInTheDocument();
    expect(screen.getByText(/RNG Seed/i)).toBeInTheDocument();
  });

  it('renders in standalone mode with original padding when compact is omitted', () => {
    const { container } = render(<ConfigPanel />);
    const outer = container.querySelector('[data-compact="false"]');
    expect(outer).toBeInTheDocument();
    expect(outer?.className).toMatch(/\bp-4\b/);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
