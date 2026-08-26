import { NextResponse } from 'next/server';
import { getTask, mapToFhirTask } from '@/lib/tasksStore';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { canAccessTaskPatient } from '@/lib/doctorWorkStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function GET(req: Request, { params }: { params: Promise<{ patientId: string; taskId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(req);
  if (access.response) return access.response;
  const { patientId, taskId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient work context.' }, { status: 403 });

  const t = await getTask(patientId, taskId);
  if (!t) return NextResponse.json({ error: 'task not found' }, { status: 404 });
  const f = mapToFhirTask(t);
  return NextResponse.json(f, { headers: { 'Cache-Control': 'private, no-store, max-age=0', 'Content-Type': 'application/fhir+json; charset=utf-8' } });
}
