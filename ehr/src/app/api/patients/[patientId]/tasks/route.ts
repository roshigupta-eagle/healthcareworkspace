import { NextResponse } from 'next/server';
import { listTasks, createTask } from '@/lib/tasksStore';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { canAccessTaskPatient, validateTaskSources } from '@/lib/doctorWorkStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function GET(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(req);
  if (access.response) return access.response;
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });

  const tasks = await listTasks(patientId);
  return NextResponse.json({ data: tasks }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function POST(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(req);
  if (access.response) return access.response;
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const relatedResources = Array.isArray(body?.relatedResources) ? body.relatedResources as { type: string; id: string; display?: string }[] : [];
  if (relatedResources.length && !(await validateTaskSources(patientId, relatedResources))) return NextResponse.json({ error: 'The selected source record is invalid or does not belong to this patient.' }, { status: 400 });
  const requestedAssignee = body?.assignee && typeof body.assignee === 'object' ? body.assignee as { id?: unknown; name?: unknown; role?: unknown } : null;
  if (requestedAssignee?.id && requestedAssignee.id !== access.actor!.id && access.actor!.role !== 'ADMIN' && access.actor!.role !== 'DEV') return NextResponse.json({ error: 'You do not have permission to assign work to another clinician.' }, { status: 403 });
  const assignee = requestedAssignee && typeof requestedAssignee.id === 'string' && typeof requestedAssignee.name === 'string' ? { id: requestedAssignee.id, name: requestedAssignee.name, ...(typeof requestedAssignee.role === 'string' ? { role: requestedAssignee.role } : {}) } : null;
  const task = await createTask(patientId, {
    title,
    description: typeof body?.description === 'string' ? body.description : undefined,
    category: typeof body?.category === 'string' ? body.category : undefined,
    priority: typeof body?.priority === 'string' ? body.priority as 'routine' | 'normal' | 'high' | 'urgent' : undefined,
    dueDate: typeof body?.dueDate === 'string' ? body.dueDate : undefined,
    startDate: typeof body?.startDate === 'string' ? body.startDate : undefined,
    assignee,
    assignedTeam: typeof body?.assignedTeam === 'string' ? body.assignedTeam : null,
    relatedResources,
  }, access.actor);

  return NextResponse.json({ data: task }, { status: 201, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
