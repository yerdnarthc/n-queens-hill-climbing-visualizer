import { describe, expect, it } from 'vitest';
import { runSimulation } from '@/lib/engine';
import type { SimulationResult } from '@/lib/engine';
import { buildRunCsv, buildRunCsvFilename, csvCell } from '../csv-export';

/**
 * Machine-harvested fixture (store-test suite, 2026-08-31): seed 27, N=8,
 * steepest-ascent — solved in 5 steps, conflicts [6,3,2,1,1,0], phases
 * [initial, improving, improving, improving, shoulder, improving].
 */
function defaultRun(): SimulationResult {
  return runSimulation({ boardSize: 8, seed: 27, strategy: 'steepest-ascent' });
}

describe('csv-export', () => {
  it('csvCell quotes values containing commas, quotes, or newlines (RFC-4180)', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(5)).toBe('5');
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
  });

  it('writes the exact header row', () => {
    const lines = buildRunCsv(defaultRun()).split('\r\n');
    expect(lines[0]).toBe(
      'step,phase,conflicts,move_column,move_from_row,move_to_row,delta_conflicts,evaluated_moves,iteration_in_restart,restart_count,temperature',
    );
  });

  it('emits one row per snapshot with machine-harvested values', () => {
    const result = defaultRun();
    const lines = buildRunCsv(result).trimEnd().split('\r\n');
    expect(lines).toHaveLength(1 + result.snapshots.length); // header + 6 snapshots
    // Initial snapshot: 5 empty move fields, iteration 0, restart 0, no temperature.
    expect(lines[1]).toBe('0,initial,6,,,,,,0,0,');
    // Final row: derive from the actual (deterministic) snapshot — never hand-computed.
    const last = result.snapshots[result.snapshots.length - 1]!;
    const move = last.move!;
    expect(lines[lines.length - 1]).toBe(
      [
        last.step,
        last.phase,
        last.conflicts,
        move.column,
        move.fromRow,
        move.toRow,
        move.deltaConflicts,
        move.evaluatedMoves,
        last.iterationInRestart,
        last.restartCount,
        '', // temperature: null for non-SA runs
      ].join(','),
    );
    expect(last.conflicts).toBe(0); // solved run
  });

  it('ends the document with a CRLF and includes final-row conflicts 0', () => {
    const csv = buildRunCsv(defaultRun());
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv).toContain(',0,');
  });

  it('fills the temperature column for simulated-annealing runs', () => {
    const result = runSimulation({
      boardSize: 8,
      seed: 27,
      strategy: 'simulated-annealing',
    });
    const dataRows = buildRunCsv(result).trimEnd().split('\r\n').slice(1);
    const temperatures = dataRows.map((row) => row.split(',')[10]!);
    // SA snapshots (initial included, D-009) all carry a positive temperature…
    expect(temperatures.every((t) => t !== '' && Number(t) > 0)).toBe(true);
    // …which cools from the initial value (default saInitialTemp = boardSize) downward.
    expect(temperatures[0]).toBe('8');
    expect(Number(temperatures[temperatures.length - 1])).toBeLessThan(8);
  });

  it('encodes the run config in the filename', () => {
    expect(buildRunCsvFilename(defaultRun())).toBe('nqueens_N8_seed27_steepest-ascent.csv');
    expect(
      buildRunCsvFilename(
        runSimulation({ boardSize: 16, seed: 1234567890, strategy: 'simulated-annealing' }),
      ),
    ).toBe('nqueens_N16_seed1234567890_simulated-annealing.csv');
  });
});
