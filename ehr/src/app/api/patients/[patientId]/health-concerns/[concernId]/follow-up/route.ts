import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { getConcern, attachFollowUpTask } from '@/lib/healthConcernsStore';
import { createTask, deleteTask, getTask } from '@/lib/tasksStore';
import { canAccessTaskPatient } from '@/lib/doctorWorkStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function POST(request: Request, { params }: { params: { patientId: string; concernId: string } }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { patientId, concernId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });

  const concern = await getConcern(patientId, concernId);
  if (!concern) return NextResponse.json({ error: 'concern not found' }, { status: 404 });
  if (concern.followUpTaskId) {
    const existingTask = await getTask(patientId, concern.followUpTaskId);
    if (existingTask) return NextResponse.json({ task: existingTask, concern }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : `Follow up: ${concern.term}`;
  const assigneeName = typeof body?.assignee === 'string' ? body.assignee.trim() : undefined;
  const dueDate = typeof body?.dueDate === 'string' ? body.dueDate : undefined;
  const priority = ['routine', 'normal', 'high', 'urgent'].includes(body?.priority) ? body.priority : 'normal';
  const instructions = typeof body?.instructions === 'string' ? body.instructions : '';

  const actor = access.actor!;
  if (assigneeName && assigneeName.toLowerCase() !== actor.name.toLowerCase() && actor.role !== 'ADMIN' && actor.role !== 'DEV') return NextResponse.json({ error: 'You do not have permission to assign work to another clinician.' }, { status: 403 });
  const task = await createTask(
    patientId,
    {
      title,
      description: instructions,
      category: 'Follow-up',
      priority,
      status: 'requested',
      dueDate,
      assignee: assigneeName ? { id: `assignee-${assigneeName.toLowerCase().replace(/\s+/g, '-')}`, name: assigneeName } : null,
      relatedResources: [{ type: 'HealthConcern', id: concernId, display: concern.term }],
    },
    actor,
  );

  const updatedConcern = await attachFollowUpTask(patientId, concernId, task.id, actor);
  if (!updatedConcern) {
    await deleteTask(patientId, task.id, actor);
    return NextResponse.json({ error: 'The follow-up task could not be linked to the concern.' }, { status: 409 });
  }
  if (updatedConcern.followUpTaskId !== task.id) {
    await deleteTask(patientId, task.id, actor);
    const existingTask = await getTask(patientId, updatedConcern.followUpTaskId || '');
    return existingTask ? NextResponse.json({ task: existingTask, concern: updatedConcern }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }) : NextResponse.json({ error: 'The concern already has a different follow-up task.' }, { status: 409 });
  }

  return NextResponse.json({ task, concern: updatedConcern }, { status: 201, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
