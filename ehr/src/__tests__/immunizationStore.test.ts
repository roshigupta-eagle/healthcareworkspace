import { describe, expect, it } from 'vitest';
import { mapLegacyImmunization, normalizeImmunizationStatus } from '../lib/immunizationStore';

describe('immunizationStore', () => {
  it('normalizes clinical record statuses', () => {
    expect(normalizeImmunizationStatus('completed')).toBe('completed');
    expect(normalizeImmunizationStatus('scheduled')).toBe('planned');
    expect(normalizeImmunizationStatus('not given')).toBe('not-done');
    expect(normalizeImmunizationStatus('entered in error')).toBe('entered-in-error');
    expect(normalizeImmunizationStatus('unrecognized')).toBe('unknown');
  });

  it('maps legacy patient history without inventing source details', () => {
    expect(mapLegacyImmunization('patient-001', { name: 'Influenza', date: '2026-10-02' }, 0)).toMatchObject({
      id: 'patient-history-patient-001-0',
      patientId: 'patient-001',
      name: 'Influenza',
      date: '2026-10-02',
      status: 'completed',
      source: 'patient-history',
      history: [],
    });
  });
});