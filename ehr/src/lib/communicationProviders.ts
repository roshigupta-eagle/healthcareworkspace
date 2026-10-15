export type CommunicationProviderStatus = {
  available: boolean;
  reason?: string;
};

export type CallProviderActor = {
  id: string;
  role: string;
};

export type CallProviderParticipant = {
  id: string;
  subjectId: string;
  type: 'patient' | 'related_person' | 'practitioner' | 'nurse' | 'specialist' | 'caregiver' | 'interpreter' | 'observer';
  role: 'host' | 'moderator' | 'participant' | 'observer' | 'invitee';
  state: 'invited' | 'ringing' | 'accepted' | 'joining' | 'joined' | 'left' | 'removed' | 'declined' | 'missed';
};

export type CallProviderRequest = {
  actor: CallProviderActor;
  patientId?: string;
  appointmentId?: string;
  encounterId?: string;
  conversationId: string;
  callType: 'audio' | 'video' | 'group_audio' | 'group_video';
  participants: CallProviderParticipant[];
  idempotencyKey: string;
  correlationId: string;
};

export type CallProviderResult = {
  callId: string;
  state: string;
  provider: string;
  providerCallId?: string;
};

export class CallProviderError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail: string;
  readonly retryable: boolean;
  readonly callId?: string;

  constructor(input: { code: string; status: number; detail: string; retryable?: boolean; callId?: string }) {
    super(input.code);
    this.name = 'CallProviderError';
    this.code = input.code;
    this.status = input.status;
    this.detail = input.detail;
    this.retryable = input.retryable === true;
    this.callId = input.callId;
  }
}

export function isCallProviderError(error: unknown): error is CallProviderError {
  return error instanceof CallProviderError;
}

export interface EmailCommunicationProvider {
  status(): CommunicationProviderStatus;
}

export interface TelephonyCommunicationProvider {
  status(): CommunicationProviderStatus;
  initiateCall(request: CallProviderRequest): Promise<CallProviderResult>;
  getCallStatus(input: Pick<CallProviderRequest, 'actor' | 'correlationId'> & { callId: string }): Promise<CallProviderResult>;
  endCall(input: Pick<CallProviderRequest, 'actor' | 'correlationId'> & { callId: string }): Promise<CallProviderResult>;
}

const unavailableEmailProvider: EmailCommunicationProvider = {
  status: () => ({ available: false, reason: 'No approved email delivery provider is configured.' }),
};

const unavailableTelephonyProvider: TelephonyCommunicationProvider = {
  status: () => ({ available: false, reason: 'No approved telephony or voicemail provider is configured.' }),
  initiateCall: async () => { throw unavailableProviderError(); },
  getCallStatus: async () => { throw unavailableProviderError(); },
  endCall: async () => { throw unavailableProviderError(); },
};

export function getCommunicationProviderStatus() {
  return {
    email: unavailableEmailProvider.status(),
    telephony: getTelephonyCommunicationProvider().status(),
  };
}

export function getTelephonyCommunicationProvider(): TelephonyCommunicationProvider {
  const configuration = loadCallProviderConfiguration();
  if (!configuration) return unavailableTelephonyProvider;
  return new CommunicationCallServiceProvider(configuration);
}

type CallProviderConfiguration = {
  mode: 'mock' | 'live';
  baseUrl: string;
  token: string;
  tenantId: string;
  organizationId: string;
};

class CommunicationCallServiceProvider implements TelephonyCommunicationProvider {
  constructor(private readonly configuration: CallProviderConfiguration) {}

  status(): CommunicationProviderStatus {
    return {
      available: true,
      reason: this.configuration.mode === 'mock'
        ? 'Explicit development mock provider is configured.'
        : 'Configured call provider is available through the communication control plane.',
    };
  }

  async initiateCall(request: CallProviderRequest): Promise<CallProviderResult> {
    return this.request('/v1/calls', 'POST', request, request);
  }

  async getCallStatus(input: Pick<CallProviderRequest, 'actor' | 'correlationId'> & { callId: string }): Promise<CallProviderResult> {
    return this.request(`/v1/calls/${encodeURIComponent(input.callId)}`, 'GET', input, undefined);
  }

  async endCall(input: Pick<CallProviderRequest, 'actor' | 'correlationId'> & { callId: string }): Promise<CallProviderResult> {
    return this.request(`/v1/calls/${encodeURIComponent(input.callId)}/end`, 'POST', input, undefined);
  }

  private async request(path: string, method: 'GET' | 'POST', context: Pick<CallProviderRequest, 'actor' | 'correlationId'>, body: CallProviderRequest | undefined): Promise<CallProviderResult> {
    const url = new URL(path, this.configuration.baseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      logCallProviderEvent('provider_request_initiated', { correlationId: context.correlationId, providerMode: this.configuration.mode, callId: 'callId' in context ? context.callId : undefined });
      const response = await fetch(url, {
        method,
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.configuration.token}`,
          'Content-Type': 'application/json',
          'X-Correlation-ID': context.correlationId,
          'X-Communication-Actor-Id': context.actor.id,
          'X-Communication-Actor-Roles': context.actor.role,
          'X-Communication-Tenant-Id': this.configuration.tenantId,
          'X-Communication-Organization-Id': this.configuration.organizationId,
        },
        body: body ? JSON.stringify({
          patientId: body.patientId,
          appointmentId: body.appointmentId,
          encounterId: body.encounterId,
          conversationId: body.conversationId,
          callType: body.callType,
          participants: body.participants,
          idempotencyKey: body.idempotencyKey,
        }) : undefined,
      });
      const payload = await readJson(response);
      if (!response.ok) {
        const problem = readProblem(payload, response.status);
        logCallProviderEvent('provider_request_failed', { correlationId: context.correlationId, providerMode: this.configuration.mode, callId: problem.callId, status: problem.status, errorCategory: problem.code });
        throw new CallProviderError(problem);
      }
      const result = readCallResult(payload);
      logCallProviderEvent('provider_response_received', { correlationId: context.correlationId, provider: result.provider, callId: result.callId, providerCallId: result.providerCallId, state: result.state });
      return result;
    } catch (error) {
      if (isCallProviderError(error)) throw error;
      const mapped = error instanceof DOMException && error.name === 'AbortError'
        ? new CallProviderError({ code: 'CALL_PROVIDER_TIMEOUT', status: 504, detail: 'The call provider timed out. Retry the call with the same request ID.', retryable: true })
        : new CallProviderError({ code: 'CALL_PROVIDER_UNAVAILABLE', status: 503, detail: 'The call provider cannot be reached right now.', retryable: true });
      logCallProviderEvent('provider_request_failed', { correlationId: context.correlationId, providerMode: this.configuration.mode, status: mapped.status, errorCategory: mapped.code });
      throw mapped;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function loadCallProviderConfiguration(): CallProviderConfiguration | null {
  const mode = process.env.CALL_PROVIDER_MODE?.trim().toLowerCase();
  if (mode !== 'mock' && mode !== 'live') return null;
  if (mode === 'mock' && process.env.NODE_ENV === 'production') return null;
  const baseUrl = process.env.COMMUNICATION_SERVICE_URL?.trim();
  const token = process.env.COMMUNICATION_SERVICE_AUTH_TOKEN?.trim();
  const allowDevelopmentDefaults = mode === 'mock' && process.env.NODE_ENV !== 'production';
  const tenantId = process.env.COMMUNICATION_TENANT_ID?.trim() || (allowDevelopmentDefaults ? 'development' : '');
  const organizationId = process.env.COMMUNICATION_ORGANIZATION_ID?.trim() || (allowDevelopmentDefaults ? 'development' : '');
  if (!baseUrl || !token || !tenantId || !organizationId) return null;
  try {
    const parsed = new URL(baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') return null;
  } catch {
    return null;
  }
  return { mode, baseUrl: baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`, token, tenantId, organizationId };
}

function unavailableProviderError() {
  return new CallProviderError({
    code: 'CALL_PROVIDER_NOT_CONFIGURED',
    status: 503,
    detail: 'No approved call provider is configured for this environment.',
    retryable: false,
  });
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json() as unknown;
  } catch {
    return null;
  }
}

function readCallResult(payload: unknown): CallProviderResult {
  const data = recordValue(payload)?.data;
  const call = recordValue(data)?.call;
  const value = recordValue(call);
  const callId = stringValue(value?.id);
  const state = stringValue(value?.state);
  const provider = stringValue(value?.provider);
  if (!callId || !state || !provider) {
    throw new CallProviderError({ code: 'CALL_PROVIDER_RESPONSE_INVALID', status: 502, detail: 'The call provider returned an invalid call response.', retryable: true });
  }
  return { callId, state, provider, providerCallId: stringValue(value?.providerRoomId) || undefined };
}

function readProblem(payload: unknown, fallbackStatus: number) {
  const value = recordValue(payload);
  const status = typeof value?.status === 'number' ? value.status : fallbackStatus;
  const code = stringValue(value?.code) || codeForStatus(status);
  const detail = stringValue(value?.detail).slice(0, 500) || detailForStatus(status);
  return {
    code,
    status,
    detail,
    retryable: value?.retryable === true || status === 429 || status === 503 || status === 504,
    callId: stringValue(value?.callId) || undefined,
  };
}

function codeForStatus(status: number) {
  if (status === 400 || status === 422) return 'CALL_PROVIDER_REQUEST_INVALID';
  if (status === 401 || status === 403) return 'CALL_PROVIDER_AUTHENTICATION_FAILED';
  if (status === 409) return 'CALL_PROVIDER_CONFLICT';
  if (status === 429) return 'CALL_PROVIDER_RATE_LIMITED';
  if (status === 503) return 'CALL_PROVIDER_UNAVAILABLE';
  if (status === 504) return 'CALL_PROVIDER_TIMEOUT';
  return 'CALL_PROVIDER_FAILURE';
}

function detailForStatus(status: number) {
  if (status === 401 || status === 403) return 'The call service rejected the configured server credential.';
  if (status === 429) return 'The call provider is rate limiting requests. Retry shortly.';
  if (status === 503) return 'The call provider is temporarily unavailable.';
  if (status === 504) return 'The call provider timed out.';
  return 'The call provider could not process the request.';
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function logCallProviderEvent(event: string, fields: Record<string, string | number | undefined>) {
  console.info(JSON.stringify({ event, component: 'communication_call_provider', ...fields }));
}
