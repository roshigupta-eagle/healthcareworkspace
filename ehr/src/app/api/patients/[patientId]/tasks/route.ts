import { NextResponse } from 'next/server';
import { listTasks, createTask } from '@/lib/tasksStore';
import { auth } from '@/lib/auth';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

export async function GET(req: Request, { params }: { params: { patientId: string } }) {
  const { patientId } = params;
  // Validate patient
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  // Auth (allow dev preview)
  try { await auth(); } catch (e) { /* allow dev preview */ }

  const tasks = await listTasks(patientId);
  return NextResponse.json({ data: tasks });
}

export async function POST(req: Request, { params }: { params: { patientId: string } }) {
  const { patientId } = params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  let user: any = null;
  try { user = await auth(); } catch (e) { /* dev */ }

  const body = await req.json();
  if (!body?.title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const task = await createTask(patientId, {
    title: body.title,
    description: body.description,
    category: body.category,
    priority: body.priority,
    dueDate: body.dueDate,
    startDate: body.startDate,
    assignee: body.assignee || null,
    assignedTeam: body.assignedTeam || null,
    relatedResources: body.relatedResources || [],
  }, user?.user || null);

  return NextResponse.json({ data: task }, { status: 201 });
}
