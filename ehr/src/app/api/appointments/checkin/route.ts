import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { appointmentId } = body;
    // In this demo, we don't have a persistent appointment store to mutate.
    // Record an audit event and return success so the client can optimistically update.
    await logAuditEvent({ agentId: session.user.id!, entityType: 'Appointment', entityId: appointmentId, action: 'U', outcome: 'success', description: `Check-in appointment ${appointmentId}` });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await logAuditEvent({ agentId: session?.user?.id ?? 'unknown', entityType: 'Appointment', entityId: undefined, action: 'U', outcome: 'failure', description: `Check-in failed: ${String(err)}` });
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
