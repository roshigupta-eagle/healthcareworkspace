import { NextResponse } from 'next/server';
import { getDashboardSummary } from '@/lib/dashboardSummary';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const summary = await getDashboardSummary(access.actor!, new Date());
  return NextResponse.json(summary, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
