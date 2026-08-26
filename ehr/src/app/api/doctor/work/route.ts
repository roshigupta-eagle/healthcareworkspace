import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { createTask } from '@/lib/tasksStore';
import { canAccessTaskPatient, findCanonicalTask, getDoctorWorkSnapshot, validateTaskSources } from '@/lib/doctorWorkStore';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import type { ClinicalTaskPriority } from '@/types/clinicalTask';

const PRIORITIES = new Set<ClinicalTaskPriority>(['routine', 'normal', 'high', 'urgent']);

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const actor = access.actor!;
  return NextResponse.json(await getDoctorWorkSnapshot(actor.id, actor.name, actor.role), { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function POST(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const actor = access.actor!;
  let body: { patientId?: unknown; title?: unknown; category?: unknown; description?: unknown; dueDate?: unknown; priority?: unknown; assignee?: unknown; assigneeMode?: unknown; relatedResources?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid task request.' }, { status: 400 }); }
  const patientId = typeof body.patientId === 'string' ? body.patientId.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!patientId || !title) return NextResponse.json({ error: 'Patient and task title are required.' }, { status: 400 });
  if (!canAccessTaskPatient(patientId, actor)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });
  if (!getPatientById(patientId)) return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
  const priority = typeof body.priority === 'string' && PRIORITIES.has(body.priority as ClinicalTaskPriority) ? body.priority as ClinicalTaskPriority : 'normal';
  const dueDate = typeof body.dueDate === 'string' && body.dueDate.trim() ? body.dueDate.trim() : null;
  if (dueDate && Number.isNaN(Date.parse(dueDate))) return NextResponse.json({ error: 'Due date is invalid.' }, { status: 400 });
  const idempotencyKey = request.headers.get('idempotency-key')?.trim();
  const stableId = idempotencyKey ? `doctor-${createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 24)}` : undefined;
  if (stableId) {
    const existing = await findCanonicalTask(stableId, patientId);
    if (existing) return NextResponse.json({ data: existing.task, idempotent: true });
  }
  const assignee = body.assignee && typeof body.assignee === 'object' ? body.assignee as { id?: unknown; name?: unknown; role?: unknown } : null;
  if (assignee?.id && assignee.id !== actor.id && actor.role !== 'ADMIN' && actor.role !== 'DEV') return NextResponse.json({ error: 'You do not have permission to assign work to another clinician.' }, { status: 403 });
  const selectedAssignee = typeof assignee?.id === 'string' && typeof assignee?.name === 'string' ? { id: assignee.id, name: assignee.name, ...(typeof assignee.role === 'string' ? { role: assignee.role } : {}) } : body.assigneeMode === 'unassigned' ? null : { id: actor.id, name: actor.name, role: actor.role };
  const relatedResources = Array.isArray(body.relatedResources) ? body.relatedResources.filter((resource): resource is { type: string; id: string; display?: string } => Boolean(resource && typeof resource === 'object' && typeof (resource as { type?: unknown }).type === 'string' && typeof (resource as { id?: unknown }).id === 'string')) : [];
  if (relatedResources.length && !(await validateTaskSources(patientId, relatedResources))) return NextResponse.json({ error: 'The selected source record is invalid or does not belong to this patient.' }, { status: 400 });
  const task = await createTask(patientId, { id: stableId, title, description: typeof body.description === 'string' ? body.description.trim() : '', category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'Follow-up', priority, dueDate, assignee: selectedAssignee, relatedResources }, actor);
  await logAuditEvent({ agentId: actor.id, entityType: 'Task', entityId: task.id, action: 'C', outcome: 'success', description: 'Created doctor workspace task', detail: { patientId, category: task.category, priority: task.priority } });
  return NextResponse.json({ data: task }, { status: 201 });
}
