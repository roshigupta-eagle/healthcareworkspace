import { NextResponse } from 'next/server';
import { canAccessTaskPatient, canActorUpdateTask, canCompleteTask, findCanonicalTask } from '@/lib/doctorWorkStore';
import { updateTask } from '@/lib/tasksStore';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

function isOpen(status?: string) {
  return !['completed', 'cancelled', 'entered-in-error', 'failed', 'rejected'].includes((status || '').toLowerCase());
}

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const actor = access.actor!;
  const { taskId } = await params;
  const found = await findCanonicalTask(taskId);
  if (!found) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
  if (!canAccessTaskPatient(found.patient.id, actor)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });
  if (!canActorUpdateTask(found.task, actor)) return NextResponse.json({ error: 'You do not have permission to update this task.' }, { status: 403 });
  let body: { action?: unknown; dueDate?: unknown; assignee?: unknown; expectedUpdatedAt?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid task update.' }, { status: 400 }); }
  const action = typeof body.action === 'string' ? body.action : '';
  if (action === 'reassign' && actor.role !== 'ADMIN' && actor.role !== 'DEV') return NextResponse.json({ error: 'You do not have permission to reassign this task.' }, { status: 403 });
  if (action === 'complete' && !(await canCompleteTask(found.task))) return NextResponse.json({ error: 'Complete the linked source workflow before completing this task.' }, { status: 409 });
  if (!isOpen(found.task.status) && ['start', 'complete', 'defer', 'hold', 'resume'].includes(action)) return NextResponse.json({ error: 'This task is no longer open.' }, { status: 409 });
  let patch: Record<string, unknown> = {};
  if (action === 'start') patch = { status: 'in-progress', startDate: new Date().toISOString() };
  else if (action === 'reset') patch = { status: 'accepted' };
  else if (action === 'complete') patch = { status: 'completed', closedAt: new Date().toISOString() };
  else if (action === 'hold') patch = { status: 'on-hold' };
  else if (action === 'resume') patch = { status: 'in-progress' };
  else if (action === 'defer') {
    const dueDate = typeof body.dueDate === 'string' ? body.dueDate.trim() : '';
    if (!dueDate || Number.isNaN(Date.parse(dueDate))) return NextResponse.json({ error: 'A valid due date is required.' }, { status: 400 });
    patch = { dueDate, status: 'accepted' };
  } else if (action === 'reassign') {
    if (!body.assignee || typeof body.assignee !== 'object') return NextResponse.json({ error: 'A valid assignee is required.' }, { status: 400 });
    const assignee = body.assignee as { id?: unknown; name?: unknown; role?: unknown };
    if (typeof assignee.id !== 'string' || typeof assignee.name !== 'string') return NextResponse.json({ error: 'A valid assignee is required.' }, { status: 400 });
    patch = { assignee: { id: assignee.id, name: assignee.name, ...(typeof assignee.role === 'string' ? { role: assignee.role } : {}) } };
  } else return NextResponse.json({ error: 'Unsupported task action.' }, { status: 400 });
  try {
    const updated = await updateTask(found.patient.id, taskId, patch, actor, typeof body.expectedUpdatedAt === 'string' ? body.expectedUpdatedAt : undefined);
    if (!updated) return NextResponse.json({ error: 'Task could not be updated.' }, { status: 404 });
    await logAuditEvent({ agentId: actor.id, entityType: 'Task', entityId: taskId, action: 'U', outcome: 'success', description: `Doctor workspace task action: ${action}`, detail: { patientId: found.patient.id, action } });
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'TASK_VERSION_CONFLICT') return NextResponse.json({ error: 'This task changed since you opened it. Refresh the task to continue.' }, { status: 409 });
    throw error;
  }
}
