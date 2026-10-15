import { describe, expect, it } from 'vitest';
import { ADMIN_NAVIGATION } from '@/app/admin/AdminConsoleShell';

describe('Admin Console navigation', () => {
  it('keeps exactly the ten approved primary destinations', () => {
    expect(ADMIN_NAVIGATION.map((item) => item.label)).toEqual([
      'Dashboard',
      'Users & Access',
      'Patients & Accounts',
      'Scheduling & Encounters',
      'Telehealth & Communication',
      'Clinical Configuration',
      'FHIR & Integrations',
      'Audit & Security',
      'Analytics & Reports',
      'System & Settings',
    ]);
  });
});
