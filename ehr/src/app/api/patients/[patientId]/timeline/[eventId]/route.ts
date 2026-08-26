import { NextResponse } from 'next/server';
import { getEvent, appendEvent, updateEvent } from '@/lib/timelineStore';
import { auth } from '@/lib/auth';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { buildSeedEvents } from '@/lib/timeline/seedFromPatient';

export async function GET(req: Request, { params }: { params: { patientId: string; eventId: string } }) {
  const { patientId, eventId } = params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  try { await auth(); } catch (e) { }

  let ev = await getEvent(patientId, eventId);
  if (!ev) {
    const seed = buildSeedEvents(patientId, patient);
    ev = seed.find((e) => e.id === eventId) || null;
  }
  if (!ev) return NextResponse.json({ error: 'event not found' }, { status: 404 });
  return NextResponse.json(ev);
}

export async function PATCH(req: Request, { params }: { params: { patientId: string; eventId: string } }) {
  const { patientId, eventId } = params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  try { await auth(); } catch (e) { }

  const body = await req.json().catch(() => ({} as any));
  const status = typeof body?.status === 'string' ? body.status.trim() : undefined;
  if (!status) return NextResponse.json({ error: 'status is required' }, { status: 400 });

  // Materialize seed-derived events into the persisted store the first time they are edited.
  let existing = await getEvent(patientId, eventId);
  if (!existing) {
    const seed = buildSeedEvents(patientId, patient);
    const seedMatch = seed.find((e) => e.id === eventId);
    if (!seedMatch) return NextResponse.json({ error: 'event not found' }, { status: 404 });
    existing = await appendEvent(patientId, seedMatch);
  }

  const updated = await updateEvent(patientId, eventId, { status, recordedAt: new Date().toISOString() });

  // Completing an appointment also records a companion encounter on the timeline.
  if (updated && updated.eventType === 'appointment' && status.toLowerCase() === 'completed') {
    const encounterId = `${eventId}-encounter`;
    const existingEncounter = await getEvent(patientId, encounterId);
    if (!existingEncounter) {
      await appendEvent(patientId, {
        id: encounterId,
        patientId,
        resourceType: 'Encounter',
        resourceId: encounterId,
        eventType: 'encounter',
        title: updated.title,
        summary: 'Completed appointment recorded as an encounter.',
        status: 'Completed',
        occurredAt: new Date().toISOString(),
        provider: updated.provider ?? null,
        source: { system: 'EHR', display: 'Encounters' },
        recordHref: `/dashboard/records/${patientId}/history`,
      });
    }
  }

  return NextResponse.json(updated);
}

