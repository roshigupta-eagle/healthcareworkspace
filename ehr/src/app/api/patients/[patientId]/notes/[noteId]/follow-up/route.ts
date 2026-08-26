import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { getNote, attachFollowUpTask } from '@/lib/doctorNotesStore';
import { createTask, deleteTask, getTask } from '@/lib/tasksStore';
import { canAccessTaskPatient } from '@/lib/doctorWorkStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function POST(request: Request, { params }: { params: { patientId: string; noteId: string } }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { patientId, noteId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });

  const note = await getNote(patientId, noteId);
  if (!note) return NextResponse.json({ error: 'note not found' }, { status: 404 });
  if (note.followUpTaskId) {
    const existingTask = await getTask(patientId, note.followUpTaskId);
    if (existingTask) return NextResponse.json({ task: existingTask, note }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : 'Follow-up from clinical note';
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
      relatedResources: [{ type: 'DoctorNote', id: noteId, display: note.type }],
    },
    actor,
  );

  const updatedNote = await attachFollowUpTask(patientId, noteId, task.id, actor);
  if (!updatedNote) {
    await deleteTask(patientId, task.id, actor);
    return NextResponse.json({ error: 'The follow-up task could not be linked to the note.' }, { status: 409 });
  }
  if (updatedNote.followUpTaskId !== task.id) {
    await deleteTask(patientId, task.id, actor);
    const existingTask = await getTask(patientId, updatedNote.followUpTaskId || '');
    return existingTask ? NextResponse.json({ task: existingTask, note: updatedNote }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }) : NextResponse.json({ error: 'The note already has a different follow-up task.' }, { status: 409 });
  }

  return NextResponse.json({ task, note: updatedNote }, { status: 201, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
