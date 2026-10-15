import { NextResponse } from 'next/server';
import { getSchedulingSnapshot, isPreviewSchedulingParams } from '@/lib/schedulingData';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  try {
    const params = new URL(request.url).searchParams;
    const snapshot = await getSchedulingSnapshot(params.get('q') || '', { preview: isPreviewSchedulingParams(params) });
    return NextResponse.json(snapshot.appointments);
  } catch {
    return NextResponse.json({ error: 'failed to fetch appointments' }, { status: 500 });
  }
}
