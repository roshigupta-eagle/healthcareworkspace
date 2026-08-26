import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { getNote, updateDraft } from '@/lib/doctorNotesStore';
import { resolveActor } from '@/lib/noteActor';
import type { DoctorNoteSection, DoctorNoteType } from '@/types/doctorNote';

export async function GET(_req: Request, { params }: { params: { patientId: string; noteId: string } }) {
  const { patientId, noteId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const note = await getNote(patientId, noteId);
  if (!note) return NextResponse.json({ error: 'note not found' }, { status: 404 });
  return NextResponse.json(note);
}

export async function PATCH(request: Request, { params }: { params: { patientId: string; noteId: string } }) {
  const { patientId, noteId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const body = await request.json().catch(() => ({} as any));
  const expectedVersion = Number(body?.version);
  if (!Number.isFinite(expectedVersion)) {
    return NextResponse.json({ error: 'version is required for optimistic concurrency' }, { status: 400 });
  }

  const sections: DoctorNoteSection[] | undefined = Array.isArray(body?.sections)
    ? body.sections.map((s: any) => ({ heading: String(s?.heading || ''), body: String(s?.body || '') }))
    : undefined;
  const type: DoctorNoteType | undefined = body?.type;

  const actor = await resolveActor();
  const result = await updateDraft(patientId, noteId, { sections, type }, expectedVersion, actor);

  if (!result.ok) {
    if (result.conflict) {
      return NextResponse.json({ error: 'conflict', message: 'This note was updated while you were editing.', latest: result.latest }, { status: 409 });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.note);
}
