/**
 * CSV export of a run's snapshot history (Phase 6).
 *
 * `buildRunCsv` is a PURE function (D-007: snapshots are "storable, comparable,
 * exportable") — one row per snapshot, RFC-4180 quoting, CRLF line endings.
 * The run config is encoded in the FILENAME (`nqueens_N8_seed27_steepest-ascent.csv`)
 * rather than comment lines, so the output stays clean for pandas / Excel.
 */
import type { SimulationResult, Snapshot } from '@/lib/engine';

const CSV_COLUMNS = [
  'step',
  'phase',
  'conflicts',
  'move_column',
  'move_from_row',
  'move_to_row',
  'delta_conflicts',
  'evaluated_moves',
  'iteration_in_restart',
  'restart_count',
  'temperature',
] as const;

/** RFC-4180 cell: empty for null, quoted when it contains a comma/quote/newline. */
export function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function snapshotToRow(snapshot: Snapshot): string {
  const move = snapshot.move;
  return [
    snapshot.step,
    snapshot.phase,
    snapshot.conflicts,
    move ? move.column : null,
    move ? move.fromRow : null,
    move ? move.toRow : null,
    move ? move.deltaConflicts : null,
    move ? move.evaluatedMoves : null,
    snapshot.iterationInRestart,
    snapshot.restartCount,
    snapshot.temperature,
  ]
    .map(csvCell)
    .join(',');
}

/** Build the full CSV document for a run (header + one row per snapshot). */
export function buildRunCsv(result: SimulationResult): string {
  const lines = [CSV_COLUMNS.join(','), ...result.snapshots.map(snapshotToRow)];
  return `${lines.join('\r\n')}\r\n`;
}

/** Descriptive, filesystem-safe filename carrying the run config. */
export function buildRunCsvFilename(result: SimulationResult): string {
  const { boardSize, seed, strategy } = result.config;
  return `nqueens_N${boardSize}_seed${seed}_${strategy}.csv`;
}

/** Trigger a client-side download of the run's CSV (browser only). */
export function downloadRunCsv(result: SimulationResult): void {
  const blob = new Blob([buildRunCsv(result)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = buildRunCsvFilename(result);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
