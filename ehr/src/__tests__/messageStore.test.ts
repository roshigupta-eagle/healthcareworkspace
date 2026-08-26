import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs/promises';
import { resolveDataPath } from '@/lib/dataPath';
import { getCommunicationSnapshot } from '@/lib/communicationStore';
import { archiveConversation, createConversation, getConversation, listConversations, messageCounts, sendMessage, setConversationFollowUp, toggleConversationPin } from '@/lib/messageStore';

const storeFile = resolveDataPath('secure_messages.json');
const actor = { id: 'test-doctor', name: 'Test Doctor', role: 'DOCTOR' };

async function clearStore() {
  await fs.rm(storeFile, { force: true });
}

describe('secure message store', () => {
  beforeEach(async () => { await clearStore(); });
  afterAll(async () => { await clearStore(); });

  it('persists conversations and makes repeated idempotent sends safe', async () => {
    const first = await createConversation({ participant: { id: 'patient-001', name: 'Patient One', type: 'patient' }, subject: 'Follow-up', body: 'Please confirm your appointment.', actor, idempotencyKey: 'new-1' });
    const repeatedCreate = await createConversation({ participant: { id: 'patient-001', name: 'Patient One', type: 'patient' }, subject: 'Follow-up', body: 'Please confirm your appointment.', actor, idempotencyKey: 'new-1' });
    expect(repeatedCreate.id).toBe(first.id);

    const firstReply = await sendMessage(first.id, actor, 'A second secure message.', 'reply-1');
    const repeatedReply = await sendMessage(first.id, actor, 'A second secure message.', 'reply-1');
    expect(firstReply?.messages).toHaveLength(2);
    expect(repeatedReply?.messages).toHaveLength(2);

    await setConversationFollowUp(first.id, actor.id, true);
    expect((await messageCounts(actor.id)).followUp).toBe(1);
    expect((await getConversation(first.id, actor.id))?.messages).toHaveLength(2);

    await archiveConversation(first.id, actor.id);
    expect(await listConversations(actor.id)).toHaveLength(0);
    expect(await listConversations(actor.id, true)).toHaveLength(1);
  });

  it('projects secure conversations into the Communication Hub with user-scoped pins', async () => {
    const conversation = await createConversation({ participant: { id: 'patient-001', name: 'Patient One', type: 'patient' }, subject: 'Lab follow-up', body: 'Please review your result.', actor });
    let snapshot = await getCommunicationSnapshot(actor.id, actor.name, actor.role);
    expect(snapshot.items[0]).toMatchObject({ id: conversation.id, channel: 'message', preview: 'Please review your result.', pinned: false });

    await toggleConversationPin(conversation.id, actor.id);
    snapshot = await getCommunicationSnapshot(actor.id, actor.name, actor.role);
    expect(snapshot.pinned[0]).toMatchObject({ id: conversation.id, pinned: true });
  });
});
