import { NextResponse } from 'next/server';
import { getSchedulingSnapshot } from '@/lib/schedulingData';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const params = new URL(request.url).searchParams;
  const query = (params.get('query') || '').trim().toLowerCase();
  const patientId = params.get('patientId') || '';
  const limit = Math.min(Math.max(Number(params.get('limit') || 8) || 8, 1), 25);
  if (query.length < 2 && !patientId) return NextResponse.json({ data: [] });
  const snapshot = await getSchedulingSnapshot();
  const data = snapshot.patients.filter((patient) => patient.id === patientId || [patient.name, patient.mrn, patient.birthDate].filter(Boolean).join(' ').toLowerCase().includes(query)).slice(0, limit);
  return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
