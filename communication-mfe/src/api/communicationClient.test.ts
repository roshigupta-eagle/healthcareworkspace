import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCommunicationClient } from './communicationClient';
import { createDefaultHostContract, type CommunicationHostContract } from '../contracts/hostContract';

const host: CommunicationHostContract = {
  ...createDefaultHostContract(),
  apiBasePath: '/api/communication/v1',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('communication BFF client contract', () => {
  it('unwraps an inbox envelope and URL-encodes the search query', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { conversations: [], folders: {} } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createCommunicationClient(host).inbox('Maple Pharmacy');

    expect(result.conversations).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith('/api/communication/v1/inbox?q=Maple%20Pharmacy', expect.objectContaining({ credentials: 'same-origin' }));
  });

  it('sends the idempotency key through the create-conversation request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 'conversation-1' } }), { status: 201, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await createCommunicationClient(host).createConversation({ subject: 'Follow-up', bodyText: 'Please review.' }, 'idempotency-1');

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(requestInit).toBeDefined();
    if (!requestInit) return;
    expect(new Headers(requestInit.headers).get('Idempotency-Key')).toBe('idempotency-1');
    expect(JSON.parse(String(requestInit.body))).toMatchObject({ subject: 'Follow-up', idempotencyKey: 'idempotency-1' });
  });
});
