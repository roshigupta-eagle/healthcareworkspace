import { NextResponse } from 'next/server';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { getSchedulingSnapshot } from '@/lib/schedulingData';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const query = new URL(request.url).searchParams.get('q') || '';
  return NextResponse.json(await getSchedulingSnapshot(query), { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
