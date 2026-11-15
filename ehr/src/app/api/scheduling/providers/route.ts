import { NextResponse } from 'next/server';
import { getSchedulingSnapshot } from '@/lib/schedulingData';
import { resolveDoctorWorkspaceActor, SCHEDULING_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request, SCHEDULING_WORKSPACE_ROLES);
  if (access.response) return access.response;
  try {
    return NextResponse.json((await getSchedulingSnapshot('')).providers);
  } catch {
    return NextResponse.json({ error: 'failed to fetch providers' }, { status: 500 });
  }
}
