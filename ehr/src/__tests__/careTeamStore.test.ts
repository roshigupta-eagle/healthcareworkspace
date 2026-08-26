import { describe, expect, it } from 'vitest';
import { mapLegacyMember } from '../lib/careTeamStore';
import type { Patient } from '../app/dashboard/records/mockPatients';

describe('careTeamStore', () => {
  it('maps authoritative patient care-team roles without inventing organizations', () => {
    const patient: Patient = { id: 'patient-test', name: 'Test Patient', dob: '1980-01-01', mrn: 'MRN-1' };
    const member = mapLegacyMember(patient.id, { id: 'member-1', name: 'Dr. Example', role: 'Primary Specialist', specialty: 'Cardiology' });

    expect(member.careTeamRole).toBe('Primary Physician');
    expect(member.status).toBe('active');
    expect(member.organization).toBeUndefined();
    expect(member.source).toBe('patient-record');
  });
});