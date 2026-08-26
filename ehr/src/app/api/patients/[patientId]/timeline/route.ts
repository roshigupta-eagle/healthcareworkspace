import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { readPatientEvents, appendEvent } from '@/lib/timelineStore';
import { buildSeedEvents } from '@/lib/timeline/seedFromPatient';
import type { ClinicalTimelineEvent } from '@/types/clinicalTimeline';
import { listDocuments } from '@/lib/documentStore';

function eventTime(e: ClinicalTimelineEvent): number {
  const iso = e.occurredAt || e.recordedAt;
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : 0;
}

function sourceHref(patientId: string, event: ClinicalTimelineEvent) {
  if (event.recordHref) return event.recordHref;
  const id = encodeURIComponent(event.resourceId || event.id);
  if (event.eventType === 'document') return `/dashboard/records/${patientId}/documents?documentId=${id}`;
  if (event.eventType === 'note') return `/dashboard/records/${patientId}/doctor-notes?noteId=${id}`;
  if (event.eventType === 'result') return `/dashboard/records/${patientId}/labs/${id}`;
  if (event.eventType === 'appointment') return `/dashboard/records/${patientId}/appointments/${id}`;
  if (event.eventType === 'medication') return `/dashboard/records/${patientId}/medications`;
  if (event.eventType === 'encounter') return `/dashboard/records/${patientId}/history?visit=${id}`;
  if (event.eventType === 'procedure') return `/dashboard/records/${patientId}/upcoming-tests/${id}`;
  return undefined;
}

function temporalState(event: ClinicalTimelineEvent): 'past' | 'current' | 'future' {
  const timestamp = eventTime(event);
  if (!timestamp) return 'past';
  return timestamp > Date.now() ? 'future' : 'past';
}

export async function GET(request: Request, { params }: { params: { patientId: string } }) {
  const resolvedParams = await params;
  const { patientId } = resolvedParams;

  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') || url.searchParams.get('_count') || '100');
  const cursor = url.searchParams.get('cursor') || url.searchParams.get('pageToken') || undefined;
  const typesParam = url.searchParams.get('type') || url.searchParams.get('types') || undefined;
  const q = url.searchParams.get('q') || undefined;

  // Merge baseline (seeded from the patient's chart) with any persisted timeline
  // events (e.g. newly scheduled or completed appointments) so both show up together.
  const seedEvents = buildSeedEvents(patientId, patient);
  const documentEvents = (await listDocuments(patientId, patient)).map((document) => ({
    id: document.id,
    patientId,
    resourceType: 'DocumentReference',
    resourceId: document.id,
    eventType: 'document' as const,
    title: document.title,
    summary: [document.organization, document.source === 'imported' ? 'Imported' : null, document.status].filter(Boolean).join(' · ') || undefined,
    status: document.status,
    occurredAt: document.clinicalDate || document.uploadedAt || document.createdAt,
    recordedAt: document.uploadedAt || document.createdAt,
    provider: document.author ? { name: document.author } : null,
    organization: document.organization ? { name: document.organization } : null,
    source: { system: 'EHR', display: 'Documents' },
    recordHref: `/dashboard/records/${patientId}/documents?documentId=${encodeURIComponent(document.id)}`,
  } satisfies ClinicalTimelineEvent));
  const storedEvents = await readPatientEvents(patientId);

  const merged = new Map<string, ClinicalTimelineEvent>();
  for (const e of seedEvents) merged.set(`${e.resourceType}:${e.resourceId}`, e);
  for (const e of documentEvents) merged.set(`${e.resourceType}:${e.resourceId}`, e);
  for (const e of storedEvents) merged.set(`${e.resourceType}:${e.resourceId}`, e);

  let list = Array.from(merged.values()).map((event) => ({ ...event, recordHref: sourceHref(patientId, event), temporalState: temporalState(event) })).sort((a, b) => eventTime(b) - eventTime(a));

  if (typesParam) {
    const types = typesParam.split(',').map((t) => t.trim()).filter(Boolean);
    if (types.length) list = list.filter((e) => types.includes(e.eventType));
  }

  if (q) {
    const query = q.toLowerCase();
    list = list.filter((e) =>
      (e.title || '').toLowerCase().includes(query) ||
      (e.summary || '').toLowerCase().includes(query) ||
      (e.provider?.name || '').toLowerCase().includes(query)
    );
  }

  let start = 0;
  if (cursor) {
    const idx = list.findIndex((e) => e.id === cursor);
    if (idx >= 0) start = idx + 1;
  }

  const slice = list.slice(start, start + limit);
  const nextCursor = start + slice.length < list.length ? slice[slice.length - 1]?.id : undefined;

  return NextResponse.json({ data: slice, cursor: nextCursor });
}

export async function POST(request: Request, { params }: { params: { patientId: string } }) {
  const resolvedParams = await params;
  const { patientId } = resolvedParams;

  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const doctor = typeof body?.doctor === 'string' ? body.doctor.trim() : '';
  const type = typeof body?.type === 'string' ? body.type.trim() : '';
  const date = typeof body?.date === 'string' ? body.date : '';
  const location = typeof body?.location === 'string' ? body.location.trim() : undefined;

  if (!doctor || !type || !date) {
    return NextResponse.json({ error: 'doctor, type and date are required' }, { status: 400 });
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return NextResponse.json({ error: 'date is invalid' }, { status: 400 });
  }

  const id = `appt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const event: ClinicalTimelineEvent = {
    id,
    patientId,
    resourceType: 'Appointment',
    resourceId: id,
    eventType: 'appointment',
    title: `${type} with ${doctor}`,
    summary: location ? `Location: ${location}` : undefined,
    status: 'Scheduled',
    occurredAt: parsed.toISOString(),
    provider: { name: doctor },
    source: { system: 'EHR', display: 'Scheduling' },
    recordHref: `/dashboard/records/${patientId}/history`,
  };

  await appendEvent(patientId, event);

  return NextResponse.json(event, { status: 201 });
}
