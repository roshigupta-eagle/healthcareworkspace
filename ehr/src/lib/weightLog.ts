/**
 * Weight Trend → Log: authoritative read-model helpers for the measurement
 * history table. Pure functions only — the Log always reflects the same
 * canonical measurement records used by Overview/Insights/Achievements.
 *
 * CRITICAL safety rules encoded here:
 *  - Entered-in-error records are EXCLUDED from Latest/Lowest/Highest/summary
 *    counts used for clinical judgement, but remain fully visible in history.
 *  - Available row actions are derived from status — a measurement already
 *    "entered-in-error" must never expose "Mark Entered in Error" again.
 *  - Change-from-previous uses unit-normalized (kg) values and is described
 *    with clinically neutral color/language (never "decrease = good").
 */
import { isIncludedInAnalytics, toKg } from './weightMath';

export interface MeasurementDataQuality {
  readonly state: 'review';
  readonly reason: string;
  readonly source?: string;
}

export type MeasurementStatus = 'preliminary' | 'final' | 'corrected' | 'entered-in-error';

export interface LogMeasurement {
  id: string;
  value: number;
  unit?: string;
  occurredAt: string;
  source?: string;
  status?: string;
  enteredInError?: boolean;
  note?: string;
  recorder?: { id?: string; name?: string };
  encounterId?: string;
  method?: string;
  correction?: { correctedAt?: string; previousValue?: number; previousUnit?: string; reason?: string; correctedBy?: string; replacedByMeasurementId?: string };
  replacesMeasurementId?: string;
  replacedByMeasurementId?: string;
  enteredInErrorReason?: string;
  dataQuality?: MeasurementDataQuality;
  provenance?: { createdAt?: string; updatedAt?: string; sourceSystem?: string; version?: string };
}

export type RowAction = 'view' | 'correct' | 'history' | 'view-encounter' | 'mark-entered-in-error';

/** Normalizes free-form status strings into the canonical measurement lifecycle. */
export function normalizeMeasurementStatus(m: LogMeasurement): MeasurementStatus {
  if (m.enteredInError || m.status === 'entered-in-error') return 'entered-in-error';
  const s = (m.status || '').toLowerCase();
  if (s === 'corrected' || m.correction) return 'corrected';
  if (s === 'preliminary') return 'preliminary';
  return 'final';
}

/** Derives which row actions are valid for a measurement — never contradictory states. */
export function availableActions(m: LogMeasurement): RowAction[] {
  const status = normalizeMeasurementStatus(m);
  const actions: RowAction[] = ['view'];
  if (status === 'entered-in-error') {
    actions.push('history');
    return actions;
  }
  if (m.replacedByMeasurementId) {
    actions.push('history');
    return actions;
  }
  actions.push('correct', 'history');
  if (m.encounterId) actions.push('view-encounter');
  actions.push('mark-entered-in-error');
  return actions;
}

export function isValidForAnalytics(m: LogMeasurement): boolean {
  return normalizeMeasurementStatus(m) !== 'entered-in-error' && isIncludedInAnalytics(m);
}

export interface ChangeResult {
  deltaKg: number | null;
  label: string;
}

/** Computes change vs. the immediately preceding VALID chronological measurement. */
export function computeChangeFromPrevious(sortedValidAsc: LogMeasurement[], index: number): ChangeResult {
  if (index <= 0) return { deltaKg: null, label: 'No previous entry' };
  const current = sortedValidAsc[index];
  const prev = sortedValidAsc[index - 1];
  const delta = +(toKg(current.value, current.unit) - toKg(prev.value, prev.unit)).toFixed(2);
  const label = delta === 0 ? 'No change vs previous' : `${delta > 0 ? '+' : ''}${delta} kg vs previous`;
  return { deltaKg: delta, label };
}

export interface LogSummary {
  latest: LogMeasurement | null;
  totalEntries: number;
  validEntries: number;
  lowest: LogMeasurement | null;
  highest: LogMeasurement | null;
  statusCounts: { final: number; corrected: number; enteredInError: number; preliminary: number };
  reviewIds: Set<string>;
}

export function computeLogSummary(all: LogMeasurement[]): LogSummary {
  const valid = all.filter(isValidForAnalytics);
  const sortedValidAsc = valid.slice().sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
  const latest = sortedValidAsc[sortedValidAsc.length - 1] || null;

  let lowest: LogMeasurement | null = null;
  let highest: LogMeasurement | null = null;
  let lowestKg = Infinity;
  let highestKg = -Infinity;
  for (const m of valid) {
    const kg = toKg(m.value, m.unit);
    if (kg < lowestKg) { lowestKg = kg; lowest = m; }
    if (kg > highestKg) { highestKg = kg; highest = m; }
  }

  const statusCounts = { final: 0, corrected: 0, enteredInError: 0, preliminary: 0 };
  for (const m of all) {
    const status = normalizeMeasurementStatus(m);
    if (status === 'final') statusCounts.final += 1;
    else if (status === 'corrected') statusCounts.corrected += 1;
    else if (status === 'entered-in-error') statusCounts.enteredInError += 1;
    else if (status === 'preliminary') statusCounts.preliminary += 1;
  }

  const reviewIds = new Set(valid.filter((m) => m.dataQuality?.state === 'review').map((m) => m.id));

  return { latest, totalEntries: all.length, validEntries: valid.length, lowest, highest, statusCounts, reviewIds };
}

export type RowFlag = 'latest' | 'highest' | 'lowest' | 'corrected' | 'review';

export function computeRowFlags(m: LogMeasurement, summary: LogSummary): RowFlag[] {
  const flags: RowFlag[] = [];
  if (summary.latest?.id === m.id) flags.push('latest');
  if (summary.highest?.id === m.id) flags.push('highest');
  if (summary.lowest?.id === m.id) flags.push('lowest');
  if (normalizeMeasurementStatus(m) === 'corrected') flags.push('corrected');
  if (summary.reviewIds.has(m.id)) flags.push('review');
  return flags;
}
