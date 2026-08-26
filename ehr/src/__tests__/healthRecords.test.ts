import { describe, expect, it } from 'vitest';
import { getHealthRecordQuickView, getHealthRecordsResponse } from '@/lib/healthRecords';

describe('Health Records read model', () => {
  const now = new Date('2026-08-24T12:00:00-04:00');

  it('searches by MRN and preserves the date-only birth date', () => {
    const response = getHealthRecordsResponse({ q: '8839201' }, now);
    expect(response.total).toBe(1);
    expect(response.data[0]).toMatchObject({ patientId: 'patient-001', displayName: 'Sarah Jenkins', birthDate: '1985-10-12', mrn: '8839201' });
  });

  it('counts pending labs and care gaps from explicit source states', () => {
    const pending = getHealthRecordsResponse({ pendingLab: 'pending' }, now);
    const gaps = getHealthRecordsResponse({ careGap: 'open' }, now);
    expect(pending.data.map((patient) => patient.patientId)).toEqual(['patient-003']);
    expect(pending.metrics.pendingLabs).toBe(1);
    expect(gaps.data.map((patient) => patient.patientId)).toEqual(['patient-001']);
    expect(gaps.metrics.careGaps).toBe(1);
  });

  it('does not infer critical alerts from diagnoses', () => {
    const response = getHealthRecordsResponse({ criticalAlert: 'critical' }, now);
    expect(response.total).toBe(0);
    expect(response.metrics.criticalAlerts).toBe(0);
  });

  it('loads curated clinical detail for Quick View without changing the summary contract', () => {
    const quickView = getHealthRecordQuickView('patient-001', now);
    expect(quickView).toMatchObject({ patientId: 'patient-001', displayName: 'Sarah Jenkins', openWork: { total: 8 }, allergies: [] });
    expect(quickView?.conditions.map((condition) => condition.name)).toEqual(['Hypertension', 'Type 2 Diabetes']);
    expect(quickView?.medications.map((medication) => medication.name)).toEqual(['Atorvastatin', 'Metformin']);
  });
});
