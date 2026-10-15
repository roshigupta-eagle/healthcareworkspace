import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Referral } from '@/lib/referralStore';

const fixtures = vi.hoisted(() => ({
  getCanonicalPatientDirectory: vi.fn(),
  getPatientById: vi.fn(),
  getReferral: vi.fn(),
  listReferrals: vi.fn(),
  canAccessTaskPatient: vi.fn(),
}));

vi.mock('@/app/dashboard/records/mockPatients', () => ({
  getPatientById: fixtures.getPatientById,
}));
vi.mock('@/lib/doctorWorkStore', () => ({
  canAccessTaskPatient: fixtures.canAccessTaskPatient,
}));
vi.mock('@/lib/patientDirectory', () => ({
  getCanonicalPatientDirectory: fixtures.getCanonicalPatientDirectory,
}));
vi.mock('@/lib/referralStore', () => ({
  getReferral: fixtures.getReferral,
  listReferrals: fixtures.listReferrals,
}));

import {
  availableReferralTransitions,
  buildReferralServiceRequest,
  referralLifecycleTimeline,
  transitionReferral,
} from '@/lib/referralWorkflow';
import {
  getAuthorizedReferral,
  getReferralWorkspace,
} from '@/lib/referralWorkspace';

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
    requester: { id: 'doctor-1', name: 'Dr. Chen' },
    createdAt: '2026-09-01T09:00:00.000Z',
    ...overrides,
  };
}

describe('referral workflow safety', () => {
  it('allows only named lifecycle transitions and limits cancellation to elevated actors', () => {
    expect(availableReferralTransitions('Submitted').map((transition) => transition.action)).toEqual(['review', 'route', 'cancel']);
    expect(() => transitionReferral(referral(), 'cancel', { id: 'doctor-1', name: 'Dr. Chen', role: 'DOCTOR' })).toThrow('REFERRAL_TRANSITION_FORBIDDEN');
    expect(transitionReferral(referral(), 'route', { id: 'doctor-1', name: 'Dr. Chen', role: 'DOCTOR' }, new Date('2026-09-02T09:00:00.000Z'))).toMatchObject({
      businessState: 'Routing',
      status: 'active',
      event: { type: 'route', detail: { from: 'Submitted', to: 'Routing' } },
    });
    expect(() => transitionReferral(referral({ businessState: 'Closed' }), 'cancel', { id: 'admin-1', name: 'Admin', role: 'ADMIN' })).toThrow('REFERRAL_INVALID_TRANSITION');
  });

  it('maps only canonical patient identifiers and separate workflow state into ServiceRequest', () => {
    const resource = buildReferralServiceRequest(referral({
      priority: 'high',
      businessState: 'Closed',
      serviceCode: 'CARD-CONSULT',
      performer: { id: 'specialist-1', name: 'Dr. Patel' },
    }));
    expect(resource).toMatchObject({
      resourceType: 'ServiceRequest',
      id: 'ref-1',
      status: 'completed',
      intent: 'order',
      priority: 'asap',
      subject: { reference: 'Patient/patient-001' },
      code: { text: 'CARD-CONSULT' },
      requester: { reference: 'Practitioner/doctor-1', display: 'Dr. Chen' },
      performer: [{ reference: 'Practitioner/specialist-1', display: 'Dr. Patel' }],
    });
    expect(() => buildReferralServiceRequest(referral({ patientId: 'unknown' }))).toThrow('A referral requires a canonical patient identifier.');
  });

  it('shows only recorded workflow stages and preserves a current stage without inferred progress', () => {
    const lifecycle = referralLifecycleTimeline(referral({
      businessState: 'Scheduled',
      authoredOn: '2026-09-01T09:00:00.000Z',
      events: [
        { id: 'event-review', ts: '2026-09-02T09:00:00.000Z', type: 'review', detail: { from: 'Submitted', to: 'UnderReview' } },
        { id: 'event-schedule', ts: '2026-09-03T09:00:00.000Z', type: 'schedule', detail: { from: 'Scheduling', to: 'Scheduled' } },
      ],
    }));
    expect(lifecycle.find((stage) => stage.id === 'request')).toMatchObject({ status: 'recorded', recordedAt: '2026-09-01T09:00:00.000Z' });
    expect(lifecycle.find((stage) => stage.id === 'review')).toMatchObject({ status: 'recorded', recordedAt: '2026-09-02T09:00:00.000Z' });
    expect(lifecycle.find((stage) => stage.id === 'routing')).toMatchObject({ status: 'pending' });
    expect(lifecycle.find((stage) => stage.id === 'scheduling')).toMatchObject({ status: 'current', recordedAt: '2026-09-03T09:00:00.000Z' });
    expect(lifecycle.find((stage) => stage.id === 'consultation')).toMatchObject({ status: 'pending' });
  });
});

describe('referral worklist authorization', () => {
  const actor = { id: 'doctor-1', name: 'Dr. Chen', role: 'DOCTOR' };

  beforeEach(() => {
    vi.clearAllMocks();
    fixtures.getCanonicalPatientDirectory.mockResolvedValue({
      patients: [
        { id: 'patient-001', name: 'Sarah Jenkins', mrn: '8839201', birthDate: '1985-10-12', gender: 'female' },
        { id: 'patient-002', name: 'Michael Thompson', mrn: '9922100', birthDate: '1978-03-18', gender: 'male' },
      ],
      source: { state: 'ready', label: 'Test patient directory' },
    });
    fixtures.getPatientById.mockImplementation((patientId: string) => ({
      id: patientId,
      riskLevel: patientId === 'patient-001' ? 'Moderate' : 'Low',
    }));
    fixtures.canAccessTaskPatient.mockImplementation((patientId: string) => patientId === 'patient-001');
    fixtures.listReferrals.mockResolvedValue([
      referral({ id: 'ref-visible', patientId: 'patient-001' }),
      referral({ id: 'ref-hidden', patientId: 'patient-002', businessState: 'Scheduled' }),
    ]);
  });

  it('derives metrics and patient choices only from authorized referral records', async () => {
    const workspace = await getReferralWorkspace(actor, {}, new Date('2026-09-04T09:00:00.000Z'));
    expect(workspace.patients.map((patient) => patient.id)).toEqual(['patient-001']);
    expect(workspace.items.map((item) => item.referralId)).toEqual(['ref-visible']);
    expect(workspace.metrics).toMatchObject({ open: 1, needsAction: 1, patientsWithReferrals: 1 });
  });

  it('does not expose an out-of-scope referral through the detail projection', async () => {
    fixtures.getReferral.mockResolvedValue(referral({ id: 'ref-hidden', patientId: 'patient-002' }));
    await expect(getAuthorizedReferral('ref-hidden', actor)).resolves.toBeNull();
  });
});