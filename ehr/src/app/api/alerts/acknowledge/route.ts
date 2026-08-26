import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { acknowledgeDoctorAlert } from '@/lib/doctorAlertStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function POST(req: Request) {
  const access = await resolveDoctorWorkspaceActor(req);
  if (access.response) return access.response;
  const actor = access.actor!;

  try {
    const body = await req.json() as { id?: unknown; sourceSystem?: unknown; correlationId?: unknown };
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const sourceSystem = typeof body.sourceSystem === 'string' && body.sourceSystem.trim() ? body.sourceSystem.trim() : 'Doctor View';
    if (!id) return NextResponse.json({ error: 'alert id is required' }, { status: 400 });
    const acknowledgement = await acknowledgeDoctorAlert({ alertId: id, sourceSystem, actorId: actor.id, actorName: actor.name, correlationId: typeof body.correlationId === 'string' ? body.correlationId : undefined });
    await logAuditEvent({ agentId: actor.id, entityType: 'Alert', entityId: id, action: 'U', outcome: 'success', description: `Acknowledge alert ${id}` });
    return NextResponse.json({ ok: true, acknowledgement });
  } catch (err: unknown) {
    await logAuditEvent({ agentId: actor.id, entityType: 'Alert', entityId: undefined, action: 'U', outcome: 'failure', description: `Acknowledge failed: ${String(err)}` });
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
