import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { toggleConversationPin } from '@/lib/messageStore';

export async function POST(request: Request, { params }: { params: Promise<{ communicationId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { communicationId } = await params;
  const conversation = await toggleConversationPin(communicationId, access.actor!.id);
  if (!conversation) return NextResponse.json({ error: 'Communication not found or access denied.' }, { status: 404 });
  await logAuditEvent({ agentId: access.actor!.id, entityType: 'Communication', entityId: communicationId, action: 'U', outcome: 'success', description: conversation.pinnedBy?.includes(access.actor!.id) ? 'Pinned communication' : 'Unpinned communication' });
  return NextResponse.json({ data: conversation, pinned: conversation.pinnedBy?.includes(access.actor!.id) || false });
}
