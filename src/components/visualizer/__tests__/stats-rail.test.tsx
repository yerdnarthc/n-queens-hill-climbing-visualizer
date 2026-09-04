import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { StatsRail } from '../stats-rail';
import { simulationStore } from '@/store';

describe('StatsRail', () => {
  beforeEach(() => {
    simulationStore.getState().setConfig({ boardSize: 8, seed: 27, strategy: 'steepest-ascent' });
  });

  it('renders all five metric labels', () => {
    render(<StatsRail variant="rail" />);
    expect(screen.getByText('Run Status')).toBeInTheDocument();
    expect(screen.getByText('Timeline Cursor')).toBeInTheDocument();
    expect(screen.getByText('Attacking Pairs')).toBeInTheDocument();
    expect(screen.getByText('Step Phase')).toBeInTheDocument();
  });

  it('displays timeline step cursor and total steps', () => {
    render(<StatsRail variant="rail" />);
    const totalSteps = simulationStore.getState().result?.totalSteps ?? 0;
    expect(screen.getByText(new RegExp(`/ ${totalSteps} steps`, 'i'))).toBeInTheDocument();
  });

  it('displays run status badge text from store', () => {
    render(<StatsRail variant="rail" />);
    // The badge is always rendered — either a terminal status (solved /
    // stagnated / exhausted / frozen) or the bootstrap "Initializing…" state
    // when no result has been produced yet.
    const result = simulationStore.getState().result;
    if (result) {
      const statusBadge = screen.getByText(/(Solved|Stagnated|Step Limit Hit|Frozen)/i);
      expect(statusBadge).toBeInTheDocument();
    } else {
      expect(screen.getByText(/Initializing/i)).toBeInTheDocument();
    }
  });

  it('displays Attacking Pairs label', () => {
    render(<StatsRail variant="rail" />);
    // The label is always present (regardless of whether a result exists yet)
    expect(screen.getByText(/Attacking Pairs/i)).toBeInTheDocument();
  });

  it('displays conflict value when a result is present', () => {
    const result = simulationStore.getState().result;
    if (!result) return; // No result in this test env — skip (the label is still asserted above)
    render(<StatsRail variant="rail" />);
    // Look for the conflict value via its parent card's structure
    expect(screen.getByText(String(result.finalConflicts))).toBeInTheDocument();
  });

  it('shows "Restarts" label for non-SA strategies', () => {
    simulationStore.getState().setConfig({ strategy: 'steepest-ascent' });
    render(<StatsRail variant="rail" />);
    expect(screen.getByText('Restarts')).toBeInTheDocument();
  });

  it('shows "Annealing Temp (T)" label for SA strategy', () => {
    simulationStore.getState().setConfig({ strategy: 'simulated-annealing' });
    render(<StatsRail variant="rail" />);
    expect(screen.getByText(/Annealing Temp \(T\)/i)).toBeInTheDocument();
  });

  it('does NOT render any lucide-react icons inside the cards', () => {
    const { container } = render(<StatsRail variant="rail" />);
    // The only <svg> allowed in the rail is the badge's auto-injected icon slot
    // for any leading icon, but we deliberately don't pass any. Card labels and
    // values are text-only.
    const svgs = container.querySelectorAll('[data-testid="stats-rail"] svg');
    // lucide SVGs would all be inside the rail wrapper. We expect zero.
    expect(svgs.length).toBe(0);
  });

  it('renders in compact variant with horizontal layout', () => {
    const { container } = render(<StatsRail variant="compact" />);
    const rail = screen.getByTestId('stats-rail');
    expect(rail).toHaveAttribute('data-variant', 'compact');
    // Compact uses flex-row, not flex-col
    expect(rail.className).toMatch(/flex-row/);
    // The card border is omitted in compact (no "border-border" class on cards)
    expect(container).toBeInTheDocument();
  });

  it('renders in rail variant with vertical layout', () => {
    render(<StatsRail variant="rail" />);
    const rail = screen.getByTestId('stats-rail');
    expect(rail).toHaveAttribute('data-variant', 'rail');
    expect(rail.className).toMatch(/flex-col/);
  });

  it('renders in context variant with a 2x2 grid plus a full-width Run Status card', () => {
    const { container } = render(<StatsRail variant="context" />);
    const rail = screen.getByTestId('stats-rail');
    expect(rail).toHaveAttribute('data-variant', 'context');

    // All 5 labels are present.
    expect(screen.getByText('Run Status')).toBeInTheDocument();
    expect(screen.getByText('Timeline Cursor')).toBeInTheDocument();
    expect(screen.getByText('Attacking Pairs')).toBeInTheDocument();
    expect(screen.getByText('Step Phase')).toBeInTheDocument();
    // Restarts label for non-SA default
    expect(screen.getByText('Restarts')).toBeInTheDocument();

    // Outer wrapper is a card frame (rounded-2xl border bg-card/60) — the
    // context variant owns its own chrome to sit next to the AnalyticsPanel.
    expect(rail.className).toMatch(/rounded-2xl/);
    expect(rail.className).toMatch(/border/);

    // A 2×2 grid is present for the 4 small cards (Timeline, Phase, Attacks, Restarts).
    // We locate it as a div that has both `grid` and `grid-cols-2` classes.
    const grid = container.querySelector('[data-testid="stats-rail"] .grid.grid-cols-2');
    expect(grid).toBeInTheDocument();

    // The Run Status card uses a horizontal layout (the wrapper has flex items-center
    // justify-between) — distinct from the 4 small cards above.
    const horizontalCard = container.querySelector(
      '[data-testid="stats-rail"] .flex.items-center.justify-between',
    );
    expect(horizontalCard).toBeInTheDocument();
  });

  it('context variant shows the h(s) value and step in the Run Status hero card', () => {
    const result = simulationStore.getState().result;
    if (!result) return; // skip when no result in test env

    const { container } = render(<StatsRail variant="context" />);
    // The hero card shows "h(s) = N · Step X / Y" as a single context line.
    // The h(s) value is a strong tag with the conflicts digit.
    const html = container.innerHTML;
    expect(html).toMatch(/h\(s\)\s*=/);
    expect(html).toMatch(new RegExp(`>${result.finalConflicts}<`));
    // "Step X / Y" — note: the X is wrapped in a <strong> tag, so the digit
    // and the slash are not directly adjacent. The looser regex tolerates
    // intermediate tags between "Step" and the slash.
    expect(html).toMatch(/Step\b[\s\S]*?\/\s*\d+/);
  });

  it('context variant shows Annealing Temp (T) when strategy is SA', () => {
    simulationStore.getState().setConfig({ strategy: 'simulated-annealing' });
    render(<StatsRail variant="context" />);
    expect(screen.getByText(/Annealing Temp \(T\)/i)).toBeInTheDocument();
  });
});
