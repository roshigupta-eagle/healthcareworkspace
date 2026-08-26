import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { canAccessTaskPatient, canActorUpdateTask, canCompleteTask, findCanonicalTask } from '@/lib/doctorWorkStore';
import { updateTask } from '@/lib/tasksStore';

const CARDIOLOGY_QUEUES = new Set(['PHYSICIAN_CONSULT', 'RESULTS_REVIEW']);

export async function POST(req: Request) {
  const access = await resolveDoctorWorkspaceActor(req);
  if (access.response) return access.response;
  const actor = access.actor!;

  let body: { itemId?: unknown; queueName?: unknown; expectedUpdatedAt?: unknown };
  try {
    body = await req.json() as { itemId?: unknown; queueName?: unknown; expectedUpdatedAt?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : '';
  const queueName = typeof body.queueName === 'string' ? body.queueName.trim() : '';
  if (!itemId || !queueName) return NextResponse.json({ error: 'itemId and queueName are required' }, { status: 400 });

  try {
    if (queueName === 'LOCAL_CLINICAL_WORK' || queueName === 'SHARED_DOCTOR_WORK') {
      const [, patientId, taskId] = itemId.split(':');
      if (!patientId || !taskId) return NextResponse.json({ error: 'Invalid local task id' }, { status: 400 });
      const found = await findCanonicalTask(taskId);
      if (!found || found.patient.id !== patientId) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      if (!canAccessTaskPatient(patientId, actor)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });
      if (!canActorUpdateTask(found.task, actor)) return NextResponse.json({ error: 'You do not have permission to update this task.' }, { status: 403 });
      if (!(await canCompleteTask(found.task))) return NextResponse.json({ error: 'Complete the linked source workflow before completing this task.' }, { status: 409 });
      const updated = await updateTask(patientId, taskId, { status: 'completed', closedAt: new Date().toISOString() }, actor, typeof body.expectedUpdatedAt === 'string' ? body.expectedUpdatedAt : undefined);
      if (!updated) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      await logAuditEvent({ agentId: actor.id, entityType: 'ClinicalTask', entityId: taskId, action: 'U', outcome: 'success', description: `Completed local clinical task ${taskId}` });
      return NextResponse.json({ ok: true });
    }

    if (!CARDIOLOGY_QUEUES.has(queueName)) return NextResponse.json({ error: 'Unknown queue' }, { status: 400 });

    const cardiologyBase = (process.env.CARDIOLOGY_API_URL || 'http://localhost:8081/cardiology').replace(/\/$/, '');
    const token = process.env.CARDIOLOGY_SERVICE_TOKEN;
    const response = await fetch(`${cardiologyBase}/queues/${encodeURIComponent(queueName)}/items/${encodeURIComponent(itemId)}/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      cache: 'no-store',
    });
    if (!response.ok) {
      await logAuditEvent({ agentId: actor.id, entityType: 'CardiologyQueueItem', entityId: itemId, action: 'U', outcome: 'failure', description: `Failed to complete ${queueName} item ${itemId}` });
      return NextResponse.json({ error: 'Cardiology service rejected the completion request.' }, { status: 502 });
    }
    await logAuditEvent({ agentId: actor.id, entityType: 'CardiologyQueueItem', entityId: itemId, action: 'U', outcome: 'success', description: `Completed ${queueName} item ${itemId}` });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to complete work item';
    await logAuditEvent({ agentId: actor.id, entityType: 'DoctorViewWorkItem', entityId: itemId, action: 'U', outcome: 'failure', description: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
