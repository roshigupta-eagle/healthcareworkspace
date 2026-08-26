import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { getNote } from '@/lib/doctorNotesStore';

export async function GET(_req: Request, { params }: { params: { patientId: string; noteId: string } }) {
  const { patientId, noteId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const note = await getNote(patientId, noteId);
  if (!note) return NextResponse.json({ error: 'note not found' }, { status: 404 });

  return NextResponse.json({
    history: note.history,
    addenda: note.addenda,
    correction: note.correction,
    enteredInError: note.enteredInError,
  });
}
