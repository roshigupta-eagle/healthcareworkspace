import { beforeEach, describe, expect, it, vi } from 'vitest';

const actor = { id: 'dev-doctor', name: 'Dr. Maya Chen', role: 'DOCTOR' };
const mocks = vi.hoisted(() => ({
  getTelehealthMeetingContext: vi.fn(),
  getCommunicationCall: vi.fn(),
  getCommunicationAccess: vi.fn(),
  requestTelehealthMeetingJoin: vi.fn(),
}));

vi.mock('@/lib/clinicalCommunicationStore', () => ({
  getTelehealthMeetingContext: mocks.getTelehealthMeetingContext,
  getCommunicationCall: mocks.getCommunicationCall,
}));

vi.mock('@/lib/communicationBff', () => ({
  communicationSuccess: (data: unknown, correlationId: string, status = 200) => Response.json({ data, warnings: [], meta: { correlationId } }, { status }),
  communicationProblem: (status: number, code: string, detail: string, correlationId: string, retryable = false) => Response.json({ status, code, detail, correlationId, retryable }, { status, headers: { 'content-type': 'application/problem+json' } }),
  getCommunicationAccess: mocks.getCommunicationAccess,
  stringValue: (value: unknown, maxLength = 10000) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '',
}));

vi.mock('@/lib/telehealthMeetingProvider', () => ({
  isTelehealthMeetingError: () => false,
  requestTelehealthMeetingJoin: mocks.requestTelehealthMeetingJoin,
}));

import { GET as getMeetingContext } from '../app/api/communication/v1/calls/[callId]/meeting-context/route';
import { POST as joinMeeting } from '../app/api/communication/v1/calls/[callId]/join/route';

describe('telehealth meeting routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCommunicationAccess.mockResolvedValue({ access: { actor, correlationId: 'corr-telehealth' } });
  });

  it('returns a truthful blocked context for a non-patient lab call without requesting a media grant', async () => {
    mocks.getTelehealthMeetingContext.mockResolvedValue({
      callId: 'call-lab',
      eligible: false,
      localDemoAllowed: false,
      code: 'TELEHEALTH_PATIENT_PARTICIPANT_REQUIRED',
      detail: 'The verified patient must be an authorized participant before a telehealth meeting can be opened.',
    });

    const context = await getMeetingContext(
      new Request('http://localhost/api/communication/v1/calls/call-lab/meeting-context?patientId=patient-002'),
      { params: Promise.resolve({ callId: 'call-lab' }) },
    );
    const join = await joinMeeting(
      new Request('http://localhost/api/communication/v1/calls/call-lab/join?patientId=patient-002', { method: 'POST' }),
      { params: Promise.resolve({ callId: 'call-lab' }) },
    );

    expect(context.status).toBe(200);
    await expect(context.json()).resolves.toMatchObject({ data: { eligible: false, code: 'TELEHEALTH_PATIENT_PARTICIPANT_REQUIRED' } });
    expect(join.status).toBe(409);
    await expect(join.json()).resolves.toMatchObject({ code: 'TELEHEALTH_PATIENT_PARTICIPANT_REQUIRED' });
    expect(mocks.getCommunicationCall).not.toHaveBeenCalled();
    expect(mocks.requestTelehealthMeetingJoin).not.toHaveBeenCalled();
  });

  it('forbids a synthetic second participant unless the verified context explicitly enables local demo mode', async () => {
    mocks.getTelehealthMeetingContext.mockResolvedValue({ callId: 'call-visit', eligible: true, localDemoAllowed: false });
    mocks.getCommunicationCall.mockResolvedValue({ id: 'call-visit', controlPlaneCallId: 'control-visit' });

    const response = await joinMeeting(
      new Request('http://localhost/api/communication/v1/calls/call-visit/join?localGuest=true', { method: 'POST' }),
      { params: Promise.resolve({ callId: 'call-visit' }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: 'LOCAL_DEMO_FORBIDDEN' });
    expect(mocks.requestTelehealthMeetingJoin).not.toHaveBeenCalled();
  });
});
