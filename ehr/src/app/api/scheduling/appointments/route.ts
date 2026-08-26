import { NextResponse } from 'next/server';
import { getSchedulingSnapshot } from '@/lib/schedulingData';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  try {
    const snapshot = await getSchedulingSnapshot(new URL(request.url).searchParams.get('q') || '');
    return NextResponse.json(snapshot.appointments);
  } catch {
    return NextResponse.json({ error: 'failed to fetch appointments' }, { status: 500 });
  }
}
