import { describe, it, expect } from 'vitest';
import {
  isRefillDue,
  refillPatternLabel,
  overallSafetyStatus,
  medicationSafetyStatus,
  computeSnapshot,
  computeNeedsAttention,
  availableMedicationActions,
  formatDoseLine,
  medicationStatusLabel,
} from '../lib/medications';
import type { MedicationRecord } from '../lib/medicationsStore';
import type { PatientSafetyResult } from '../lib/medicationSafetyStore';
import type { ReconciliationRecord } from '../lib/medicationReconciliationStore';

const NOW = new Date('2026-08-19T12:00:00Z');

function makeMed(overrides: Partial<MedicationRecord> = {}): MedicationRecord {
  return {
    id: 'm1',
    patientId: 'patient-001',
    name: 'Atorvastatin',
    dose: '20',
    unit: 'mg',
    frequency: 'Once daily',
    status: 'active',
    source: 'native',
    refillsRemaining: 2,
    nextEligibleRefillDate: '2026-09-01',
    history: [],
    ...overrides,
  };
}

describe('isRefillDue — real fields only, never guessed', () => {
  it('is due when refillsRemaining is 0', () => {
    expect(isRefillDue(makeMed({ refillsRemaining: 0 }), NOW)).toBe(true);
  });
  it('is due when nextEligibleRefillDate has passed', () => {
    expect(isRefillDue(makeMed({ refillsRemaining: 2, nextEligibleRefillDate: '2026-08-01' }), NOW)).toBe(true);
  });
  it('is not due when refills remain and date is in the future', () => {
    expect(isRefillDue(makeMed(), NOW)).toBe(false);
  });
  it('is never due for a non-active medication', () => {
    expect(isRefillDue(makeMed({ status: 'stopped', refillsRemaining: 0 }), NOW)).toBe(false);
  });
});

describe('refillPatternLabel — never overstates adherence', () => {
  it('never claims adherence, only describes refill pattern', () => {
    const label = refillPatternLabel(makeMed({ lastRefillDate: '2026-06-01' }));
    expect(label.toLowerCase()).not.toContain('adherence is good');
    expect(label).toBe('Refill pattern appears consistent');
  });
  it('reports unavailable when no refill data exists', () => {
    expect(refillPatternLabel(makeMed({ lastRefillDate: undefined }))).toBe('Adherence data unavailable');
  });
});

describe('overallSafetyStatus — never shows Clear when the service failed', () => {
  it('returns unavailable when service status is unavailable', () => {
    const result: PatientSafetyResult = { patientId: 'p', status: 'unavailable', alerts: [] };
    expect(overallSafetyStatus(result)).toBe('unavailable');
  });
  it('returns unavailable when no result exists at all', () => {
    expect(overallSafetyStatus(null)).toBe('unavailable');
  });
  it('returns clear only when completed with no alerts', () => {
    const result: PatientSafetyResult = { patientId: 'p', status: 'completed', alerts: [] };
    expect(overallSafetyStatus(result)).toBe('clear');
  });
  it('returns critical when any critical alert exists', () => {
    const result: PatientSafetyResult = { patientId: 'p', status: 'completed', alerts: [{ id: 'a', medicationIds: [], type: 'interaction', severity: 'critical', message: 'x', source: 'svc' }] };
    expect(overallSafetyStatus(result)).toBe('critical');
  });
  it('returns review for moderate/high severity alerts', () => {
    const result: PatientSafetyResult = { patientId: 'p', status: 'completed', alerts: [{ id: 'a', medicationIds: [], type: 'monitoring', severity: 'moderate', message: 'x', source: 'svc' }] };
    expect(overallSafetyStatus(result)).toBe('review');
  });
});

describe('medicationSafetyStatus — scoped to a single medication, never patient-wide', () => {
  it('is clear for a medication with no alerts even if another medication has one', () => {
    const result: PatientSafetyResult = {
      patientId: 'p',
      status: 'completed',
      alerts: [{ id: 'a', medicationIds: ['other-med'], type: 'monitoring', severity: 'moderate', message: 'x', source: 'svc' }],
    };
    expect(medicationSafetyStatus(result, 'this-med')).toBe('clear');
    expect(medicationSafetyStatus(result, 'other-med')).toBe('review');
  });
  it('is unavailable when the service failed, regardless of medication', () => {
    const result: PatientSafetyResult = { patientId: 'p', status: 'unavailable', alerts: [] };
    expect(medicationSafetyStatus(result, 'any-med')).toBe('unavailable');
  });
});

describe('computeSnapshot — real counts only', () => {
  it('computes active/refill/reconciliation from real data', () => {
    const meds = [makeMed({ id: 'a' }), makeMed({ id: 'b', status: 'stopped' }), makeMed({ id: 'c', refillsRemaining: 0 })];
    const recon: ReconciliationRecord = { patientId: 'p', status: 'current', history: [] };
    const snap = computeSnapshot(meds, null, recon, NOW);
    expect(snap.activeCount).toBe(2);
    expect(snap.refillsNeedingReview).toBe(1);
    expect(snap.reconciliationStatus).toBe('current');
    expect(snap.safetyStatus).toBe('unavailable');
  });
  it('reports never-reconciled when no reconciliation record exists', () => {
    const snap = computeSnapshot([], null, null, NOW);
    expect(snap.reconciliationStatus).toBe('never-reconciled');
  });
});

describe('computeNeedsAttention — capped at 3, red items surfaced first', () => {
  it('caps at 3 items across refill + safety + reconciliation', () => {
    const meds = [makeMed({ id: 'a', refillsRemaining: 0 }), makeMed({ id: 'b', refillsRemaining: 0 }), makeMed({ id: 'c', refillsRemaining: 0 })];
    const recon: ReconciliationRecord = { patientId: 'p', status: 'review-due', history: [] };
    const items = computeNeedsAttention(meds, null, recon, NOW);
    expect(items.length).toBeLessThanOrEqual(3);
  });
  it('produces no items when everything is current', () => {
    const meds = [makeMed()];
    const recon: ReconciliationRecord = { patientId: 'p', status: 'current', history: [] };
    expect(computeNeedsAttention(meds, null, recon, NOW)).toEqual([]);
  });
});

describe('availableMedicationActions — lifecycle-gated, never contradictory', () => {
  it('entered-in-error medications only allow view/history', () => {
    const actions = availableMedicationActions(makeMed({ status: 'entered-in-error' }), false);
    expect(actions).toEqual(['view', 'view-history']);
  });
  it('active medication with refill due includes renew', () => {
    const actions = availableMedicationActions(makeMed({ status: 'active' }), true);
    expect(actions).toContain('renew');
    expect(actions).toContain('discontinue');
  });
  it('active medication without refill due excludes renew', () => {
    const actions = availableMedicationActions(makeMed({ status: 'active' }), false);
    expect(actions).not.toContain('renew');
  });
  it('on-hold medication offers resume but not hold again', () => {
    const actions = availableMedicationActions(makeMed({ status: 'on-hold' }), false);
    expect(actions).toContain('resume');
    expect(actions).not.toContain('hold');
  });
  it('stopped medication offers only correct beyond view', () => {
    const actions = availableMedicationActions(makeMed({ status: 'stopped' }), false);
    expect(actions).toEqual(['view', 'view-history', 'correct']);
  });
});

describe('formatDoseLine — never renders raw objects', () => {
  it('combines dose/unit/frequency into readable text', () => {
    expect(formatDoseLine(makeMed({ dose: '20', unit: 'mg', frequency: 'Once daily' }))).toBe('20 mg · Once daily');
  });
  it('falls back to a safe message when nothing is documented', () => {
    expect(formatDoseLine(makeMed({ dose: undefined, unit: undefined, frequency: undefined }))).toBe('Dose not documented');
  });
});

describe('medicationStatusLabel', () => {
  it('maps every canonical status to a human label', () => {
    expect(medicationStatusLabel('stopped')).toBe('Discontinued');
    expect(medicationStatusLabel('entered-in-error')).toBe('Entered in Error');
  });
});
