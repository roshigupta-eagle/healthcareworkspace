import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { completeQueueItem } from '@/cardiology/services/api.mock';

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { itemId, notes } = body;
    await completeQueueItem(itemId, notes);
    await logAuditEvent({ agentId: session.user.id!, entityType: 'QueueItem', entityId: itemId, action: 'U', outcome: 'success', description: `Complete queue item ${itemId}` });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await logAuditEvent({ agentId: session?.user?.id ?? 'unknown', entityType: 'QueueItem', entityId: undefined, action: 'U', outcome: 'failure', description: `Complete failed: ${String(err)}` });
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
