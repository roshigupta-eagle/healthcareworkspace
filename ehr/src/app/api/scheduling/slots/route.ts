import { NextResponse } from 'next/server';
import { getSchedulingSnapshot } from '@/lib/schedulingData';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  try {
    const snapshot = await getSchedulingSnapshot();
    return NextResponse.json(snapshot.slots);
  } catch {
    return NextResponse.json({ error: 'failed to fetch slots' }, { status: 500 });
  }
}
