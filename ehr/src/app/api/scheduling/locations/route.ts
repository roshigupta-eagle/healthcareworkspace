import { NextResponse } from 'next/server';
import { getSchedulingSnapshot, isPreviewSchedulingParams } from '@/lib/schedulingData';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json((await getSchedulingSnapshot('', { preview: isPreviewSchedulingParams(params) })).locations);
  } catch {
    return NextResponse.json({ error: 'failed to fetch locations' }, { status: 500 });
  }
}
