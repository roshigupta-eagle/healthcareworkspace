import { NextResponse } from 'next/server';
import { getSchedulingSnapshot } from '@/lib/schedulingData';
import { resolveDoctorWorkspaceActor, SCHEDULING_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request, SCHEDULING_WORKSPACE_ROLES);
  if (access.response) return access.response;
  try {
    const params = new URL(request.url).searchParams;
    const snapshot = await getSchedulingSnapshot(params.get('q') || '');
    return NextResponse.json(snapshot.appointments);
  } catch {
    return NextResponse.json({ error: 'failed to fetch appointments' }, { status: 500 });
  }
}
