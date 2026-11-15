import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { duplicateAsDraft } from '@/lib/doctorNotesStore';
import { resolveActor } from '@/lib/noteActor';

export async function POST(_req: Request, { params }: { params: { patientId: string; noteId: string } }) {
  const { patientId, noteId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const actor = await resolveActor();
  if (!actor) return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  const result = await duplicateAsDraft(patientId, noteId, actor);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}
