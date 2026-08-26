import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { getTask, updateTask } from '@/lib/tasksStore';
import { canAccessTaskPatient, canActorUpdateTask, canCompleteTask } from '@/lib/doctorWorkStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function GET(_req: Request, { params }: { params: Promise<{ patientId: string; taskId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(_req);
  if (access.response) return access.response;
  const { patientId, taskId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });

  const task = await getTask(patientId, taskId);
  if (!task) return NextResponse.json({ error: 'task not found' }, { status: 404 });
  return NextResponse.json(task, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ patientId: string; taskId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { patientId, taskId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const task = await getTask(patientId, taskId);
  if (!task) return NextResponse.json({ error: 'task not found' }, { status: 404 });
  if (!canActorUpdateTask(task, access.actor!)) return NextResponse.json({ error: 'You do not have permission to update this task.' }, { status: 403 });
  const status = body.status === 'completed' ? 'completed' : typeof body.status === 'string' ? body.status : '';
  if (!status || !['requested', 'accepted', 'in-progress', 'on-hold', 'completed', 'cancelled'].includes(status)) return NextResponse.json({ error: 'A valid task status is required.' }, { status: 400 });
  if (status === 'completed' && !(await canCompleteTask(task))) return NextResponse.json({ error: 'Complete the linked source workflow before completing this task.' }, { status: 409 });

  const updated = await updateTask(patientId, taskId, { status: status as 'requested' | 'accepted' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled', closedAt: status === 'completed' ? new Date().toISOString() : null }, access.actor, typeof body.expectedUpdatedAt === 'string' ? body.expectedUpdatedAt : undefined);
  if (!updated) return NextResponse.json({ error: 'task not found' }, { status: 404 });
  return NextResponse.json(updated, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
