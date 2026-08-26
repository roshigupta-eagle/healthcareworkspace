import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { signNote } from '@/lib/doctorNotesStore';
import { resolveActor } from '@/lib/noteActor';

export async function POST(_req: Request, { params }: { params: { patientId: string; noteId: string } }) {
  const { patientId, noteId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const actor = await resolveActor();
  const result = await signNote(patientId, noteId, actor);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
