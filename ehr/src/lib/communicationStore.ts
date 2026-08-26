import { listConversations, messageCounts, summarizeConversation, type MessageConversation } from '@/lib/messageStore';
import { getCommunicationProviderStatus } from '@/lib/communicationProviders';

export type CommunicationChannel = 'email' | 'message' | 'call' | 'voicemail';
export type CommunicationPriority = 'urgent' | 'high' | 'normal';
export type CommunicationStatus = 'new' | 'read' | 'waiting' | 'scheduled' | 'completed' | 'archived';

type ConversationSummary = ReturnType<typeof summarizeConversation>;

export type CommunicationItem = {
  id: string;
  channel: CommunicationChannel;
  contactName: string;
  patientId?: string;
  patientName?: string;
  subject: string;
  preview: string;
  occurredAt: string;
  status: CommunicationStatus;
  priority: CommunicationPriority;
  unread: boolean;
  requiresFollowUp: boolean;
  pinned: boolean;
  href: string;
};

export type CommunicationSnapshot = {
  actor: { id: string; name: string; role: string };
  generatedAt: string;
  query: string;
  channel: CommunicationChannel | 'all';
  items: CommunicationItem[];
  counts: {
    unread: number;
    urgent: number;
    waitingForReply: number;
    overdueFollowUps: number;
    callsToday: number | null;
    voicemails: number | null;
    scheduledCommunications: number | null;
  };
  channels: {
    email: { available: boolean; unread: number; attention: number; latest?: CommunicationItem; reason?: string };
    messages: { available: boolean; unread: number; urgent: number; latest?: CommunicationItem };
    calls: { available: boolean; missed: number | null; voicemails: number | null; next?: string; reason?: string };
  };
  needsAttention: CommunicationItem[];
  followUps: CommunicationItem[];
  today: CommunicationItem[];
  pinned: CommunicationItem[];
  drafts: CommunicationItem[];
  recentAttachments: CommunicationItem[];
  upcoming: CommunicationItem[];
};

function normalized(value?: string) {
  return (value || '').trim().toLowerCase();
}

function isToday(value: string, now: Date) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toDateString() === now.toDateString();
}

function messageItem(conversation: ConversationSummary): CommunicationItem {
  const unread = conversation.unreadCount > 0;
  const requiresFollowUp = conversation.requiresFollowUp;
  return {
    id: conversation.id,
    channel: 'message',
    contactName: conversation.participant.name,
    patientId: conversation.patientId,
    patientName: conversation.patientName,
    subject: conversation.subject,
    preview: conversation.preview,
    occurredAt: conversation.lastMessageAt,
    status: conversation.archived ? 'archived' : requiresFollowUp ? 'waiting' : unread ? 'new' : 'read',
    priority: 'normal',
    unread,
    requiresFollowUp,
    pinned: conversation.pinned,
    href: `/communication/messages?conversation=${encodeURIComponent(conversation.id)}`,
  };
}

function matchesQuery(item: CommunicationItem, query: string) {
  if (!query) return true;
  return [item.contactName, item.patientName, item.subject, item.preview].filter(Boolean).join(' ').toLowerCase().includes(query);
}

export async function getCommunicationSnapshot(actorId: string, actorName: string, actorRole: string, input: { query?: string; channel?: CommunicationChannel | 'all'; includeArchived?: boolean } = {}): Promise<CommunicationSnapshot> {
  const query = normalized(input.query);
  const channel = input.channel || 'all';
  const conversations = await listConversations(actorId, input.includeArchived || false);
  const allItems = conversations.map((conversation) => messageItem(summarizeConversation(conversation, actorId)));
  const items = allItems.filter((item) => (channel === 'all' || item.channel === channel) && matchesQuery(item, query));
  const counts = await messageCounts(actorId);
  const now = new Date();
  const providers = getCommunicationProviderStatus();
  const needsAttention = allItems.filter((item) => item.unread || item.requiresFollowUp);
  const followUps = allItems.filter((item) => item.requiresFollowUp);
  const today = allItems.filter((item) => isToday(item.occurredAt, now));
  const pinned = allItems.filter((item) => item.pinned);
  const messagesLatest = allItems[0];
  return {
    actor: { id: actorId, name: actorName, role: actorRole },
    generatedAt: now.toISOString(),
    query: input.query || '',
    channel,
    items,
    counts: { unread: counts.unread, urgent: 0, waitingForReply: counts.followUp, overdueFollowUps: 0, callsToday: null, voicemails: null, scheduledCommunications: null },
    channels: {
      email: { available: providers.email.available, unread: 0, attention: 0, reason: providers.email.reason },
      messages: { available: true, unread: counts.unread, urgent: 0, latest: messagesLatest },
      calls: { available: providers.telephony.available, missed: null, voicemails: null, reason: providers.telephony.reason },
    },
    needsAttention,
    followUps,
    today,
    pinned,
    drafts: [],
    recentAttachments: [],
    upcoming: [],
  };
}

export function communicationItemFromConversation(conversation: MessageConversation) {
  return messageItem(summarizeConversation(conversation, conversation.createdBy.id));
}
