import { NextResponse } from 'next/server';
import { getTask, updateTask } from '@/lib/tasksStore';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { canAccessTaskPatient, canActorUpdateTask, canCompleteTask, findCanonicalTask } from '@/lib/doctorWorkStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

function isOpen(status?: string) {
  return !['completed', 'cancelled', 'entered-in-error', 'failed', 'rejected'].includes((status || '').toLowerCase());
}

export async function GET(req: Request, { params }: { params: Promise<{ patientId: string; taskId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(req);
  if (access.response) return access.response;
  const { patientId, taskId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });
  const t = await getTask(patientId, taskId);
  if (!t) return NextResponse.json({ error: 'task not found' }, { status: 404 });
  return NextResponse.json({ data: t }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ patientId: string; taskId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(req);
  if (access.response) return access.response;
  const { patientId, taskId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 });

  const found = await findCanonicalTask(taskId);
  if (!found || found.patient.id !== patientId) return NextResponse.json({ error: 'task not found' }, { status: 404 });
  if (!canActorUpdateTask(found.task, access.actor!)) return NextResponse.json({ error: 'You do not have permission to update this task.' }, { status: 403 });

  // Simple action handling: patch fields directly or apply workflow transitions
  const action = typeof body.action === 'string' ? body.action : '';
  if (['assign', 'reassign'].includes(action) && access.actor!.role !== 'ADMIN' && access.actor!.role !== 'DEV') return NextResponse.json({ error: 'You do not have permission to reassign this task.' }, { status: 403 });
  if (!isOpen(found.task.status) && ['start', 'complete', 'defer', 'hold', 'resume', 'reset'].includes(action)) return NextResponse.json({ error: 'This task is no longer open.' }, { status: 409 });
  if (action === 'complete' && !(await canCompleteTask(found.task))) return NextResponse.json({ error: 'Complete the linked source workflow before completing this task.' }, { status: 409 });
  const patch: Record<string, unknown> = {};
  if (action === 'assign') {
    if (!body.assignee || typeof body.assignee !== 'object') return NextResponse.json({ error: 'A valid assignee is required.' }, { status: 400 });
    patch.assignee = body.assignee || null;
  } else if (action === 'start') {
    patch.status = 'in-progress';
    patch.startDate = typeof body.startDate === 'string' ? body.startDate : new Date().toISOString();
  } else if (action === 'complete') {
    patch.status = 'completed';
    patch.closedAt = typeof body.closedAt === 'string' ? body.closedAt : new Date().toISOString();
  } else if (action === 'defer') {
    if (typeof body.dueDate !== 'string' || Number.isNaN(Date.parse(body.dueDate))) return NextResponse.json({ error: 'A valid due date is required.' }, { status: 400 });
    patch.dueDate = body.dueDate;
    patch.status = 'accepted';
  } else if (action === 'hold') {
    patch.status = 'on-hold';
  } else if (action === 'resume') {
    patch.status = 'in-progress';
  } else if (action === 'reset') {
    patch.status = 'accepted';
  } else if (action === 'reassign') {
    if (!body.assignee || typeof body.assignee !== 'object') return NextResponse.json({ error: 'A valid assignee is required.' }, { status: 400 });
    patch.assignee = body.assignee || null;
  } else if (action === 'cancel') {
    patch.status = 'cancelled';
  } else return NextResponse.json({ error: 'Unsupported task action.' }, { status: 400 });

  try {
    const updated = await updateTask(patientId, taskId, patch, access.actor, typeof body.expectedUpdatedAt === 'string' ? body.expectedUpdatedAt : undefined);
    if (!updated) return NextResponse.json({ error: 'task not found' }, { status: 404 });
    return NextResponse.json({ data: updated }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'TASK_VERSION_CONFLICT') return NextResponse.json({ error: 'This task changed since you opened it. Refresh the task to continue.' }, { status: 409 });
    throw error;
  }
}
