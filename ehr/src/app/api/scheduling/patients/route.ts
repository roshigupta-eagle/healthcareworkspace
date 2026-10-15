import { NextResponse } from 'next/server';
import { getSchedulingSnapshot, isPreviewSchedulingParams } from '@/lib/schedulingData';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { getCanonicalPatientDirectory } from '@/lib/patientDirectory';

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const params = new URL(request.url).searchParams;
  const query = (params.get('query') || '').trim().toLowerCase();
  const patientId = params.get('patientId') || '';
  const limit = Math.min(Math.max(Number(params.get('limit') || 8) || 8, 1), 25);
  if (query.length < 2 && !patientId) return NextResponse.json({ data: [] });
  const preview = process.env.NODE_ENV !== 'production' && (['1', 'true'].includes(params.get('noauth') || '') || ['dev', 'dev-doctor'].includes(params.get('asUser') || ''));
  if (preview) {
    const directory = await getCanonicalPatientDirectory({ preview: true });
    const data = directory.patients.filter((patient) => patient.id === patientId || [patient.name, patient.mrn, patient.birthDate].join(' ').toLowerCase().includes(query)).slice(0, limit);
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  }
  const snapshot = await getSchedulingSnapshot('', { preview: isPreviewSchedulingParams(params) });
  const data = snapshot.patients.filter((patient) => patient.id === patientId || [patient.name, patient.mrn, patient.birthDate].filter(Boolean).join(' ').toLowerCase().includes(query)).slice(0, limit);
  return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
