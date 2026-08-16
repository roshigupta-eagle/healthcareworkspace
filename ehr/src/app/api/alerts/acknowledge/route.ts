import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { id } = body;
    await logAuditEvent({ agentId: session.user.id!, entityType: 'Alert', entityId: id, action: 'U', outcome: 'success', description: `Acknowledge alert ${id}` });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await logAuditEvent({ agentId: session?.user?.id ?? 'unknown', entityType: 'Alert', entityId: undefined, action: 'U', outcome: 'failure', description: `Acknowledge failed: ${String(err)}` });
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
