import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { Patient } from '@/app/dashboard/records/mockPatients';
import { resolveDataPath } from '@/lib/dataPath';

type MessageActor = { id: string; name: string; role?: string };
export type MessageParticipantType = 'patient' | 'care-team';

export type SecureMessage = {
  id: string;
  conversationId: string;
  author: MessageActor;
  body: string;
  sentAt: string;
  readBy: string[];
  idempotencyKey?: string;
};

export type MessageConversation = {
  id: string;
  patientId?: string;
  patientName?: string;
  participant: { id: string; name: string; type: MessageParticipantType };
  subject: string;
  createdBy: MessageActor;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  requiresFollowUp: boolean;
  pinnedBy?: string[];
  messages: SecureMessage[];
};

const MESSAGES_FILE = resolveDataPath('secure_messages.json');
let writeQueue = Promise.resolve();

async function readAll(): Promise<MessageConversation[]> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(MESSAGES_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed.filter((item): item is MessageConversation => Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')) : [];
  } catch {
    return [];
  }
}

async function writeAll(items: MessageConversation[]) {
  await fs.mkdir(path.dirname(MESSAGES_FILE), { recursive: true });
  const temporaryFile = `${MESSAGES_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(items, null, 2), 'utf8');
  await fs.rename(temporaryFile, MESSAGES_FILE);
}

async function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = writeQueue;
  let release!: () => void;
  writeQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try { return await operation(); } finally { release(); }
}

function unreadCount(conversation: MessageConversation, actorId: string) {
  return conversation.messages.filter((message) => message.author.id !== actorId && !message.readBy.includes(actorId)).length;
}

export function summarizeConversation(conversation: MessageConversation, actorId: string) {
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  return {
    id: conversation.id,
    patientId: conversation.patientId,
    patientName: conversation.patientName,
    participant: conversation.participant,
    subject: conversation.subject,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    archived: conversation.archived,
    requiresFollowUp: conversation.requiresFollowUp,
    pinned: conversation.pinnedBy?.includes(actorId) || false,
    unreadCount: unreadCount(conversation, actorId),
    preview: lastMessage?.body || 'No messages yet',
    lastMessageAt: lastMessage?.sentAt || conversation.updatedAt,
  };
}

export async function listConversations(actorId: string, includeArchived = false) {
  const items = await readAll();
  return items
    .filter((conversation) => includeArchived || !conversation.archived)
    .filter((conversation) => conversation.createdBy.id === actorId || conversation.messages.some((message) => message.author.id === actorId))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export async function getConversation(id: string, actorId: string) {
  const conversation = (await listConversations(actorId, true)).find((item) => item.id === id);
  return conversation || null;
}

export async function createConversation(input: { patient?: Patient; participant: { id: string; name: string; type: MessageParticipantType }; subject: string; body: string; actor: MessageActor; idempotencyKey?: string }) {
  return withWriteLock(async () => {
    const items = await readAll();
    if (input.idempotencyKey) {
      const existing = items.find((conversation) => conversation.messages.some((message) => message.idempotencyKey === input.idempotencyKey));
      if (existing) return existing;
    }
    const now = new Date().toISOString();
    const conversationId = randomUUID();
    const message: SecureMessage = { id: randomUUID(), conversationId, author: input.actor, body: input.body.trim(), sentAt: now, readBy: [input.actor.id], idempotencyKey: input.idempotencyKey };
    const conversation: MessageConversation = { id: conversationId, ...(input.patient ? { patientId: input.patient.id, patientName: input.patient.name } : {}), participant: input.participant, subject: input.subject.trim(), createdBy: input.actor, createdAt: now, updatedAt: now, archived: false, requiresFollowUp: false, messages: [message] };
    await writeAll([conversation, ...items]);
    return conversation;
  });
}

export async function sendMessage(conversationId: string, actor: MessageActor, body: string, idempotencyKey?: string) {
  return withWriteLock(async () => {
    const items = await readAll();
    const conversation = items.find((item) => item.id === conversationId && (item.createdBy.id === actor.id || item.messages.some((message) => message.author.id === actor.id)));
    if (!conversation) return null;
    if (idempotencyKey) {
      const existing = conversation.messages.find((message) => message.idempotencyKey === idempotencyKey);
      if (existing) return conversation;
    }
    const now = new Date().toISOString();
    conversation.messages.push({ id: randomUUID(), conversationId, author: actor, body: body.trim(), sentAt: now, readBy: [actor.id], idempotencyKey });
    conversation.updatedAt = now;
    await writeAll(items);
    return conversation;
  });
}

export async function markConversationRead(conversationId: string, actorId: string) {
  return withWriteLock(async () => {
    const items = await readAll();
    const conversation = items.find((item) => item.id === conversationId && (item.createdBy.id === actorId || item.messages.some((message) => message.author.id === actorId)));
    if (!conversation) return null;
    conversation.messages = conversation.messages.map((message) => message.readBy.includes(actorId) ? message : { ...message, readBy: [...message.readBy, actorId] });
    await writeAll(items);
    return conversation;
  });
}

export async function setConversationFollowUp(conversationId: string, actorId: string, requiresFollowUp: boolean) {
  return withWriteLock(async () => {
    const items = await readAll();
    const conversation = items.find((item) => item.id === conversationId && (item.createdBy.id === actorId || item.messages.some((message) => message.author.id === actorId)));
    if (!conversation) return null;
    conversation.requiresFollowUp = requiresFollowUp;
    conversation.updatedAt = new Date().toISOString();
    await writeAll(items);
    return conversation;
  });
}

export async function toggleConversationPin(conversationId: string, actorId: string) {
  return withWriteLock(async () => {
    const items = await readAll();
    const conversation = items.find((item) => item.id === conversationId && (item.createdBy.id === actorId || item.messages.some((message) => message.author.id === actorId)));
    if (!conversation) return null;
    const pinnedBy = conversation.pinnedBy || [];
    conversation.pinnedBy = pinnedBy.includes(actorId) ? pinnedBy.filter((id) => id !== actorId) : [...pinnedBy, actorId];
    conversation.updatedAt = new Date().toISOString();
    await writeAll(items);
    return conversation;
  });
}

export async function archiveConversation(conversationId: string, actorId: string) {
  return withWriteLock(async () => {
    const items = await readAll();
    const conversation = items.find((item) => item.id === conversationId && item.createdBy.id === actorId);
    if (!conversation) return null;
    conversation.archived = true;
    conversation.updatedAt = new Date().toISOString();
    await writeAll(items);
    return conversation;
  });
}

export async function messageCounts(actorId: string) {
  const conversations = await listConversations(actorId);
  return {
    unread: conversations.reduce((sum, item) => sum + unreadCount(item, actorId), 0),
    patientMessages: conversations.filter((item) => item.participant.type === 'patient').length,
    careTeam: conversations.filter((item) => item.participant.type === 'care-team').length,
    followUp: conversations.filter((item) => item.requiresFollowUp).length,
  };
}
