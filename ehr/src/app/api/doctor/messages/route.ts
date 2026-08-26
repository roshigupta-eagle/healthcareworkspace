import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { createConversation, getConversation, listConversations, messageCounts, summarizeConversation } from '@/lib/messageStore';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

function textValue(value: unknown, max = 10000) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const actor = access.actor!;
  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversationId');
  if (conversationId) {
    const conversation = await getConversation(conversationId, actor.id);
    return conversation ? NextResponse.json({ data: conversation }) : NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  }
  const conversations = await listConversations(actor.id, url.searchParams.get('includeArchived') === 'true');
  return NextResponse.json({ data: conversations.map((conversation) => summarizeConversation(conversation, actor.id)), counts: await messageCounts(actor.id) }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function POST(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const actor = access.actor!;
  let body: { patientId?: unknown; participantType?: unknown; participantId?: unknown; participantName?: unknown; subject?: unknown; body?: unknown; idempotencyKey?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid message request.' }, { status: 400 }); }
  const messageBody = textValue(body.body);
  const subject = textValue(body.subject, 240);
  const participantType = body.participantType === 'care-team' ? 'care-team' : 'patient';
  const participantName = textValue(body.participantName, 160);
  if (!messageBody || !subject || !participantName) return NextResponse.json({ error: 'Recipient, subject, and message are required.' }, { status: 400 });
  const patientId = typeof body.patientId === 'string' && body.patientId.trim() ? body.patientId.trim() : undefined;
  const patient = patientId ? getPatientById(patientId) : undefined;
  if (participantType === 'patient' && !patient) return NextResponse.json({ error: 'A valid patient is required for patient messages.' }, { status: 400 });
  const participantId = textValue(body.participantId, 160) || participantName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const idempotencyKey = textValue(body.idempotencyKey, 160) || undefined;
  const conversation = await createConversation({ patient, participant: { id: participantId, name: participantName, type: participantType }, subject, body: messageBody, actor, idempotencyKey });
  await logAuditEvent({ agentId: actor.id, entityType: 'Communication', entityId: conversation.id, action: 'C', outcome: 'success', description: 'Created secure doctor workspace conversation', detail: { patientId, participantType, subject } });
  return NextResponse.json({ data: conversation }, { status: 201 });
}
