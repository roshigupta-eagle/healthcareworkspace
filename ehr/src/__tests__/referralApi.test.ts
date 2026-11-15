import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Referral } from '@/lib/referralStore';

const mocks = vi.hoisted(() => ({
  canAccessTaskPatient: vi.fn(),
  createReferral: vi.fn(),
  getAuthorizedReferral: vi.fn(),
  getReferralWorkspace: vi.fn(),
  getPatientById: vi.fn(),
  listReferrals: vi.fn(),
  logAuditEvent: vi.fn(),
  resolveDoctorWorkspaceActor: vi.fn(),
  updateReferral: vi.fn(),
}));

vi.mock('@/app/dashboard/records/mockPatients', () => ({
  getPatientById: mocks.getPatientById,
}));
vi.mock('@/lib/audit', () => ({ logAuditEvent: mocks.logAuditEvent }));
vi.mock('@/lib/doctorWorkStore', () => ({
  canAccessTaskPatient: mocks.canAccessTaskPatient,
}));
vi.mock('@/lib/doctorWorkspaceAuth', () => ({
  resolveDoctorWorkspaceActor: mocks.resolveDoctorWorkspaceActor,
}));
vi.mock('@/lib/referralStore', () => ({
  createReferral: mocks.createReferral,
  listReferrals: mocks.listReferrals,
  updateReferral: mocks.updateReferral,
}));
vi.mock('@/lib/referralWorkspace', () => ({
  getAuthorizedReferral: mocks.getAuthorizedReferral,
  getReferralWorkspace: mocks.getReferralWorkspace,
}));

import {
  GET as listReferralsGet,
  POST as createReferralPost,
} from '../app/api/referrals/route';
import { POST as transitionReferralPost } from '../app/api/referrals/[referralId]/transition/route';

const actor = { id: 'doctor-1', name: 'Dr. Chen', role: 'DOCTOR' };
let stored: Referral[] = [];

function referral(overrides: Partial<Referral> = {}): Referral {
  return {
    id: 'ref-1',
    patientId: 'patient-001',
    subject: 'Cardiology review',
    specialty: 'Cardiology',
    destination: 'Specialty Clinic',
    priority: 'routine',
    status: 'active',
    businessState: 'Submitted',
    requester: { id: actor.id, name: actor.name },
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z',
    version: 1,
    ...overrides,
  };
}

function createRequest(idempotencyKey = 'referral-create-key') {
  return new Request('http://localhost/api/referrals', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify({
      patientId: 'patient-001',
      subject: 'Cardiology review',
      specialty: 'Cardiology',
      destination: 'Specialty Clinic',
      priority: 'high',
    }),
  });
}

function transitionRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/referrals/ref-1/transition', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function transition(body: Record<string, unknown>) {
  return transitionReferralPost(transitionRequest(body), {
    params: Promise.resolve({ referralId: 'ref-1' }),
  });
}

describe('referral API safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stored = [];
    mocks.resolveDoctorWorkspaceActor.mockResolvedValue({ actor });
    mocks.getPatientById.mockReturnValue({ id: 'patient-001' });
    mocks.canAccessTaskPatient.mockReturnValue(true);
    mocks.logAuditEvent.mockResolvedValue(undefined);
    mocks.listReferrals.mockImplementation(async () => stored);
    mocks.createReferral.mockImplementation(async (input: {
      id?: string;
      patientId: string;
      subject: string;
      specialty?: string;
      destination?: string;
      priority?: Referral['priority'];
      requester?: Referral['requester'];
    }) => {
      const item = referral({
        id: input.id || 'ref-generated',
        patientId: input.patientId,
        subject: input.subject,
        specialty: input.specialty,
        destination: input.destination,
        priority: input.priority,
        requester: input.requester,
      });
      stored.push(item);
      return item;
    });
    mocks.getAuthorizedReferral.mockResolvedValue(referral());
    mocks.getReferralWorkspace.mockResolvedValue({ items: [], total: 0 });
  });

  it('rejects unauthenticated requests before reading or writing referral data', async () => {
    mocks.resolveDoctorWorkspaceActor.mockResolvedValue({
      response: new Response(JSON.stringify({ error: 'Authentication required.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    });

    const response = await createReferralPost(createRequest());

    expect(response.status).toBe(401);
    expect(mocks.listReferrals).not.toHaveBeenCalled();
    expect(mocks.createReferral).not.toHaveBeenCalled();
  });

  it('creates once and reuses the deterministic record for the same idempotency key', async () => {
    const first = await createReferralPost(createRequest());
    const firstBody = await first.json();
    const second = await createReferralPost(createRequest());
    const secondBody = await second.json();

    expect(first.status).toBe(201);
    expect(firstBody.reused).toBe(false);
    expect(second.status).toBe(200);
    expect(secondBody).toMatchObject({ reused: true, item: { id: firstBody.item.id } });
    expect(mocks.createReferral).toHaveBeenCalledTimes(1);
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'C', outcome: 'success' }));
  });

  it('returns the authorized worklist and audits the read', async () => {
    const response = await listReferralsGet(
      new Request('http://localhost/api/referrals?filter=urgent'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [], total: 0 });
    expect(mocks.getReferralWorkspace).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ filter: 'urgent' }),
    );
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'R', outcome: 'success' }));
  });

  it('rejects an invalid lifecycle action before updating a referral', async () => {
    const response = await transition({ action: 'accept' });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('cannot move') });
    expect(mocks.updateReferral).not.toHaveBeenCalled();
  });

  it('rejects cancellation by a non-elevated clinician before updating a referral', async () => {
    const response = await transition({ action: 'cancel' });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('permission') });
    expect(mocks.updateReferral).not.toHaveBeenCalled();
  });

  it('returns a conflict when a valid lifecycle update is stale', async () => {
    mocks.updateReferral.mockRejectedValue(new Error('REFERRAL_VERSION_CONFLICT'));

    const response = await transition({
      action: 'route',
      expectedUpdatedAt: '2026-09-01T09:00:00.000Z',
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('changed since you opened') });
    expect(mocks.updateReferral).toHaveBeenCalledTimes(1);
  });
});