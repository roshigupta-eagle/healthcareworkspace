import 'server-only';

export type MeetingActor = { id: string; role: string };
export type MeetingJoinGrant = { serverUrl: string; token: string; roomName: string; identity: string; expiresAt: string };

export class TelehealthMeetingError extends Error {
  constructor(readonly code: string, readonly status: number, readonly detail: string, readonly retryable: boolean) {
    super(code);
    this.name = 'TelehealthMeetingError';
  }
}

type ProviderConfiguration = { baseUrl: string; token: string; tenantId: string; organizationId: string };

export function isTelehealthMeetingError(error: unknown): error is TelehealthMeetingError { return error instanceof TelehealthMeetingError; }

export async function requestTelehealthMeetingJoin(input: { actor: MeetingActor; correlationId: string; callId: string; localGuest: boolean }): Promise<MeetingJoinGrant> {
  const configuration = loadConfiguration();
  if (!configuration) throw new TelehealthMeetingError('MEDIA_JOIN_NOT_CONFIGURED', 503, 'Local browser media is not configured for this environment.', false);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const url = new URL(`/v1/calls/${encodeURIComponent(input.callId)}/join`, configuration.baseUrl);
    if (input.localGuest) url.searchParams.set('localGuest', 'true');
    const response = await fetch(url, { method: 'POST', cache: 'no-store', signal: controller.signal, headers: {
      Authorization: `Bearer ${configuration.token}`, 'X-Correlation-ID': input.correlationId,
      'X-Communication-Actor-Id': input.actor.id, 'X-Communication-Actor-Roles': input.actor.role,
      'X-Communication-Tenant-Id': configuration.tenantId, 'X-Communication-Organization-Id': configuration.organizationId,
    }});
    const payload = await readJson(response);
    if (!response.ok) throw problem(payload, response.status);
    const join = record(record(payload)?.data)?.join;
    const value = record(join);
    const grant: MeetingJoinGrant = { serverUrl: stringValue(value?.serverUrl), token: stringValue(value?.token), roomName: stringValue(value?.roomName), identity: stringValue(value?.identity), expiresAt: stringValue(value?.expiresAt) };
    if (Object.values(grant).some((value) => !value)) throw new TelehealthMeetingError('MEDIA_JOIN_RESPONSE_INVALID', 502, 'The media service returned an invalid join grant.', true);
    return grant;
  } catch (error) {
    if (isTelehealthMeetingError(error)) throw error;
    const timedOut = error instanceof DOMException ? error.name === 'AbortError' : false;
    throw new TelehealthMeetingError(timedOut ? 'MEDIA_JOIN_TIMEOUT' : 'MEDIA_JOIN_UNAVAILABLE', timedOut ? 504 : 503, timedOut ? 'The local media service timed out.' : 'The local media service cannot be reached.', true);
  } finally { clearTimeout(timeout); }
}

function loadConfiguration(): ProviderConfiguration | null {
  if (process.env.CALL_PROVIDER_MODE?.trim().toLowerCase() !== 'live') return null;
  const baseUrl = process.env.COMMUNICATION_SERVICE_URL?.trim() ?? '';
  const token = process.env.COMMUNICATION_SERVICE_AUTH_TOKEN?.trim() ?? '';
  const tenantId = process.env.COMMUNICATION_TENANT_ID?.trim() ?? '';
  const organizationId = process.env.COMMUNICATION_ORGANIZATION_ID?.trim() ?? '';
  if ([baseUrl, token, tenantId, organizationId].some((value) => !value)) return null;
  return { baseUrl, token, tenantId, organizationId };
}

async function readJson(response: Response): Promise<unknown> { try { return await response.json() as unknown; } catch { return null; } }
function record(value: unknown): Record<string, unknown> | null { if (!value || typeof value !== 'object' || Array.isArray(value)) return null; return value as Record<string, unknown>; }
function stringValue(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function problem(payload: unknown, status: number): TelehealthMeetingError {
  const value = record(payload);
  const code = stringValue(value?.code) || 'MEDIA_JOIN_FAILED';
  const detail = stringValue(value?.detail) || 'The media service rejected the join request.';
  const retryable = value?.retryable === true ? true : status === 503 || status === 504;
  return new TelehealthMeetingError(code, typeof value?.status === 'number' ? value.status : status, detail, retryable);
}
