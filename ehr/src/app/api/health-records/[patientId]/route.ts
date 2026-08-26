import { NextResponse } from 'next/server';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { getHealthRecordQuickView } from '@/lib/healthRecords';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { patientId } = await params;
  const data = getHealthRecordQuickView(patientId);
  if (!data) return NextResponse.json({ error: 'Patient record not found.' }, { status: 404 });
  return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
