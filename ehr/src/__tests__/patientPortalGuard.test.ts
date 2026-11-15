import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), redirect: vi.fn() }));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import { requirePatientPortalAccess } from '@/lib/patientPortalAccess';

describe('patient portal authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it('sends visitors without a session to sign-in', async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(requirePatientPortalAccess()).rejects.toThrow('redirect:/login');
  });

  it('sends signed-in users who are not patients to the unauthorized page', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-1', name: 'Admin', role: 'ADMIN' } });

    await expect(requirePatientPortalAccess()).rejects.toThrow('redirect:/unauthorized');
  });

  it('derives the patient identity from the session only', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-9', name: 'Pat Ient', role: 'PATIENT', fhirId: 'patient-009' } });

    await expect(requirePatientPortalAccess()).resolves.toEqual({
      patientId: 'patient-009',
      patientName: 'Pat Ient',
      agentId: 'user-9',
    });
  });
});
