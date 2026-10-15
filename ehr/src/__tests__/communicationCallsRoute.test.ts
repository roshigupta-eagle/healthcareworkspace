import { beforeEach, describe, expect, it, vi } from 'vitest';

const actor = { id: 'dev-doctor', name: 'Dr. Maya Chen', role: 'DOCTOR' };
const mocks = vi.hoisted(() => ({
  listCommunicationCalls: vi.fn(),
  startCommunicationCall: vi.fn(),
  getCommunicationCall: vi.fn(),
  updateCommunicationCall: vi.fn(),
  endCommunicationCall: vi.fn(),
  getCommunicationAccess: vi.fn(),
}));

vi.mock('@/lib/clinicalCommunicationStore', () => ({
  isCommunicationCallState: (value: string) => ['created', 'waiting_room', 'dialing', 'ringing', 'connecting', 'connected', 'reconnecting', 'on_hold', 'transferring', 'conferencing', 'ending', 'ended', 'busy', 'no_answer', 'declined', 'failed', 'dropped', 'cancelled'].includes(value),
  isCommunicationCallAction: (value: string) => ['dial', 'admit', 'answer', 'decline', 'cancel', 'hold', 'resume', 'transfer', 'conference', 'reconnect', 'hangup', 'end', 'add_note', 'set_disposition'].includes(value),
  listCommunicationCalls: mocks.listCommunicationCalls,
  startCommunicationCall: mocks.startCommunicationCall,
  getCommunicationCall: mocks.getCommunicationCall,
  updateCommunicationCall: mocks.updateCommunicationCall,
  endCommunicationCall: mocks.endCommunicationCall,
}));

vi.mock('@/lib/communicationBff', () => ({
  communicationSuccess: (data: unknown, correlationId: string, status = 200) => Response.json({ data, warnings: [], meta: { correlationId } }, { status }),
  communicationProblem: (status: number, code: string, detail: string, correlationId: string, retryable = false) => Response.json({ status, code, detail, correlationId, retryable }, { status, headers: { 'content-type': 'application/problem+json' } }),
  getCommunicationAccess: mocks.getCommunicationAccess,
  idempotencyKey: (request: Request, body?: Record<string, unknown> | null) => request.headers.get('Idempotency-Key')?.trim() || (typeof body?.idempotencyKey === 'string' ? body.idempotencyKey.trim() : ''),
  problemFromError: (error: unknown, correlationId: string) => Response.json({ code: error instanceof Error ? error.message : 'COMMUNICATION_FAILED', correlationId }, { status: 500 }),
  readRecord: async (request: Request) => {
    try {
      const body: unknown = await request.json();
      return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
    } catch {
      return null;
    }
  },
  stringValue: (value: unknown, maxLength = 10000) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '',
}));

import { GET as listCalls } from '../app/api/communication/v1/calls/route';
import { GET as getCall, PATCH as patchCall } from '../app/api/communication/v1/calls/[callId]/route';
import { POST as endCall } from '../app/api/communication/v1/calls/[callId]/end/route';

describe('communication call routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCommunicationAccess.mockResolvedValue({ access: { actor, correlationId: 'corr-test' } });
  });

  it('passes authorized call-history filters and opaque pagination to the provider-independent store read', async () => {
    mocks.listCommunicationCalls.mockResolvedValue({ calls: [{ id: 'call-1', state: 'failed' }], nextCursor: 'opaque-next' });

    const response = await listCalls(new Request('http://localhost/api/communication/v1/calls?patientId=patient-001&status=failed,ended&from=2026-09-01T00:00:00.000Z&to=2026-09-02T00:00:00.000Z&limit=2&cursor=opaque-current'));

    expect(response.status).toBe(200);
    expect(mocks.listCommunicationCalls).toHaveBeenCalledWith(actor, {
      patientId: 'patient-001',
      statuses: ['failed', 'ended'],
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-02T00:00:00.000Z',
      limit: 2,
      cursor: 'opaque-current',
    });
    await expect(response.json()).resolves.toMatchObject({ data: { calls: [{ id: 'call-1' }], nextCursor: 'opaque-next' } });
  });

  it('rejects an unsupported call-history status before reading the store', async () => {
    const response = await listCalls(new Request('http://localhost/api/communication/v1/calls?status=connected-for-real'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'CALL_STATUS_INVALID' });
    expect(mocks.listCommunicationCalls).not.toHaveBeenCalled();
  });

  it('uses an authorized conversation filter so a deep-linked call can be selected without relying on the first history page', async () => {
    mocks.listCommunicationCalls.mockResolvedValue({ calls: [{ id: 'call-target', conversationId: 'conversation-target', state: 'ringing' }], nextCursor: undefined });

    const response = await listCalls(new Request('http://localhost/api/communication/v1/calls?conversationId=conversation-target&limit=25'));

    expect(response.status).toBe(200);
    expect(mocks.listCommunicationCalls).toHaveBeenCalledWith(actor, expect.objectContaining({ conversationId: 'conversation-target', limit: 25 }));
    await expect(response.json()).resolves.toMatchObject({ data: { calls: [{ id: 'call-target', conversationId: 'conversation-target' }] } });
  });

  it('withholds a missing or foreign call detail and requires an idempotency key for commands', async () => {
    mocks.getCommunicationCall.mockResolvedValue(null);

    const detail = await getCall(new Request('http://localhost/api/communication/v1/calls/call-hidden?patientId=patient-001'), { params: Promise.resolve({ callId: 'call-hidden' }) });
    const missingKey = await patchCall(new Request('http://localhost/api/communication/v1/calls/call-hidden', { method: 'PATCH', body: JSON.stringify({ action: 'add_note', note: 'Local note.' }) }), { params: Promise.resolve({ callId: 'call-hidden' }) });

    expect(detail.status).toBe(404);
    expect(missingKey.status).toBe(400);
    await expect(missingKey.json()).resolves.toMatchObject({ code: 'IDEMPOTENCY_REQUIRED' });
  });

  it('returns a truthful 503 instead of a fabricated media transition and returns local annotations on success', async () => {
    mocks.updateCommunicationCall.mockResolvedValueOnce({ providerUnavailable: true, replayed: false, call: { id: 'call-1', state: 'failed' } });

    const unavailable = await patchCall(new Request('http://localhost/api/communication/v1/calls/call-1', { method: 'PATCH', headers: { 'content-type': 'application/json', 'Idempotency-Key': 'dial-once' }, body: JSON.stringify({ action: 'dial' }) }), { params: Promise.resolve({ callId: 'call-1' }) });

    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toMatchObject({ code: 'TELEPHONY_UNAVAILABLE', retryable: true });

    mocks.updateCommunicationCall.mockResolvedValueOnce({ providerUnavailable: false, replayed: true, call: { id: 'call-1', state: 'failed', notes: ['Local note.'] } });
    const annotation = await patchCall(new Request('http://localhost/api/communication/v1/calls/call-1', { method: 'PATCH', headers: { 'content-type': 'application/json', 'Idempotency-Key': 'note-once' }, body: JSON.stringify({ action: 'add_note', note: 'Local note.' }) }), { params: Promise.resolve({ callId: 'call-1' }) });

    expect(annotation.status).toBe(200);
    await expect(annotation.json()).resolves.toMatchObject({ data: { call: { id: 'call-1', notes: ['Local note.'] }, replayed: true } });
  });

  it('ends a meeting through the authorized control plane rather than treating browser disconnect as completion', async () => {
    mocks.endCommunicationCall.mockResolvedValue({ id: 'call-1', state: 'cancelled', provider: 'livekit' });

    const response = await endCall(
      new Request('http://localhost/api/communication/v1/calls/call-1/end?patientId=patient-001', { method: 'POST' }),
      { params: Promise.resolve({ callId: 'call-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.endCommunicationCall).toHaveBeenCalledWith({ callId: 'call-1', actor, patientId: 'patient-001', correlationId: 'corr-test' });
    await expect(response.json()).resolves.toMatchObject({ data: { call: { id: 'call-1', state: 'cancelled' } } });
  });
});
