import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { canAccessTaskPatient } from '@/lib/doctorWorkStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function GET(req: Request, { params }: { params: { patientId: string } }) {
  const access = await resolveDoctorWorkspaceActor(req);
  if (access.response) return access.response;
  const { patientId } = params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(String(patientId), access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient.' }, { status: 403 });

  return NextResponse.json(patient, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
