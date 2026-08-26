import { describe, it, expect } from 'vitest';
import {
  determineHeroSafetyState,
  overallSafetyStatus,
  computeCategorySummary,
  computeSnapshot,
  computeNeedsAttention,
  availableAllergyActions,
  accessibleAllergySummary,
} from '../lib/allergies';
import type { AllergyRecord } from '../lib/allergyStore';
import type { AllergyReviewRecord } from '../lib/allergyReviewStore';
import type { PatientAllergySafetyResult } from '../lib/allergySafetyStore';

function makeAllergy(overrides: Partial<AllergyRecord> = {}): AllergyRecord {
  return {
    id: 'a1',
    patientId: 'patient-001',
    substance: { display: 'Penicillin' },
    type: 'allergy',
    category: ['medication'],
    clinicalStatus: 'active',
    verificationStatus: 'confirmed',
    reactions: [{ manifestation: 'Anaphylaxis', severity: 'severe' }],
    recordedAt: '2024-06-01',
    lastReviewedAt: '2026-06-05',
    history: [],
    ...overrides,
  };
}

describe('determineHeroSafetyState — ABSOLUTE SAFETY RULE', () => {
  it('returns severe-active when an active severe/high-criticality allergy exists', () => {
    const list = [makeAllergy({ criticality: 'high' })];
    expect(determineHeroSafetyState(list, null)).toBe('severe-active');
  });

  it('returns active-allergies when active allergies exist without severe reactions', () => {
    const list = [makeAllergy({ criticality: 'low', reactions: [{ manifestation: 'Rash', severity: 'mild' }] })];
    expect(determineHeroSafetyState(list, null)).toBe('active-allergies');
  });

  it('returns verified-nka ONLY when review has confirmed-nka', () => {
    const review: AllergyReviewRecord = { patientId: 'p', nkaStatus: 'confirmed-nka', history: [] };
    expect(determineHeroSafetyState([], review)).toBe('verified-nka');
  });

  it('CRITICAL SAFETY RULE: returns not-documented for empty allergy list with no confirmed NKA statement', () => {
    const review: AllergyReviewRecord = { patientId: 'p', nkaStatus: 'not-documented', history: [] };
    expect(determineHeroSafetyState([], review)).toBe('not-documented');
    expect(determineHeroSafetyState([], null)).toBe('not-documented');
  });
});

describe('overallSafetyStatus — CRITICAL SAFETY RULE', () => {
  it('returns unavailable when safety service status is unavailable', () => {
    const result: PatientAllergySafetyResult = { patientId: 'p', status: 'unavailable', conflicts: [] };
    expect(overallSafetyStatus(result)).toBe('unavailable');
  });

  it('returns unavailable when no safety result exists at all', () => {
    expect(overallSafetyStatus(null)).toBe('unavailable');
  });

  it('returns conflict when completed with active conflicts', () => {
    const result: PatientAllergySafetyResult = {
      patientId: 'p',
      status: 'completed',
      conflicts: [{ id: 'c1', medicationName: 'Amoxicillin', allergyId: 'a1', allergenName: 'Penicillin', reaction: 'Anaphylaxis', severity: 'critical', message: 'Conflict', source: 'svc' }],
    };
    expect(overallSafetyStatus(result)).toBe('conflict');
  });

  it('returns clear ONLY when completed with zero conflicts', () => {
    const result: PatientAllergySafetyResult = { patientId: 'p', status: 'completed', conflicts: [] };
    expect(overallSafetyStatus(result)).toBe('clear');
  });
});

describe('computeCategorySummary', () => {
  it('groups active allergies by category correctly', () => {
    const list = [
      makeAllergy({ id: 'a1', category: ['medication'] }),
      makeAllergy({ id: 'a2', category: ['food'], substance: { display: 'Peanuts' } }),
      makeAllergy({ id: 'a3', category: ['environmental'], substance: { display: 'Pollen' } }),
      makeAllergy({ id: 'a4', category: ['latex'], substance: { display: 'Latex Gloves' } }),
    ];
    const cat = computeCategorySummary(list);
    expect(cat.medication.length).toBe(1);
    expect(cat.food.length).toBe(1);
    expect(cat.environmental.length).toBe(1);
    expect(cat.latex.length).toBe(1);
  });
});

describe('computeSnapshot', () => {
  it('computes accurate metrics from real data', () => {
    const list = [
      makeAllergy({ id: 'a1', verificationStatus: 'confirmed' }),
      makeAllergy({ id: 'a2', verificationStatus: 'unconfirmed', source: 'Patient Reported' }),
    ];
    const review: AllergyReviewRecord = { patientId: 'p', nkaStatus: 'has-allergies', lastReviewedAt: '2026-06-05', history: [] };
    const safety: PatientAllergySafetyResult = { patientId: 'p', status: 'completed', conflicts: [] };

    const snap = computeSnapshot(list, review, safety);
    expect(snap.activeCount).toBe(2);
    expect(snap.unverifiedCount).toBe(1);
    expect(snap.conflictsCount).toBe(0);
    expect(snap.patientReportedCount).toBe(1);
    expect(snap.safetyCheckStatus).toBe('clear');
    expect(snap.heroState).toBe('severe-active');
  });
});

describe('computeNeedsAttention', () => {
  it('surfaces severe allergies and safety issues first (red over amber), capped at 3', () => {
    const list = [
      makeAllergy({ id: 'a1', criticality: 'high', substance: { display: 'Penicillin' } }),
      makeAllergy({ id: 'a2', verificationStatus: 'unconfirmed', source: 'Patient Reported', substance: { display: 'Peanuts' } }),
    ];
    const safety: PatientAllergySafetyResult = {
      patientId: 'p',
      status: 'completed',
      conflicts: [{ id: 'c1', medicationName: 'Amoxicillin', allergyId: 'a1', allergenName: 'Penicillin', reaction: 'Anaphylaxis', severity: 'critical', message: 'Conflict', source: 'svc' }],
    };
    const items = computeNeedsAttention(list, null, safety);
    expect(items.length).toBeLessThanOrEqual(3);
    expect(items[0].tone).toBe('red');
  });
});

describe('availableAllergyActions', () => {
  it('entered-in-error allergies only allow view/history', () => {
    const a = makeAllergy({ clinicalStatus: 'entered-in-error' });
    expect(availableAllergyActions(a)).toEqual(['view', 'view-history']);
  });

  it('active allergies allow full edit/review/resolve/refute/error workflow', () => {
    const a = makeAllergy({ clinicalStatus: 'active' });
    const actions = availableAllergyActions(a);
    expect(actions).toContain('edit');
    expect(actions).toContain('resolve');
    expect(actions).toContain('refute');
    expect(actions).toContain('mark-entered-in-error');
  });
});

describe('accessibleAllergySummary', () => {
  it('produces readable screen-reader summary without raw objects', () => {
    const a = makeAllergy();
    const summary = accessibleAllergySummary(a);
    expect(summary).toContain('Penicillin allergy');
    expect(summary).toContain('Anaphylaxis (severe)');
    expect(summary).not.toContain('[object Object]');
  });
});
