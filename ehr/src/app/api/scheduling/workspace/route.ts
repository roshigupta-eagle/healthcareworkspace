import { NextResponse } from 'next/server';
import { resolveDoctorWorkspaceActor, SCHEDULING_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import { getSchedulingSnapshot } from '@/lib/schedulingData';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request, SCHEDULING_WORKSPACE_ROLES);
  if (access.response) return access.response;
  const params = new URL(request.url).searchParams;
  const query = params.get('q') || '';
  return NextResponse.json(await getSchedulingSnapshot(query), { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
