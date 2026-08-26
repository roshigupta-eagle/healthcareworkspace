import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { canAccessTaskPatient, canActorUpdateTask, findCanonicalTask, validateTaskSources } from '@/lib/doctorWorkStore';
import { createTask, listAllTasks } from '@/lib/tasksStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import type { ClinicalTask } from '@/types/clinicalTask';

function legacyStatus(task: ClinicalTask) {
  if (task.status === 'completed') return 'completed' as const;
  if (task.status === 'in-progress') return 'in_progress' as const;
  if (task.status === 'on-hold') return 'delegated' as const;
  if (task.dueDate && Date.parse(task.dueDate) < Date.now()) return 'overdue' as const;
  return 'todo' as const;
}

function legacyPriority(priority?: ClinicalTask['priority']) {
  if (priority === 'urgent') return 'critical' as const;
  if (priority === 'high') return 'high' as const;
  if (priority === 'routine') return 'low' as const;
  return 'medium' as const;
}

function legacyTask(task: ClinicalTask, actorId: string) {
  const patient = getPatientById(task.patientId);
  if (!patient) return null;
  const [givenName, ...familyNameParts] = patient.name.split(' ');
  const relatedLabResultId = task.relatedResources?.find((resource) => resource.type === 'Observation')?.id || null;
  return {
    id: task.id,
    title: task.title,
    patientId: task.patientId,
    patient: { id: patient.id, givenName, familyName: familyNameParts.join(' '), mrn: patient.mrn, dob: patient.dob, gender: patient.gender },
    assignedTo: task.assignee?.id || null,
    assignedToUser: task.assignee ? { id: task.assignee.id, name: task.assignee.name, role: (task.assignee.role || 'DOCTOR').toUpperCase() } : null,
    status: legacyStatus(task),
    priority: legacyPriority(task.priority),
    category: task.category,
    dueAt: task.dueDate || null,
    createdAt: task.createdAt,
    createdBy: task.requester?.id || actorId,
    relatedLabResultId,
    updatedAt: task.updatedAt,
    completedAt: task.closedAt || undefined,
    activity: (task.history || []).map((entry) => ({ id: entry.id, type: 'system' as const, detail: `${entry.action} by ${entry.userName || entry.userId || 'system'}`, actorId: entry.userId, createdAt: entry.timestamp })),
  };
}

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const patientId = new URL(request.url).searchParams.get('patientId');
  if (patientId && !canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });
  const all = await listAllTasks();
  const tasks = Object.values(all).flat().filter((task) => (!patientId || task.patientId === patientId) && canAccessTaskPatient(task.patientId, access.actor!) && canActorUpdateTask(task, access.actor!)).map((task) => legacyTask(task, access.actor!.id)).filter((task): task is NonNullable<ReturnType<typeof legacyTask>> => Boolean(task));
  return NextResponse.json({ tasks }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
export async function POST(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const patientId = typeof body?.patientId === 'string' ? body.patientId.trim() : '';
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!patientId || !title) return NextResponse.json({ error: 'Missing title or patientId' }, { status: 400 });
  if (!getPatientById(patientId)) return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });
  const relatedResources = Array.isArray(body?.relatedResources) ? body.relatedResources as { type: string; id: string; display?: string }[] : [];
  if (!(await validateTaskSources(patientId, relatedResources))) return NextResponse.json({ error: 'The selected source record is invalid or does not belong to this patient.' }, { status: 400 });
  const idempotencyKey = request.headers.get('idempotency-key')?.trim();
  const stableId = idempotencyKey ? `doctor-${createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 24)}` : undefined;
  if (stableId) {
    const existing = await findCanonicalTask(stableId, patientId);
    if (existing) return NextResponse.json({ task: existing.task, idempotent: true });
  }
  const assignedTo = typeof body?.assignedTo === 'string' ? body.assignedTo.trim() : '';
  if (assignedTo && assignedTo !== access.actor!.id && access.actor!.role !== 'ADMIN' && access.actor!.role !== 'DEV') return NextResponse.json({ error: 'You do not have permission to assign work to another clinician.' }, { status: 403 });
  const assignee = assignedTo ? { id: assignedTo, name: assignedTo, role: 'DOCTOR' } : access.actor;
  const task = await createTask(patientId, { id: stableId, title, description: typeof body?.description === 'string' ? body.description.trim() : '', category: typeof body?.category === 'string' ? body.category.trim() : 'Clinical Task', priority: typeof body?.priority === 'string' ? body.priority as 'routine' | 'normal' | 'high' | 'urgent' : 'normal', dueDate: typeof body?.dueAt === 'string' ? body.dueAt : null, assignee, relatedResources }, access.actor);
  return NextResponse.json({ task: legacyTask(task, access.actor!.id) }, { status: 201 });
}
