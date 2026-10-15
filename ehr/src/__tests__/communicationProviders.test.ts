import { afterEach, describe, expect, it, vi } from 'vitest';
import { CallProviderError, getCommunicationProviderStatus, getTelephonyCommunicationProvider } from '@/lib/communicationProviders';

const originalEnvironment = { ...process.env };

function configureMockProvider() {
  process.env.CALL_PROVIDER_MODE = 'mock';
  process.env.COMMUNICATION_SERVICE_URL = 'http://127.0.0.1:8083';
  process.env.COMMUNICATION_SERVICE_AUTH_TOKEN = 'test-service-token';
  process.env.NODE_ENV = 'test';
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) delete process.env[key];
  }
  Object.assign(process.env, originalEnvironment);
});

describe('communication call provider', () => {
  it('keeps unconfigured provider state explicit', async () => {
    delete process.env.CALL_PROVIDER_MODE;
    delete process.env.COMMUNICATION_SERVICE_URL;
    delete process.env.COMMUNICATION_SERVICE_AUTH_TOKEN;

    expect(getCommunicationProviderStatus().telephony).toMatchObject({ available: false });
    await expect(getTelephonyCommunicationProvider().initiateCall({
      actor: { id: 'actor-1', role: 'DOCTOR' }, conversationId: 'conversation-1', callType: 'audio', participants: [], idempotencyKey: 'key-1', correlationId: 'corr-1',
    })).rejects.toMatchObject({ code: 'CALL_PROVIDER_NOT_CONFIGURED', status: 503 });
  });

  it('sends provider calls server-side with the configured credential and maps the response', async () => {
    configureMockProvider();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { call: { id: 'control-call-1', state: 'RINGING', provider: 'mock', providerRoomId: 'mock-room-1' } } }), { status: 201, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getTelephonyCommunicationProvider().initiateCall({
      actor: { id: 'actor-1', role: 'DOCTOR' }, patientId: 'patient-1', conversationId: 'conversation-1', callType: 'audio',
      participants: [{ id: 'participant-1', subjectId: 'actor-1', type: 'practitioner', role: 'host', state: 'invited' }], idempotencyKey: 'key-1', correlationId: 'corr-1',
    });

    expect(result).toEqual({ callId: 'control-call-1', state: 'RINGING', provider: 'mock', providerCallId: 'mock-room-1' });
    expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/v1/calls' }), expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer test-service-token', 'X-Correlation-ID': 'corr-1', 'X-Communication-Actor-Id': 'actor-1' }),
    }));
  });

  it('retains a provider-unavailable response category', async () => {
    configureMockProvider();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'MEDIA_PROVIDER_UNAVAILABLE', detail: 'Provider unavailable', status: 503, retryable: true, correlationId: 'corr-1' }), { status: 503, headers: { 'content-type': 'application/problem+json' } })));

    const error = await getTelephonyCommunicationProvider().initiateCall({
      actor: { id: 'actor-1', role: 'DOCTOR' }, conversationId: 'conversation-1', callType: 'audio', participants: [], idempotencyKey: 'key-1', correlationId: 'corr-1',
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CallProviderError);
    expect(error).toMatchObject({ code: 'MEDIA_PROVIDER_UNAVAILABLE', status: 503, retryable: true });
  });
});