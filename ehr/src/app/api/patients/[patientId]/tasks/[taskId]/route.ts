import { NextResponse } from 'next/server';
import { getTask, updateTask } from '@/lib/tasksStore';
import { auth } from '@/lib/auth';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

export async function GET(req: Request, { params }: { params: { patientId: string; taskId: string } }) {
  const { patientId, taskId } = params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  try { await auth(); } catch (e) { /* dev */ }

  const t = await getTask(patientId, taskId);
  if (!t) return NextResponse.json({ error: 'task not found' }, { status: 404 });
  return NextResponse.json({ data: t });
}

export async function PATCH(req: Request, { params }: { params: { patientId: string; taskId: string } }) {
  const { patientId, taskId } = params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  let user: any = null;
  try { user = await auth(); } catch (e) { /* dev */ }

  const body = await req.json();
  if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 });

  // Simple action handling: patch fields directly or apply workflow transitions
  const action = body.action;
  const patch: any = {};
  if (action === 'assign') {
    patch.assignee = body.assignee || null;
  } else if (action === 'start') {
    patch.status = 'in-progress';
    patch.startDate = body.startDate || new Date().toISOString();
  } else if (action === 'complete') {
    patch.status = 'completed';
    patch.closedAt = body.closedAt || new Date().toISOString();
  } else if (action === 'defer') {
    patch.dueDate = body.dueDate;
    patch.status = 'accepted';
  } else if (action === 'hold') {
    patch.status = 'on-hold';
  } else if (action === 'resume') {
    patch.status = body.status || 'in-progress';
  } else if (action === 'reassign') {
    patch.assignee = body.assignee || null;
  } else if (action === 'cancel') {
    patch.status = 'cancelled';
  } else {
    // allow direct field patches
    Object.assign(patch, body);
  }

  const updated = await updateTask(patientId, taskId, patch, user?.user || null);
  if (!updated) return NextResponse.json({ error: 'task not found' }, { status: 404 });
  return NextResponse.json({ data: updated });
}
