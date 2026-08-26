import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { setPinned } from '@/lib/healthConcernsStore';
import { resolveActor } from '@/lib/noteActor';

export async function POST(request: Request, { params }: { params: { patientId: string; concernId: string } }) {
  const { patientId, concernId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const body = await request.json().catch(() => ({} as any));
  const pinned = !!body?.pinned;

  const actor = await resolveActor();
  const updated = await setPinned(patientId, concernId, pinned, actor);
  if (!updated) return NextResponse.json({ error: 'concern not found' }, { status: 404 });
  return NextResponse.json(updated);
}
