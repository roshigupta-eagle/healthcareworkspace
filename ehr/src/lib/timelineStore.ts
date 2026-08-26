import fs from 'fs/promises';
import path from 'path';
import { ClinicalTimelineEvent } from '@/types/clinicalTimeline';

const DATA_DIR = path.join(process.cwd(), 'ehr', 'data');
const TIMELINE_FILE = path.join(DATA_DIR, 'timeline.json');

async function ensureData() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(TIMELINE_FILE); } catch { await fs.writeFile(TIMELINE_FILE, JSON.stringify({ }, null, 2)); }
}

async function readAll(): Promise<Record<string, ClinicalTimelineEvent[]>> {
  await ensureData();
  const raw = await fs.readFile(TIMELINE_FILE, 'utf8');
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

async function writeAll(data: Record<string, ClinicalTimelineEvent[]>) {
  await fs.writeFile(TIMELINE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export async function listEvents(patientId: string, opts?: { types?: string[]; q?: string; limit?: number; cursor?: string }) {
  const all = await readAll();
  const list = (all[patientId] || []).slice();
  // sort by occurredAt desc
  list.sort((a,b) => (b.occurredAt || b.recordedAt || '').localeCompare(a.occurredAt || a.recordedAt || ''));

  let start = 0;
  if (opts?.cursor) {
    const idx = list.findIndex(e => e.id === opts.cursor);
    if (idx >= 0) start = idx + 1;
  }

  let filtered = list;
  if (opts?.types && opts.types.length) filtered = filtered.filter(e => opts.types!.includes(e.eventType));
  if (opts?.q) {
    const q = opts.q.toLowerCase();
    filtered = filtered.filter(e => (e.title || '').toLowerCase().includes(q) || (e.summary || '').toLowerCase().includes(q) || (e.provider?.name || '').toLowerCase().includes(q));
  }

  const limit = opts?.limit || 50;
  const slice = filtered.slice(start, start + limit);
  const nextCursor = slice.length === limit ? slice[slice.length - 1].id : undefined;
  return { data: slice, cursor: nextCursor };
}

export async function getEvent(patientId: string, eventId: string) {
  const all = await readAll();
  const list = all[patientId] || [];
  return list.find(e => e.id === eventId) || null;
}

export async function readPatientEvents(patientId: string): Promise<ClinicalTimelineEvent[]> {
  const all = await readAll();
  return (all[patientId] || []).slice();
}

export async function appendEvent(patientId: string, event: ClinicalTimelineEvent) {
  const all = await readAll();
  const list = all[patientId] || [];
  list.unshift(event);
  all[patientId] = list;
  await writeAll(all);
  return event;
}

export async function updateEvent(patientId: string, eventId: string, patch: Partial<ClinicalTimelineEvent>) {
  const all = await readAll();
  const list = all[patientId] || [];
  const idx = list.findIndex(e => e.id === eventId);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch };
  all[patientId] = list;
  await writeAll(all);
  return list[idx];
}

export function mapEventToFhir(event: ClinicalTimelineEvent) {
  // Minimal mapping wrapper: return a simple FHIR-like object with resourceType and id
  return {
    resourceType: event.resourceType || 'Bundle',
    id: event.resourceId || event.id,
    meta: { source: event.source?.system },
    status: event.status,
    code: { text: event.title },
    occurrenceDateTime: event.occurredAt || event.recordedAt,
    performer: event.provider ? [{ actor: { display: event.provider.name } }] : undefined,
  };
}
