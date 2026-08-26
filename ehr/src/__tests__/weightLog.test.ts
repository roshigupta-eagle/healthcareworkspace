import { describe, it, expect } from 'vitest';
import {
  normalizeMeasurementStatus,
  availableActions,
  isValidForAnalytics,
  computeChangeFromPrevious,
  computeLogSummary,
  computeRowFlags,
} from '../lib/weightLog';

const M = (id: string, value: number, occurredAt: string, extra: Partial<{ enteredInError: boolean; status: string; unit: string; encounterId: string; correction: any; dataQuality: { state: 'review'; reason: string } }> = {}) => ({
  id,
  value,
  unit: extra.unit ?? 'kg',
  occurredAt,
  enteredInError: extra.enteredInError,
  status: extra.status,
  encounterId: extra.encounterId,
  correction: extra.correction,
  dataQuality: extra.dataQuality,
});

describe('CRITICAL: Mark Entered in Error must never appear on an already-error record', () => {
  it('excludes mark-entered-in-error from an entered-in-error measurement', () => {
    const m = M('a', 98, '2026-08-17', { enteredInError: true });
    const actions = availableActions(m);
    expect(actions).not.toContain('mark-entered-in-error');
    expect(actions).toEqual(['view', 'history']);
  });

  it('includes mark-entered-in-error for a normal final measurement', () => {
    const m = M('a', 70, '2026-08-17');
    expect(availableActions(m)).toContain('mark-entered-in-error');
  });

  it('includes view-encounter only when an encounter is linked', () => {
    expect(availableActions(M('a', 70, '2026-08-17'))).not.toContain('view-encounter');
    expect(availableActions(M('a', 70, '2026-08-17', { encounterId: 'enc-1' }))).toContain('view-encounter');
  });
});

describe('normalizeMeasurementStatus', () => {
  it('prioritizes entered-in-error over any other status field', () => {
    expect(normalizeMeasurementStatus(M('a', 70, '2026-01-01', { enteredInError: true, status: 'final' }))).toBe('entered-in-error');
  });
  it('treats a measurement with a correction record as corrected', () => {
    expect(normalizeMeasurementStatus(M('a', 70, '2026-01-01', { correction: { previousValue: 67 } }))).toBe('corrected');
  });
  it('defaults to final', () => {
    expect(normalizeMeasurementStatus(M('a', 70, '2026-01-01'))).toBe('final');
  });
});

describe('computeChangeFromPrevious', () => {
  it('reports no previous entry for the first record', () => {
    const items = [M('a', 70, '2026-01-01')];
    expect(computeChangeFromPrevious(items, 0).label).toBe('No previous entry');
  });
  it('computes a unit-normalized delta vs the previous entry', () => {
    const items = [M('a', 70, '2026-01-01', { unit: 'kg' }), M('b', 154, '2026-01-05', { unit: 'lb' })]; // ~70kg, no real change
    const result = computeChangeFromPrevious(items, 1);
    expect(result.deltaKg).toBeCloseTo(0, 0);
  });
});

describe('computeLogSummary — entered-in-error exclusion from clinical extrema', () => {
  it('never selects an entered-in-error record as latest/lowest/highest', () => {
    const items = [
      M('a', 70, '2026-08-01'),
      M('b', 999, '2026-08-19', { enteredInError: true }), // most recent by date but invalid
      M('c', 65, '2026-08-10'),
    ];
    const summary = computeLogSummary(items);
    expect(summary.latest?.id).toBe('c'); // most recent VALID measurement by date, not the entered-in-error one
    expect(summary.lowest?.id).toBe('c');
    expect(summary.highest?.id).toBe('a');
    expect(summary.totalEntries).toBe(3); // total entries counts ALL history, including entered-in-error
  });

  it('counts statuses accurately', () => {
    const items = [M('a', 70, '2026-08-01'), M('b', 71, '2026-08-02', { enteredInError: true }), M('c', 72, '2026-08-03', { correction: { previousValue: 70 } })];
    const summary = computeLogSummary(items);
    expect(summary.statusCounts.final).toBe(1);
    expect(summary.statusCounts.enteredInError).toBe(1);
    expect(summary.statusCounts.corrected).toBe(1);
  });
});

describe('isValidForAnalytics', () => {
  it('excludes entered-in-error, includes everything else', () => {
    expect(isValidForAnalytics(M('a', 70, '2026-01-01', { enteredInError: true }))).toBe(false);
    expect(isValidForAnalytics(M('a', 70, '2026-01-01'))).toBe(true);
  });
});

describe('computeRowFlags', () => {
  it('flags latest/highest/lowest without judging clinical direction', () => {
    const items = [M('a', 98, '2026-08-01'), M('b', 56, '2026-08-19'), M('c', 70, '2026-08-10')];
    const summary = computeLogSummary(items);
    expect(computeRowFlags(items[1], summary)).toEqual(expect.arrayContaining(['latest', 'lowest']));
    expect(computeRowFlags(items[0], summary)).toEqual(expect.arrayContaining(['highest']));
  });
describe('data-quality review flags', () => {
  it('only flags measurements explicitly marked by the data-quality service', () => {
    const unflagged = M('unflagged', 12, '2026-08-01');
    const flagged = M('flagged', 13, '2026-08-02', {
      dataQuality: { state: 'review', reason: 'Source review requested.' },
    });

    const summary = computeLogSummary([unflagged, flagged]);

    expect(summary.reviewIds.has('unflagged')).toBe(false);
    expect(summary.reviewIds.has('flagged')).toBe(true);
  });
});
});
