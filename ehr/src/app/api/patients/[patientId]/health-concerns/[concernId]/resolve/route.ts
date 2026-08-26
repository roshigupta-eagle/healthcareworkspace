import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { resolveConcern } from '@/lib/healthConcernsStore';
import { resolveActor } from '@/lib/noteActor';

export async function POST(request: Request, { params }: { params: { patientId: string; concernId: string } }) {
  const { patientId, concernId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const body = await request.json().catch(() => ({} as any));
  const reason = typeof body?.reason === 'string' ? body.reason : undefined;
  const note = typeof body?.note === 'string' ? body.note : undefined;

  const actor = await resolveActor();
  const result = await resolveConcern(patientId, concernId, reason, note, actor);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
