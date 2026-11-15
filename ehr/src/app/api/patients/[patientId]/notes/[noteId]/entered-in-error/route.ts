import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { markEnteredInError } from '@/lib/doctorNotesStore';
import { resolveActor } from '@/lib/noteActor';

export async function POST(request: Request, { params }: { params: { patientId: string; noteId: string } }) {
  const { patientId, noteId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const body = await request.json().catch(() => ({} as any));
  const reason = typeof body?.reason === 'string' ? body.reason : '';

  const actor = await resolveActor();
  if (!actor) return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  const result = await markEnteredInError(patientId, noteId, reason, actor);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
