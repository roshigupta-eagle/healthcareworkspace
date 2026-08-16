import { NextResponse } from 'next/server';
import { getTask, mapToFhirTask } from '@/lib/tasksStore';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { auth } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { patientId: string; taskId: string } }) {
  const { patientId, taskId } = params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  try { await auth(); } catch (e) { /* dev */ }

  const t = await getTask(patientId, taskId);
  if (!t) return NextResponse.json({ error: 'task not found' }, { status: 404 });
  const f = mapToFhirTask(t as any);
  return NextResponse.json({ data: f });
}
