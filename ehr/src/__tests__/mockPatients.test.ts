import { describe, it, expect } from 'vitest';
import { getPatientById } from '../app/dashboard/records/mockPatients';

describe('mockPatients', () => {
  it('returns patient-001 with lab results', () => {
    const p = getPatientById('patient-001');
    expect(p).toBeDefined();
    expect(p?.labResults).toBeDefined();
    expect(p?.labResults?.length).toBeGreaterThan(0);
  });

  it('returns patient-002 with troponin', () => {
    const p = getPatientById('patient-002');
    expect(p).toBeDefined();
    const hasTroponin = (p?.labResults || []).some(l => /troponin/i.test(l.name || ''));
    expect(hasTroponin).toBe(true);
  });
});
