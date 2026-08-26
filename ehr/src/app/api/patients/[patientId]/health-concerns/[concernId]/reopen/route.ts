import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { reopenConcern } from '@/lib/healthConcernsStore';
import { resolveActor } from '@/lib/noteActor';

export async function POST(_req: Request, { params }: { params: { patientId: string; concernId: string } }) {
  const { patientId, concernId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const actor = await resolveActor();
  const result = await reopenConcern(patientId, concernId, actor);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
