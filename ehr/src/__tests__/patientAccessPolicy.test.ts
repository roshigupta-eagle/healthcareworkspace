import { describe, expect, it } from 'vitest';
import { authorizePatientApi, parsePatientScopedPath } from '@/lib/patientAccessPolicy';

const decide = (role: string, section: string, opts: { method?: string; patientId?: string; own?: string; record?: boolean } = {}) =>
  authorizePatientApi({
    role,
    method: opts.method ?? 'GET',
    patientId: opts.patientId ?? 'patient-001',
    section,
    ownPatientId: opts.own,
    canAccessRecord: () => opts.record ?? false,
  }).ok;

describe('patient data access policy', () => {
  it('lets clinical staff in only for patients on their care team', () => {
    for (const role of ['DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER']) {
      expect(decide(role, 'notes', { record: true }), role).toBe(true);
      expect(decide(role, 'notes', { record: false }), role).toBe(false);
    }
  });

  it('never lets administrators, billing, receptionists or care assistants read patient data', () => {
    for (const role of ['ADMIN', 'BILLING', 'RECEPTIONIST', 'PCA', 'PENDING', '']) {
      expect(decide(role, 'allergies', { record: true }), role).toBe(false);
    }
  });

  it('limits pharmacists and lab technicians to their own sections', () => {
    expect(decide('PHARMACIST', 'medications')).toBe(true);
    expect(decide('PHARMACIST', 'allergies')).toBe(true);
    expect(decide('PHARMACIST', 'allergies', { method: 'POST' })).toBe(false);
    expect(decide('PHARMACIST', 'notes')).toBe(false);
    expect(decide('LAB_TECH', 'labs')).toBe(true);
    expect(decide('LAB_TECH', 'labs', { method: 'POST' })).toBe(false);
    expect(decide('LAB_TECH', 'medications')).toBe(false);
  });

  it('lets a patient read only selected sections of their own record', () => {
    expect(decide('PATIENT', 'allergies', { own: 'patient-001' })).toBe(true);
    expect(decide('PATIENT', 'allergies', { own: 'patient-002' })).toBe(false);
    expect(decide('PATIENT', 'allergies', { own: undefined })).toBe(false);
    expect(decide('PATIENT', 'allergies', { own: 'patient-001', method: 'POST' })).toBe(false);
    expect(decide('PATIENT', 'notes', { own: 'patient-001' })).toBe(false);
    expect(decide('PATIENT', '', { own: 'patient-001' })).toBe(false);
  });

  it('recognises patient-scoped API and chart URLs only', () => {
    expect(parsePatientScopedPath('/api/patients/patient-001/allergies/abc')).toEqual({ patientId: 'patient-001', section: 'allergies' });
    expect(parsePatientScopedPath('/api/patients/patient-001')).toEqual({ patientId: 'patient-001', section: '' });
    expect(parsePatientScopedPath('/patients/patient-002/documents')).toEqual({ patientId: 'patient-002', section: 'documents' });
    expect(parsePatientScopedPath('/dashboard/records/patient-001/labs')).toEqual({ patientId: 'patient-001', section: 'labs' });
    expect(parsePatientScopedPath('/doctor/health-records/patient/patient-003')).toEqual({ patientId: 'patient-003', section: '' });
    expect(parsePatientScopedPath('/dashboard/records/labs')).toBeNull();
    expect(parsePatientScopedPath('/dashboard/records')).toBeNull();
    expect(parsePatientScopedPath('/api/patientsX/1')).toBeNull();
    expect(parsePatientScopedPath('/patient/dashboard')).toBeNull();
  });
});
