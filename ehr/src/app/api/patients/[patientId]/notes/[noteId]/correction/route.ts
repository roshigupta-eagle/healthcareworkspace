import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { correctNote } from '@/lib/doctorNotesStore';
import { resolveActor } from '@/lib/noteActor';
import type { DoctorNoteSection } from '@/types/doctorNote';

export async function POST(request: Request, { params }: { params: { patientId: string; noteId: string } }) {
  const { patientId, noteId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const body = await request.json().catch(() => ({} as any));
  const reason = typeof body?.reason === 'string' ? body.reason : '';
  const sections: DoctorNoteSection[] = Array.isArray(body?.sections)
    ? body.sections.map((s: any) => ({ heading: String(s?.heading || ''), body: String(s?.body || '') }))
    : [];

  const actor = await resolveActor();
  const result = await correctNote(patientId, noteId, sections, reason, actor);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
