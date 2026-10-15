import type { CommunicationHostContract } from '../contracts/hostContract';

export type MfeConversationSummary = {
  readonly id: string;
  readonly patientId?: string;
  readonly patientName?: string;
  readonly participantName: string;
  readonly topic: string;
  readonly category: string;
  readonly priority: string;
  readonly state: string;
  readonly lastActivityAt: string;
  readonly preview: string;
  readonly unread: boolean;
  readonly actionRequired: boolean;
  readonly deliveryIssue: boolean;
};

export type MfeInbox = {
  readonly conversations: readonly MfeConversationSummary[];
  readonly folders: Readonly<Record<string, number>>;
};

type ApiEnvelope<T> = { readonly data?: T; readonly error?: string; readonly detail?: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasData<T>(value: unknown): value is ApiEnvelope<T> {
  return isObject(value) && ('data' in value || 'error' in value || 'detail' in value);
}

function errorText(value: unknown, fallback: string) {
  if (!isObject(value)) return fallback;
  const detail = value.detail;
  const error = value.error;
  return typeof detail === 'string' ? detail : typeof error === 'string' ? error : fallback;
}

export function createCommunicationClient(host: CommunicationHostContract) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${host.apiBasePath}${path}`, { ...init, credentials: 'same-origin', headers: { accept: 'application/json', ...(init?.headers || {}) } });
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok || !hasData<T>(payload) || payload.data === undefined) throw new Error(errorText(payload, 'Communication service is unavailable.'));
    return payload.data;
  }

  return {
    inbox: (query = '') => request<MfeInbox>(`/inbox${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    conversation: (conversationId: string) => request<Record<string, unknown>>(`/conversations/${encodeURIComponent(conversationId)}`),
    createConversation: (body: Record<string, unknown>, idempotencyKey: string) => request<Record<string, unknown>>('/conversations', { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ ...body, idempotencyKey }) }),
  };
}
