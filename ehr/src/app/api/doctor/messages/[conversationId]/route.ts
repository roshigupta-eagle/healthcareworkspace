import { NextResponse } from 'next/server';
import { archiveConversation, getConversation, markConversationRead, sendMessage, setConversationFollowUp } from '@/lib/messageStore';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

function messageText(value: unknown) { return typeof value === 'string' ? value.trim().slice(0, 10000) : ''; }

export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const actor = access.actor!;
  const { conversationId } = await params;
  const conversation = await getConversation(conversationId, actor.id);
  return conversation ? NextResponse.json({ data: conversation }) : NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const actor = access.actor!;
  const { conversationId } = await params;
  let body: { body?: unknown; idempotencyKey?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid message request.' }, { status: 400 }); }
  const text = messageText(body.body);
  if (!text) return NextResponse.json({ error: 'Message text is required.' }, { status: 400 });
  const conversation = await sendMessage(conversationId, actor, text, messageText(body.idempotencyKey) || undefined);
  if (!conversation) return NextResponse.json({ error: 'Conversation not found or access denied.' }, { status: 404 });
  await logAuditEvent({ agentId: actor.id, entityType: 'Communication', entityId: conversationId, action: 'C', outcome: 'success', description: 'Sent secure doctor workspace message' });
  return NextResponse.json({ data: conversation });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const actor = access.actor!;
  const { conversationId } = await params;
  let body: { action?: unknown; requiresFollowUp?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid conversation update.' }, { status: 400 }); }
  const action = body.action;
  const conversation = action === 'read'
    ? await markConversationRead(conversationId, actor.id)
    : action === 'follow-up'
      ? await setConversationFollowUp(conversationId, actor.id, body.requiresFollowUp !== false)
      : action === 'archive'
        ? await archiveConversation(conversationId, actor.id)
        : null;
  if (!conversation) return NextResponse.json({ error: 'Conversation not found or action is not permitted.' }, { status: 404 });
  await logAuditEvent({ agentId: actor.id, entityType: 'Communication', entityId: conversationId, action: 'U', outcome: 'success', description: `Updated conversation: ${String(action)}` });
  return NextResponse.json({ data: conversation });
}
