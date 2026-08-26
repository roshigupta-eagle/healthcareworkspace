import { NextResponse } from 'next/server';
import { canAccessTaskPatient, canActorUpdateTask, canCompleteTask, findCanonicalTask } from '@/lib/doctorWorkStore';
import { addTaskNote, updateTask } from '@/lib/tasksStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { id } = await params;
  const found = await findCanonicalTask(id);
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canAccessTaskPatient(found.patient.id, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });
  if (!canActorUpdateTask(found.task, access.actor!)) return NextResponse.json({ error: 'You do not have permission to update this task.' }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const requestedAction = typeof body?.action === 'string' ? body.action : '';
  const action = requestedAction === 'toggleComplete' || requestedAction === 'markComplete' ? 'complete' : requestedAction;
  if (action === 'delegate' && access.actor!.role !== 'ADMIN' && access.actor!.role !== 'DEV') return NextResponse.json({ error: 'You do not have permission to reassign this task.' }, { status: 403 });
  if (action === 'addNote') {
    const note = body?.note && typeof body.note === 'object' ? body.note as { body?: unknown } : null;
    const noteBody = typeof note?.body === 'string' ? note.body.trim() : '';
    if (!noteBody) return NextResponse.json({ error: 'A note body is required.' }, { status: 400 });
    const updated = await addTaskNote(found.patient.id, id, noteBody, access.actor);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ task: updated });
  }
  if (['complete', 'toggleComplete', 'markComplete'].includes(action) && !(await canCompleteTask(found.task))) return NextResponse.json({ error: 'Complete the linked source workflow before completing this task.' }, { status: 409 });
  if (['start', 'complete', 'defer', 'hold', 'resume', 'reset'].includes(action) && ['completed', 'cancelled', 'entered-in-error', 'failed', 'rejected'].includes(found.task.status || '')) return NextResponse.json({ error: 'This task is no longer open.' }, { status: 409 });
  let patch: Record<string, unknown>;
  if (action === 'start') patch = { status: 'in-progress', startDate: new Date().toISOString() };
  else if (['complete', 'toggleComplete', 'markComplete'].includes(action)) patch = { status: 'completed', closedAt: new Date().toISOString() };
  else if (action === 'hold') patch = { status: 'on-hold' };
  else if (action === 'resume') patch = { status: 'in-progress' };
  else if (action === 'reset') patch = { status: 'accepted' };
  else if (action === 'defer' && typeof body?.dueDate === 'string' && !Number.isNaN(Date.parse(body.dueDate))) patch = { status: 'accepted', dueDate: body.dueDate };
  else if (action === 'delegate') {
    const target = typeof body?.to === 'string' ? body.to.trim() : '';
    if (!target) return NextResponse.json({ error: 'A delegate is required.' }, { status: 400 });
    patch = { assignee: { id: target, name: target, role: 'DOCTOR' }, status: 'accepted' };
  }
  else return NextResponse.json({ error: 'Unsupported task action.' }, { status: 400 });
  try {
    const task = await updateTask(found.patient.id, id, patch, access.actor, typeof body?.expectedUpdatedAt === 'string' ? body.expectedUpdatedAt : undefined);
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof Error && error.message === 'TASK_VERSION_CONFLICT') return NextResponse.json({ error: 'This task changed since you opened it. Refresh the task to continue.' }, { status: 409 });
    throw error;
  }
}
