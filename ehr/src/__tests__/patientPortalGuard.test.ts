import { describe, expect, it } from 'vitest';

function canEnterPatientPortal(role: string | undefined, previewUser: string | null, production: boolean) {
  if (!production && previewUser === 'patient-001') return true;
  return role === 'PATIENT';
}

describe('patient portal authorization', () => {
  it('permits a patient and the explicit local patient preview only', () => {
    expect(canEnterPatientPortal('PATIENT', null, true)).toBe(true);
    expect(canEnterPatientPortal('ADMIN', null, true)).toBe(false);
    expect(canEnterPatientPortal(undefined, 'patient-001', false)).toBe(true);
    expect(canEnterPatientPortal(undefined, 'user-admin-khan', false)).toBe(false);
  });
});
