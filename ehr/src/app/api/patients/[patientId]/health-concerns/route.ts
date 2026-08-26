import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { listConcerns, createConcern } from '@/lib/healthConcernsStore';
import { canAccessTaskPatient } from '@/lib/doctorWorkStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import type { ConcernCategory, ConcernClinicalStatus, ConcernVerification, HealthConcern } from '@/types/healthConcern';

function eventTime(c: HealthConcern): number {
  const t = Date.parse(c.updatedAt);
  return Number.isFinite(t) ? t : 0;
}

export async function GET(request: Request, { params }: { params: { patientId: string } }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { patientId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient.' }, { status: 403 });

  const actor = access.actor!;
  const all = await listConcerns(patientId, patient);

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const status = url.searchParams.get('status') || undefined;
  const provider = url.searchParams.get('provider') || undefined;
  const category = url.searchParams.get('category') || undefined;
  const mine = url.searchParams.get('mine') === '1';
  const hasFollowUp = url.searchParams.get('hasFollowUp') || undefined;

  let filtered = all;
  if (status && status !== 'all') filtered = filtered.filter((c) => c.clinicalStatus === status);
  if (provider) filtered = filtered.filter((c) => c.responsibleProvider?.name === provider);
  if (category) filtered = filtered.filter((c) => c.category === category);
  if (mine) filtered = filtered.filter((c) => c.responsibleProvider?.id === actor.id || c.responsibleProvider?.name === actor.name);
  if (hasFollowUp === 'has') filtered = filtered.filter((c) => !!c.followUpTaskId);
  if (hasFollowUp === 'none') filtered = filtered.filter((c) => !c.followUpTaskId);
  if (q) {
    filtered = filtered.filter((c) => [c.term, c.description, c.responsibleProvider?.name].filter(Boolean).join(' ').toLowerCase().includes(q));
  }

  filtered = filtered.sort((a, b) => eventTime(b) - eventTime(a));

  return NextResponse.json({ data: filtered, currentUser: actor }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function POST(request: Request, { params }: { params: { patientId: string } }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { patientId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient.' }, { status: 403 });

  const body = await request.json().catch(() => ({} as any));
  const term = typeof body?.term === 'string' ? body.term.trim() : '';
  if (!term) return NextResponse.json({ error: 'A structured concern term is required.' }, { status: 400 });

  const category: ConcernCategory = ['Health concern', 'Problem', 'Symptom', 'Diagnosis'].includes(body?.category) ? body.category : 'Health concern';
  const clinicalStatus: ConcernClinicalStatus = ['active', 'monitoring', 'resolved'].includes(body?.clinicalStatus) ? body.clinicalStatus : 'active';
  const verification: ConcernVerification = ['confirmed', 'provisional', 'unconfirmed'].includes(body?.verification) ? body.verification : 'provisional';
  const severity = typeof body?.severity === 'string' && body.severity ? body.severity : null;
  const onset = typeof body?.onset === 'string' && body.onset ? body.onset : null;
  const description = typeof body?.notes === 'string' && body.notes ? body.notes : null;
  const encounter = typeof body?.encounter === 'string' && body.encounter ? body.encounter : null;
  const providerName = typeof body?.provider === 'string' && body.provider ? body.provider : null;

  const actor = access.actor!;
  const responsibleProvider = providerName ? { id: `provider-${providerName.toLowerCase().replace(/\s+/g, '-')}`, name: providerName, role: 'DOCTOR' } : actor;

  const concern = await createConcern(
    patientId,
    { term, category, clinicalStatus, verification, severity, onset, responsibleProvider, encounterId: encounter, description },
    actor,
  );

  return NextResponse.json(concern, { status: 201 });
}
