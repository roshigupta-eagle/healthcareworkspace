import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { listNotes, createDraft } from '@/lib/doctorNotesStore';
import { canAccessTaskPatient } from '@/lib/doctorWorkStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { noteBodyText } from '@/types/doctorNote';
import type { DoctorNoteSection, DoctorNoteType } from '@/types/doctorNote';
import { getTemplateById } from '@/lib/noteTemplates';

const VALID_TYPES: DoctorNoteType[] = ['progress', 'follow-up', 'phone', 'care-plan', 'general'];

export async function GET(request: Request, { params }: { params: { patientId: string } }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { patientId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient.' }, { status: 403 });

  const actor = access.actor!;
  const all = await listNotes(patientId, patient);

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const type = url.searchParams.get('type') || undefined;
  const provider = url.searchParams.get('provider') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const followUp = url.searchParams.get('followUp') || undefined; // has | none
  const from = url.searchParams.get('from') || undefined;
  const to = url.searchParams.get('to') || undefined;
  const mine = url.searchParams.get('mine') === '1';

  let filtered = all;
  if (type && type !== 'all') filtered = filtered.filter((n) => n.type === type);
  if (provider && provider !== 'all') filtered = filtered.filter((n) => n.author.name === provider);
  if (status && status !== 'all') filtered = filtered.filter((n) => n.status === status);
  if (followUp === 'has') filtered = filtered.filter((n) => !!n.followUpTaskId);
  if (followUp === 'none') filtered = filtered.filter((n) => !n.followUpTaskId);
  if (from) filtered = filtered.filter((n) => n.createdAt >= from);
  if (to) filtered = filtered.filter((n) => n.createdAt <= to);
  if (mine) filtered = filtered.filter((n) => n.author.id === actor.id || n.author.name === actor.name);
  if (q) {
    filtered = filtered.filter((n) => {
      const haystack = [n.author.name, n.type, noteBodyText(n)].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  return NextResponse.json({ data: filtered, currentUser: actor, total: all.length }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function POST(request: Request, { params }: { params: { patientId: string } }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { patientId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient.' }, { status: 403 });

  const body = await request.json().catch(() => ({} as any));
  const type: DoctorNoteType = VALID_TYPES.includes(body?.type) ? body.type : 'progress';
  const templateId = typeof body?.templateId === 'string' ? body.templateId : null;
  const template = getTemplateById(templateId);

  let sections: DoctorNoteSection[];
  if (Array.isArray(body?.sections) && body.sections.length) {
    sections = body.sections.map((s: any) => ({ heading: String(s?.heading || ''), body: String(s?.body || '') }));
  } else if (template) {
    sections = template.sections.map((s) => ({ ...s }));
  } else {
    sections = [{ heading: '', body: '' }];
  }

  const actor = access.actor!;
  const relatedConcernId = typeof body?.relatedConcernId === 'string' && body.relatedConcernId ? body.relatedConcernId : null;
  const note = await createDraft(patientId, { type, sections, templateId, templateLabel: template?.label ?? null, relatedConcernId }, actor);
  return NextResponse.json(note, { status: 201 });
}
