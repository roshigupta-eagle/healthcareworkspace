import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

const providerMocks = vi.hoisted(() => ({
  initiateCall: vi.fn(),
  getCallStatus: vi.fn(),
  endCall: vi.fn(),
}));

vi.mock('@/lib/communicationProviders', () => ({
  CallProviderError: class CallProviderError extends Error {
    code: string;
    status: number;
    detail: string;
    retryable: boolean;
    constructor(input: { code: string; status: number; detail: string; retryable?: boolean }) {
      super(input.code);
      this.code = input.code;
      this.status = input.status;
      this.detail = input.detail;
      this.retryable = input.retryable === true;
    }
  },
  getTelephonyCommunicationProvider: () => ({
    status: () => ({ available: true, reason: 'Mock provider' }),
    initiateCall: providerMocks.initiateCall,
    getCallStatus: providerMocks.getCallStatus,
    endCall: providerMocks.endCall,
  }),
  getCommunicationProviderStatus: () => ({
    email: { available: false, reason: 'Email provider unavailable' },
    telephony: { available: true, reason: 'Mock provider' },
  }),
  isCallProviderError: (error: unknown) => Boolean(error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string' && typeof (error as { status?: unknown }).status === 'number'),
}));

const testDataDirectory = path.join(tmpdir(), `roshi-communication-store-${process.pid}`);
const storeFile = path.join(testDataDirectory, 'communication_hub.json');
const originalDataDirectory = process.env.EHR_DATA_DIR;
const actor = { id: 'dev-doctor', name: 'Dr. Maya Chen', role: 'DOCTOR' };

let store: typeof import('@/lib/clinicalCommunicationStore');
let preview: typeof import('@/lib/communicationPreview');

async function preferredRecipientId() {
  const snapshot = await store.getCommunicationHubSnapshot(actor);
  const recipient = snapshot.directory.find((entry) => entry.type === 'organization');
  if (!recipient) throw new Error('Expected a seeded organization recipient.');
  return recipient.id;
}

async function issueAttachment(patientId = 'patient-001') {
  return store.createCommunicationAttachment({
    actor,
    patientId,
    filename: 'care-plan.pdf',
    contentType: 'application/pdf',
    sizeBytes: 128,
  });
}

async function createConversation(attachmentIds: string[], patientId = 'patient-001', actorOverride = actor, idempotencyKey = `test-${crypto.randomUUID()}`) {
  return store.createCommunicationConversation({
    actor: actorOverride,
    patientId,
    recipientId: await preferredRecipientId(),
    subject: 'Care coordination',
    bodyText: 'Please review the attached care plan.',
    category: 'General',
    priority: 'routine',
    channel: 'secure_message',
    idempotencyKey,
    attachmentIds,
  });
}

async function seedProviderFreeCreatedCall() {
  await store.getCommunicationHubSnapshot(actor);
  const raw = JSON.parse(await fs.readFile(storeFile, 'utf8')) as { conversations: Array<{ id: string; calls: unknown[] }> };
  const conversation = raw.conversations.find((candidate) => candidate.id === 'conv-pharmacy');
  if (!conversation) throw new Error('Expected seeded pharmacy conversation.');
  const now = new Date().toISOString();
  const callId = `call-created-${crypto.randomUUID()}`;
  conversation.calls.push({
    id: callId,
    conversationId: 'conv-pharmacy',
    patientId: 'patient-001',
    initiatedBy: actor,
    direction: 'outbound',
    state: 'created',
    provider: 'not-configured',
    startedAt: now,
    recordingState: 'not_allowed',
    transcriptionState: 'disabled',
    participants: [{ id: actor.id, name: actor.name, role: actor.role, muted: false, onHold: false }],
    notes: [],
    revision: 1,
    stateHistory: [{ id: `history-${callId}`, version: 1, action: 'created', toState: 'created', occurredAt: now, actor, result: 'applied' }],
  });
  await fs.writeFile(storeFile, JSON.stringify(raw), 'utf8');
  return callId;
}

describe('clinical communication store', () => {
  beforeAll(async () => {
    process.env.EHR_DATA_DIR = testDataDirectory;
    vi.resetModules();
    store = await import('@/lib/clinicalCommunicationStore');
    preview = await import('@/lib/communicationPreview');
  });

  beforeEach(async () => {
    await fs.rm(storeFile, { force: true });
    providerMocks.initiateCall.mockReset();
    providerMocks.getCallStatus.mockReset();
    providerMocks.endCall.mockReset();
    providerMocks.initiateCall.mockResolvedValue({ callId: 'control-call-1', state: 'RINGING', provider: 'mock', providerCallId: 'mock-room-1' });
  });

  afterAll(async () => {
    await fs.rm(testDataDirectory, { force: true, recursive: true });
    if (originalDataDirectory === undefined) delete process.env.EHR_DATA_DIR;
    else process.env.EHR_DATA_DIR = originalDataDirectory;
  });

  it('normalizes the development alias to the seeded clinician', () => {
    expect(preview.resolveDevelopmentPreviewActor('dev')).toEqual(actor);
    expect(preview.resolveDevelopmentPreviewActor('dev-doctor')).toEqual(actor);
    expect(preview.resolveDevelopmentPreviewActor('not-a-preview-user')).toBeUndefined();
    expect(preview.isDevelopmentPreviewRequest('dev')).toBe(true);
    expect(preview.isDevelopmentPreviewRequest('not-a-preview-user')).toBe(false);
  });

  it('persists an issued safe attachment exactly once on a new conversation', async () => {
    const attachment = await issueAttachment();
    const created = await createConversation([attachment.id]);

    expect(created.messages[0]?.attachments).toEqual([attachment]);
    expect(created.attachments).toEqual([attachment]);

    await expect(createConversation([attachment.id])).rejects.toThrow('ATTACHMENT_ALREADY_USED');
  });

  it('keeps draft attachments with their owner and rejects a foreign draft overwrite', async () => {
    const attachment = await issueAttachment();
    const draft = await store.saveCommunicationDraft({
      id: 'draft-owned-attachment',
      revision: 0,
      actor,
      patientId: 'patient-001',
      recipientId: await preferredRecipientId(),
      channel: 'secure_message',
      subject: 'Draft care coordination',
      bodyText: 'Please review the attached plan before I send this.',
      category: 'General',
      priority: 'routine',
      attachmentIds: [attachment.id],
    });

    expect(draft.attachments).toEqual([attachment]);
    await expect(store.getCommunicationDrafts(actor)).resolves.toEqual([expect.objectContaining({
      id: draft.id,
      revision: draft.revision,
      actorId: actor.id,
      attachments: [attachment],
    })]);

    const otherClinician = { id: 'another-clinician', name: 'Another Clinician', role: 'DOCTOR' };
    await expect(store.saveCommunicationDraft({
      id: draft.id,
      revision: 0,
      actor: otherClinician,
      channel: 'secure_message',
      subject: 'Attempted overwrite',
      bodyText: 'This draft is not owned by this clinician.',
    })).rejects.toThrow('DRAFT_NOT_OWNED');
    await expect(store.getCommunicationDrafts(otherClinician)).resolves.toEqual([]);
  });

  it('rejects forged, foreign, and wrong-patient attachment references before creating a message', async () => {
    await expect(createConversation(['not-issued-by-the-server'])).rejects.toThrow('ATTACHMENT_NOT_FOUND');

    const issuedToClinician = await issueAttachment();
    await expect(createConversation([issuedToClinician.id], 'patient-001', { id: 'another-clinician', name: 'Another Clinician', role: 'DOCTOR' })).rejects.toThrow('ATTACHMENT_NOT_OWNED');

    const issuedForSarah = await issueAttachment('patient-001');
    await expect(createConversation([issuedForSarah.id], 'patient-002')).rejects.toThrow('PATIENT_CONTEXT_MISMATCH');
  });

  it('rejects a patient recipient whose identity conflicts with the selected patient', async () => {
    await expect(store.createCommunicationConversation({
      actor,
      patientId: 'patient-002',
      recipientId: 'patient-001',
      subject: 'Patient context safety',
      bodyText: 'This recipient does not match the selected patient.',
      category: 'General',
      priority: 'routine',
      channel: 'secure_message',
      idempotencyKey: 'patient-recipient-mismatch',
      attachmentIds: [],
    })).rejects.toThrow('PATIENT_CONTEXT_MISMATCH');
  });

  it('persists reply attachment IDs once and preserves their local-only queued delivery state', async () => {
    const attachment = await issueAttachment();
    const updated = await store.appendCommunicationMessage({
      conversationId: 'conv-pharmacy',
      actor,
      recipientId: 'org-maple-pharmacy',
      bodyText: 'Attached for review.',
      subject: 'Re: Metformin dose clarification',
      category: 'Medication',
      priority: 'urgent',
      channel: 'secure_message',
      idempotencyKey: 'reply-with-attachment',
      attachmentIds: [attachment.id],
    });

    const message = updated?.messages.at(-1);
    expect(message?.attachments).toEqual([attachment]);
    expect(message?.sentAt).toBeUndefined();
    expect(updated?.deliveries.at(-1)).toMatchObject({ state: 'queued', lastErrorCode: 'SECURE_MESSAGING_PROVIDER_UNAVAILABLE' });

    await expect(store.appendCommunicationMessage({
      conversationId: 'conv-pharmacy',
      actor,
      recipientId: 'org-maple-pharmacy',
      bodyText: 'A reused attachment must be rejected.',
      idempotencyKey: 'reply-reuse-attachment',
      attachmentIds: [attachment.id],
    })).rejects.toThrow('ATTACHMENT_ALREADY_USED');
  });

  it('records an internal note without a recipient or delivery attempt', async () => {
    const updated = await store.appendCommunicationMessage({
      conversationId: 'conv-pharmacy',
      actor,
      recipientId: 'org-maple-pharmacy',
      bodyText: 'Documented for the care team only.',
      idempotencyKey: 'internal-note-without-recipient',
      isInternalNote: true,
      attachmentIds: [],
    });

    const note = updated?.messages.at(-1);
    expect(note).toMatchObject({ isInternalNote: true, recipients: [] });
    expect(updated?.deliveries.some((delivery) => delivery.messageId === note?.id)).toBe(false);
  });

  it('hides internal notes and their event trail from another conversation participant', async () => {
    const updated = await store.appendCommunicationMessage({
      conversationId: 'conv-pharmacy',
      actor,
      bodyText: 'Internal care-team context that the pharmacy must not receive.',
      idempotencyKey: 'internal-note-private-to-author',
      isInternalNote: true,
      attachmentIds: [],
    });
    const note = updated?.messages.at(-1);
    expect(note).toMatchObject({ isInternalNote: true });

    const pharmacyActor = { id: 'org-maple-pharmacy', name: 'Maple Pharmacy', role: 'PHARMACIST' };
    const pharmacyView = await store.getCommunicationConversation('conv-pharmacy', pharmacyActor);
    const authorView = await store.getCommunicationConversation('conv-pharmacy', actor);

    expect(pharmacyView?.messages.some((message) => message.id === note?.id)).toBe(false);
    expect(pharmacyView?.timeline.some((event) => event.messageId === note?.id)).toBe(false);
    expect(authorView?.messages.some((message) => message.id === note?.id)).toBe(true);
  });

  it('projects mutation responses so a non-author cannot receive an internal note', async () => {
    const internal = await store.appendCommunicationMessage({ conversationId: 'conv-pharmacy', actor, bodyText: 'Private clinical note.', idempotencyKey: 'internal-note-before-external-reply', isInternalNote: true, attachmentIds: [] });
    const noteId = internal?.messages.at(-1)?.id;
    const pharmacyActor = { id: 'org-maple-pharmacy', name: 'Maple Pharmacy', role: 'PHARMACIST' };

    const response = await store.appendCommunicationMessage({ conversationId: 'conv-pharmacy', actor: pharmacyActor, recipientId: actor.id, bodyText: 'External participant reply.', idempotencyKey: 'external-participant-reply', attachmentIds: [] });

    expect(response?.messages.some((message) => message.id === noteId)).toBe(false);
    expect(response?.events.some((event) => event.messageId === noteId)).toBe(false);
  });

  it('rejects appending messages to a closed conversation', async () => {
    await store.resolveCommunicationConversation('conv-pharmacy', actor, 'closed', 'close-conversation-before-reply');

    await expect(store.appendCommunicationMessage({
      conversationId: 'conv-pharmacy',
      actor,
      recipientId: 'org-maple-pharmacy',
      bodyText: 'This reply must not be accepted after closure.',
      idempotencyKey: 'reply-after-close',
      attachmentIds: [],
    })).rejects.toThrow('CONVERSATION_CLOSED');
  });

  it('rejects a call attempt against a closed conversation', async () => {
    await store.resolveCommunicationConversation('conv-pharmacy', actor, 'closed', 'close-conversation-before-call');

    await expect(store.startCommunicationCall({
      actor,
      conversationId: 'conv-pharmacy',
      patientId: 'patient-001',
      recipientId: 'org-maple-pharmacy',
      idempotencyKey: 'call-after-close',
    })).rejects.toThrow('CONVERSATION_CLOSED');
  });

  it('returns participant-scoped, cursor-safe local call history and includes call-only conversations in the channel filter', async () => {
    const callSnapshot = await store.getCommunicationHubSnapshot(actor, { channel: 'call' });
    expect(callSnapshot.conversations.map((conversation) => conversation.id)).toEqual(expect.arrayContaining(['conv-pharmacy', 'conv-patient']));
    expect(callSnapshot.conversations.every((conversation) => conversation.channels.includes('call'))).toBe(true);

    const firstPage = await store.listCommunicationCalls(actor, { patientId: 'patient-001', statuses: ['failed'], limit: 1 });
    expect(firstPage.calls).toHaveLength(1);
    expect(firstPage.calls[0]).toMatchObject({ patientId: 'patient-001', state: 'failed', stateHistory: expect.any(Array) });
    expect(firstPage.nextCursor).toEqual(expect.any(String));

    const secondPage = await store.listCommunicationCalls(actor, { patientId: 'patient-001', statuses: ['failed'], limit: 1, cursor: firstPage.nextCursor });
    expect(secondPage.calls).toHaveLength(1);
    expect(secondPage.calls[0]?.id).not.toBe(firstPage.calls[0]?.id);
    await expect(store.listCommunicationCalls({ id: 'unrelated-clinician', name: 'Unrelated Clinician', role: 'DOCTOR' })).resolves.toEqual({ calls: [], nextCursor: undefined });
    await expect(store.listCommunicationCalls(actor, { from: 'not-a-date' })).rejects.toThrow('CALL_DATE_INVALID');
  });

  it('records an accepted provider call as a legal created-to-ringing history and safely replays it', async () => {
    const started = await store.startCommunicationCall({ actor, conversationId: 'conv-pharmacy', patientId: 'patient-001', recipientId: 'org-maple-pharmacy', idempotencyKey: 'provider-call-history', correlationId: 'corr-provider-call' });
    if (!started) throw new Error('Expected the local call record.');

    expect(started).toMatchObject({ state: 'ringing', provider: 'mock', controlPlaneCallId: 'control-call-1', providerCallId: 'mock-room-1' });
    expect(started.stateHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'created', toState: 'created', result: 'applied' }),
      expect.objectContaining({ action: 'provider_accepted', toState: 'ringing', result: 'applied' }),
    ]));
    await expect(store.startCommunicationCall({ actor, conversationId: 'conv-pharmacy', patientId: 'patient-001', recipientId: 'org-maple-pharmacy', idempotencyKey: 'provider-call-history' })).resolves.toMatchObject({ id: started.id });
    expect(providerMocks.initiateCall).toHaveBeenCalledTimes(1);
  });

  it('persists a categorized provider failure before returning it to the API route', async () => {
    providerMocks.initiateCall.mockRejectedValue({ code: 'CALL_PROVIDER_TIMEOUT', status: 504, detail: 'The call provider timed out.', retryable: true });
    await expect(store.startCommunicationCall({ actor, conversationId: 'conv-pharmacy', patientId: 'patient-001', recipientId: 'org-maple-pharmacy', idempotencyKey: 'provider-timeout-history' })).rejects.toMatchObject({ code: 'CALL_PROVIDER_TIMEOUT', status: 504 });

    const calls = await store.listCommunicationCalls(actor, { patientId: 'patient-001', statuses: ['failed'] });
    const failed = calls.calls.find((call) => call.errorCode === 'CALL_PROVIDER_TIMEOUT');
    expect(failed).toMatchObject({ state: 'failed', errorDetail: 'The call provider timed out.' });
    if (!failed) throw new Error('Expected failed call audit record.');

    const disposition = await store.updateCommunicationCall({ callId: failed.id, actor, action: 'set_disposition', dispositionCode: 'provider_timeout', idempotencyKey: 'call-disposition-once' });
    expect(disposition).toMatchObject({ providerUnavailable: false, replayed: false, call: { dispositionCode: 'provider_timeout', state: 'failed' } });
    expect(disposition?.call.stateHistory.at(-1)).toMatchObject({ action: 'set_disposition', fromState: 'failed', toState: 'failed', result: 'applied' });
    await expect(store.updateCommunicationCall({ callId: failed.id, actor, action: 'set_disposition', dispositionCode: 'provider_timeout', idempotencyKey: 'call-disposition-once' })).resolves.toMatchObject({ replayed: true });
    await expect(store.updateCommunicationCall({ callId: failed.id, actor, action: 'set_disposition', dispositionCode: 'different_disposition', idempotencyKey: 'call-disposition-once' })).rejects.toThrow('IDEMPOTENCY_CONFLICT');
  });

  it('synchronizes an active provider call into the connected local UI state', async () => {
    const started = await store.startCommunicationCall({ actor, conversationId: 'conv-pharmacy', patientId: 'patient-001', recipientId: 'org-maple-pharmacy', idempotencyKey: 'provider-state-refresh' });
    if (!started) throw new Error('Expected a provider-backed call.');
    providerMocks.getCallStatus.mockResolvedValue({ callId: 'control-call-1', state: 'ACTIVE', provider: 'mock', providerCallId: 'mock-room-1' });

    const refreshed = await store.getCommunicationCall(started.id, actor, 'patient-001');
    expect(refreshed).toMatchObject({ id: started.id, state: 'connected', provider: 'mock' });
    expect(refreshed?.stateHistory.at(-1)).toMatchObject({ action: 'provider_status', toState: 'connected' });
  });

  it('does not fabricate a media transition when a valid action has no provider and rejects illegal state transitions', async () => {
    const callId = await seedProviderFreeCreatedCall();
    const attempted = await store.updateCommunicationCall({ callId, actor, action: 'dial', idempotencyKey: 'dial-without-provider' });

    expect(attempted).toMatchObject({ providerUnavailable: true, replayed: false, call: { state: 'failed', errorCode: 'TELEPHONY_UNAVAILABLE' } });
    expect(attempted?.call.stateHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'dial', fromState: 'created', toState: 'created', requestedState: 'dialing', result: 'provider_unavailable' }),
    ]));
    await expect(store.updateCommunicationCall({ callId, actor, action: 'dial', idempotencyKey: 'dial-without-provider' })).resolves.toMatchObject({ providerUnavailable: true, replayed: true });
    await expect(store.updateCommunicationCall({ callId, actor, action: 'hold', idempotencyKey: 'hold-before-connect' })).rejects.toThrow('CALL_STATE_CONFLICT');
  });

  it('refuses to classify a clinician-to-laboratory thread as a patient video visit even when it has a LiveKit control-plane record', async () => {
    await store.getCommunicationHubSnapshot(actor);
    const raw = JSON.parse(await fs.readFile(storeFile, 'utf8')) as { conversations: Array<{ id: string; calls: unknown[] }> };
    const conversation = raw.conversations.find((candidate) => candidate.id === 'conv-lab');
    if (!conversation) throw new Error('Expected seeded laboratory conversation.');
    const callId = `call-lab-livekit-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    conversation.calls.push({
      id: callId,
      conversationId: 'conv-lab',
      patientId: 'patient-002',
      callType: 'video',
      initiatedBy: actor,
      direction: 'outbound',
      state: 'ringing',
      provider: 'livekit',
      controlPlaneCallId: `control-${callId}`,
      providerCallId: `room-${callId}`,
      startedAt: now,
      recordingState: 'not_allowed',
      transcriptionState: 'disabled',
      participants: [],
      notes: [],
      revision: 1,
      stateHistory: [{ id: `history-${callId}`, version: 1, action: 'created', toState: 'ringing', occurredAt: now, actor, result: 'applied' }],
    });
    await fs.writeFile(storeFile, JSON.stringify(raw), 'utf8');

    await expect(store.startCommunicationCall({
      actor,
      conversationId: 'conv-lab',
      patientId: 'patient-002',
      recipientId: 'org-toronto-diagnostics',
      callType: 'video',
      idempotencyKey: 'laboratory-thread-video-attempt',
    })).rejects.toThrow('TELEHEALTH_PATIENT_PARTICIPANT_REQUIRED');
    await expect(store.getTelehealthMeetingContext(callId, actor, 'patient-002')).resolves.toMatchObject({
      eligible: false,
      code: 'TELEHEALTH_PATIENT_PARTICIPANT_REQUIRED',
      localDemoAllowed: false,
    });
    expect(providerMocks.initiateCall).not.toHaveBeenCalled();
  });

  it('never issues a meeting context for an audio control-plane record, even when patient and visit references are present', async () => {
    await store.getCommunicationHubSnapshot(actor);
    const raw = JSON.parse(await fs.readFile(storeFile, 'utf8')) as { conversations: Array<{ id: string; appointmentId?: string; calls: Array<Record<string, unknown>> }> };
    const conversation = raw.conversations.find((candidate) => candidate.id === 'conv-patient');
    if (!conversation) throw new Error('Expected seeded patient conversation.');
    conversation.appointmentId = 'appointment-local-demo';
    const callId = `call-audio-livekit-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    conversation.calls.push({
      id: callId,
      conversationId: 'conv-patient',
      patientId: 'patient-001',
      callType: 'audio',
      initiatedBy: actor,
      direction: 'outbound',
      state: 'ringing',
      provider: 'livekit',
      controlPlaneCallId: `control-${callId}`,
      providerCallId: `room-${callId}`,
      startedAt: now,
      recordingState: 'not_allowed',
      transcriptionState: 'disabled',
      participants: [],
      notes: [],
      revision: 1,
      stateHistory: [{ id: `history-${callId}`, version: 1, action: 'created', toState: 'ringing', occurredAt: now, actor, result: 'applied' }],
    });
    await fs.writeFile(storeFile, JSON.stringify(raw), 'utf8');

    await expect(store.getTelehealthMeetingContext(callId, actor, 'patient-001')).resolves.toMatchObject({
      eligible: false,
      code: 'TELEHEALTH_VIDEO_CALL_REQUIRED',
      localDemoAllowed: false,
    });
  });

  it('ends LiveKit media only after the control plane confirms a terminal state', async () => {
    await store.getCommunicationHubSnapshot(actor);
    const raw = JSON.parse(await fs.readFile(storeFile, 'utf8')) as { conversations: Array<{ id: string; calls: Array<Record<string, unknown>> }> };
    const conversation = raw.conversations.find((candidate) => candidate.id === 'conv-patient');
    if (!conversation) throw new Error('Expected seeded patient conversation.');
    const callId = `call-livekit-end-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    conversation.calls.push({
      id: callId,
      conversationId: 'conv-patient',
      patientId: 'patient-001',
      callType: 'video',
      initiatedBy: actor,
      direction: 'outbound',
      state: 'ringing',
      provider: 'livekit',
      controlPlaneCallId: `control-${callId}`,
      providerCallId: `room-${callId}`,
      startedAt: now,
      recordingState: 'not_allowed',
      transcriptionState: 'disabled',
      participants: [],
      notes: [],
      revision: 1,
      stateHistory: [{ id: `history-${callId}`, version: 1, action: 'created', toState: 'ringing', occurredAt: now, actor, result: 'applied' }],
    });
    await fs.writeFile(storeFile, JSON.stringify(raw), 'utf8');
    providerMocks.endCall.mockResolvedValue({ callId: `control-${callId}`, state: 'CANCELLED', provider: 'livekit', providerCallId: `room-${callId}` });

    const ended = await store.endCommunicationCall({ callId, actor, patientId: 'patient-001', correlationId: 'control-plane-end' });

    expect(providerMocks.endCall).toHaveBeenCalledWith({ actor: { id: actor.id, role: actor.role }, callId: `control-${callId}`, correlationId: 'control-plane-end' });
    expect(ended).toMatchObject({ id: callId, state: 'cancelled', provider: 'livekit' });
    expect(ended?.stateHistory.at(-1)).toMatchObject({ action: 'provider_status', toState: 'cancelled', result: 'applied' });

    await expect(store.endCommunicationCall({ callId, actor, patientId: 'patient-001' })).resolves.toMatchObject({ id: callId, state: 'cancelled' });
    expect(providerMocks.endCall).toHaveBeenCalledTimes(1);
  });

  it('records manual confirmations against the selected delivery without overwriting history', async () => {
    const before = await store.getCommunicationConversation('conv-pharmacy', actor);
    const delivery = before?.deliveries.find((item) => item.id === 'delivery-pharmacy-pms');
    if (!delivery) throw new Error('Expected seeded pharmacy delivery.');

    await store.recordManualDeliveryConfirmation({ messageId: delivery.messageId, deliveryId: delivery.id, actor, method: 'Phone', confirmedWith: 'Jordan Singh', confirmedAt: '2026-09-13T12:00:00.000Z', note: 'Confirmed receipt by phone.', idempotencyKey: 'manual-confirmation-one' });
    const updated = await store.recordManualDeliveryConfirmation({ messageId: delivery.messageId, deliveryId: delivery.id, actor, method: 'Fax', confirmedWith: 'Maple Pharmacy', confirmedAt: '2026-09-13T12:05:00.000Z', note: 'Filed a fax confirmation.', idempotencyKey: 'manual-confirmation-two' });
    const updatedDelivery = updated?.deliveries.find((item) => item.id === delivery.id);

    expect(updatedDelivery).toMatchObject({ state: delivery.state, manualConfirmation: expect.objectContaining({ method: 'Fax' }) });
    expect(updatedDelivery?.manualConfirmations).toEqual(expect.arrayContaining([
      expect.objectContaining({ method: 'Phone', confirmedWith: 'Jordan Singh' }),
      expect.objectContaining({ method: 'Fax', confirmedWith: 'Maple Pharmacy' }),
    ]));
    await expect(store.recordManualDeliveryConfirmation({ messageId: delivery.messageId, deliveryId: 'not-this-delivery', actor, method: 'Phone', confirmedWith: 'Jordan Singh', confirmedAt: new Date().toISOString(), note: 'Wrong record.', idempotencyKey: 'manual-confirmation-wrong-delivery' })).rejects.toThrow('DELIVERY_NOT_FOUND');
  });

  it('keeps patient-scoped snapshots and drafts within the selected patient context', async () => {
    await store.saveCommunicationDraft({ id: 'draft-patient-one', revision: 0, actor, patientId: 'patient-001', recipientId: await preferredRecipientId(), channel: 'secure_message', subject: 'Sarah draft', bodyText: 'Scoped draft.' });
    const snapshot = await store.getCommunicationHubSnapshot(actor, { patientId: 'patient-001' });

    expect(snapshot.conversations.every((conversation) => conversation.patientId === 'patient-001')).toBe(true);
    expect(snapshot.drafts).toEqual([expect.objectContaining({ id: 'draft-patient-one', patientId: 'patient-001' })]);
    await expect(store.saveCommunicationDraft({ id: 'draft-invalid-reply-recipient', revision: 0, actor, conversationId: 'conv-pharmacy', patientId: 'patient-001', recipientId: 'org-toronto-diagnostics', channel: 'secure_message', subject: 'Invalid reply', bodyText: 'This recipient is not in the conversation.' })).rejects.toThrow('RECIPIENT_NOT_AUTHORIZED');
  });

  it('uses revisions to reject stale draft saves and atomically completes a submitted draft', async () => {
    const draft = await store.saveCommunicationDraft({ id: 'draft-to-submit', revision: 0, actor, patientId: 'patient-001', recipientId: await preferredRecipientId(), channel: 'secure_message', subject: 'Submit this draft', bodyText: 'The submitted message must remove this draft.' });
    await expect(store.saveCommunicationDraft({ id: draft.id, revision: 0, actor, patientId: 'patient-001', recipientId: await preferredRecipientId(), channel: 'secure_message', subject: 'Stale copy', bodyText: 'This stale save must not overwrite the newer draft.' })).rejects.toThrow('DRAFT_VERSION_CONFLICT');

    await store.createCommunicationConversation({ actor, patientId: 'patient-001', recipientId: await preferredRecipientId(), subject: draft.subject, bodyText: draft.bodyText, category: 'General', priority: 'routine', channel: 'secure_message', idempotencyKey: 'submit-draft-once', attachmentIds: [], draftId: draft.id });

    await expect(store.getCommunicationDrafts(actor)).resolves.toEqual([]);
    await expect(store.saveCommunicationDraft({ id: draft.id, revision: draft.revision, actor, patientId: 'patient-001', recipientId: await preferredRecipientId(), channel: 'secure_message', subject: draft.subject, bodyText: draft.bodyText })).rejects.toThrow('DRAFT_ALREADY_SUBMITTED');
  });

  it('scopes idempotency to the actor and rejects conflicting replays', async () => {
    const idempotencyKey = 'create-conversation-once';
    const created = await createConversation([], 'patient-001', actor, idempotencyKey);
    const replayed = await createConversation([], 'patient-001', actor, idempotencyKey);
    expect(replayed.id).toBe(created.id);

    await expect(store.createCommunicationConversation({
      actor,
      patientId: 'patient-001',
      recipientId: await preferredRecipientId(),
      subject: 'Care coordination',
      bodyText: 'Changed payload with the same key.',
      category: 'General',
      priority: 'routine',
      channel: 'secure_message',
      idempotencyKey,
      attachmentIds: [],
    })).rejects.toThrow('IDEMPOTENCY_CONFLICT');
  });

  it('does not allow a non-participant to mutate a conversation in development', async () => {
    const outsider = { id: 'unrelated-clinician', name: 'Unrelated Clinician', role: 'DOCTOR' };
    await expect(store.appendCommunicationMessage({ conversationId: 'conv-pharmacy', actor: outsider, bodyText: 'Unauthorized reply', idempotencyKey: 'outsider-reply' })).resolves.toBeNull();
    await expect(store.markCommunicationRead('conv-pharmacy', outsider)).resolves.toBeNull();
    await expect(store.resolveCommunicationConversation('conv-pharmacy', outsider)).resolves.toBeNull();
  });

  it('keeps a mixed-channel conversation visible to either message-channel filter', async () => {
    const created = await store.createCommunicationConversation({
      actor,
      patientId: 'patient-001',
      recipientId: await preferredRecipientId(),
      subject: 'Mixed channel coordination',
      bodyText: 'Initial email record.',
      category: 'General',
      priority: 'routine',
      channel: 'email',
      idempotencyKey: 'mixed-channel-create',
      attachmentIds: [],
    });
    await store.appendCommunicationMessage({
      conversationId: created.id,
      actor,
      recipientId: 'org-maple-pharmacy',
      bodyText: 'Follow-up secure message.',
      channel: 'secure_message',
      idempotencyKey: 'mixed-channel-reply',
      attachmentIds: [],
    });

    const emailSnapshot = await store.getCommunicationHubSnapshot(actor, { channel: 'email' });
    const secureMessageSnapshot = await store.getCommunicationHubSnapshot(actor, { channel: 'secure_message' });
    expect(emailSnapshot.conversations.find((conversation) => conversation.id === created.id)?.channels).toEqual(expect.arrayContaining(['email', 'secure_message']));
    expect(secureMessageSnapshot.conversations.some((conversation) => conversation.id === created.id)).toBe(true);
  });

});
