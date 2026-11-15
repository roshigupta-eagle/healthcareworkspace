import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn() }));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));

import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { resolveSession } from '@/lib/serverAuth';

function request(search = '') {
  return new Request(`http://localhost/api/doctor/work${search}`);
}

describe('session-only workspace access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a request without a session even when legacy preview parameters are supplied', async () => {
    mocks.auth.mockResolvedValue(null);

    const result = await resolveDoctorWorkspaceActor(request('?noauth=1&asUser=dev'));

    expect(result.actor).toBeUndefined();
    expect(result.response?.status).toBe(401);
  });

  it('does not synthesize a session from query parameters', async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(resolveSession(request('?asUser=dev-doctor'))).resolves.toBeNull();
  });

  it('builds the actor from the session user with an upper-cased role', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-1', name: 'Dr. Session', role: 'doctor' } });

    const result = await resolveDoctorWorkspaceActor(request('?asUser=user-admin-khan'));

    expect(result.response).toBeUndefined();
    expect(result.actor).toEqual({ id: 'user-1', name: 'Dr. Session', role: 'DOCTOR' });
  });

  it('requires a stable actor id on the session', async () => {
    mocks.auth.mockResolvedValue({ user: { name: 'No Id', role: 'DOCTOR' } });

    const result = await resolveDoctorWorkspaceActor(request());

    expect(result.response?.status).toBe(401);
  });

  it('forbids sessions whose role is outside the clinical workspace roles', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-2', name: 'Patient', role: 'PATIENT' } });

    const result = await resolveDoctorWorkspaceActor(request('?asUser=dev'));

    expect(result.actor).toBeUndefined();
    expect(result.response?.status).toBe(403);
  });
});
