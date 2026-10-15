import fs from 'fs';
import path from 'path';
import { resolveDataPath } from './dataPath';

const DATA_PATH = resolveDataPath('allergies.json');

export type AllergyCategory = 'medication' | 'food' | 'environmental' | 'latex' | 'other';
export type ClinicalStatus = 'active' | 'inactive' | 'resolved' | 'entered-in-error';
export type VerificationStatus = 'confirmed' | 'unconfirmed' | 'provisional' | 'refuted' | 'entered-in-error';
export type Criticality = 'low' | 'high' | 'unable-to-assess';
export type Severity = 'mild' | 'moderate' | 'severe';

export interface AllergyReaction {
  manifestation: string;
  severity?: Severity;
  onset?: string;
  note?: string;
}

export interface AllergyHistoryEntry {
  date: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface AllergyRecord {
  id: string;
  patientId: string;
  substance: {
    display: string;
    code?: string;
    system?: string;
  };
  type?: 'allergy' | 'intolerance';
  category: AllergyCategory[];
  clinicalStatus: ClinicalStatus;
  verificationStatus: VerificationStatus;
  criticality?: Criticality;
  reactions: AllergyReaction[];
  onset?: string;
  lastOccurrence?: string;
  recordedAt?: string;
  lastReviewedAt?: string;
  recorder?: { display?: string };
  source?: string;
  note?: string;
  resolvedDate?: string;
  resolvedReason?: string;
  enteredInErrorReason?: string;
  history: AllergyHistoryEntry[];
}

export async function readAllergiesRaw(): Promise<{ items: AllergyRecord[] }> {
  try {
    const raw = await fs.promises.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return { items: [] };
  }
}

export function readActiveAllergyNamesSync(patientId: string): string[] | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as { items?: AllergyRecord[] };
    if (!Array.isArray(parsed.items)) return null;
    return parsed.items.filter((item) => String(item.patientId) === String(patientId) && item.clinicalStatus === 'active' && !['refuted', 'entered-in-error'].includes(item.verificationStatus || '')).map((item) => item.substance?.display).filter((name): name is string => Boolean(name));
  } catch {
    return null;
  }
}

async function writeAll(data: { items: AllergyRecord[] }) {
  try {
    await fs.promises.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.promises.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    /* best-effort persistence */
  }
}

export async function listAllergiesRecords(patientId: string): Promise<AllergyRecord[]> {
  const data = await readAllergiesRaw();
  return (data.items || []).filter((a) => String(a.patientId) === String(patientId));
}

export async function getAllergy(patientId: string, allergyId: string): Promise<AllergyRecord | null> {
  const all = await listAllergiesRecords(patientId);
  return all.find((a) => a.id === allergyId) || null;
}

export async function createAllergy(patientId: string, input: Partial<AllergyRecord>, actor: string): Promise<AllergyRecord> {
  const data = await readAllergiesRaw();
  const now = new Date().toISOString();
  const record: AllergyRecord = {
    id: input.id || `alg-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
    patientId,
    substance: input.substance || { display: 'Unspecified allergen' },
    type: input.type || 'allergy',
    category: input.category || ['other'],
    clinicalStatus: input.clinicalStatus || 'active',
    verificationStatus: input.verificationStatus || 'provisional',
    criticality: input.criticality,
    reactions: input.reactions || [],
    onset: input.onset,
    lastOccurrence: input.lastOccurrence,
    recordedAt: input.recordedAt || now.slice(0, 10),
    lastReviewedAt: input.lastReviewedAt || now.slice(0, 10),
    recorder: input.recorder || { display: actor },
    source: input.source || 'Native Documentation',
    note: input.note,
    history: [{ date: now, actor, action: 'recorded' }],
  };
  data.items = [...(data.items || []), record];
  await writeAll(data);
  return record;
}

export async function updateAllergyRecord(
  patientId: string,
  allergyId: string,
  patch: Partial<AllergyRecord>,
  actor: string,
  action: string,
  detail?: string,
): Promise<AllergyRecord | null> {
  const data = await readAllergiesRaw();
  const items = data.items || [];
  const idx = items.findIndex((a) => a.id === allergyId && String(a.patientId) === String(patientId));
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const updated: AllergyRecord = {
    ...items[idx],
    ...patch,
    history: [...(items[idx].history || []), { date: now, actor, action, detail }],
  };
  items[idx] = updated;
  data.items = items;
  await writeAll(data);
  return updated;
}

export type ListOpts = {
  category?: string;
  verification?: string;
  cursor?: string;
  limit?: number;
};

export async function listAllergies(patientId: string, opts: ListOpts = {}) {
  const data = await readAllergiesRaw();
  const all: AllergyRecord[] = Array.isArray(data.items) ? data.items : [];
  const patientItems = all.filter((i) => String(i.patientId) === String(patientId));

  const summary = {
    drug: patientItems.filter((i) => (i.category || []).includes('medication')).length,
    food: patientItems.filter((i) => (i.category || []).includes('food')).length,
    environmental: patientItems.filter((i) => (i.category || []).includes('environmental')).length,
    other: patientItems.filter((i) => (i.category || []).length > 0 && !(i.category || []).some((c: string) => ['medication', 'food', 'environmental'].includes(c))).length,
    needsReview: patientItems.filter((i) => !i.verificationStatus || (i.verificationStatus || '').toLowerCase() !== 'confirmed').length,
  };

  let items = patientItems.slice();
  if (opts.category) {
    const c = opts.category.toLowerCase();
    items = items.filter((i) => (i.category || []).map((x: string) => String(x).toLowerCase()).includes(c));
  }
  if (opts.verification) {
    const v = opts.verification.toLowerCase();
    items = items.filter((i) => String(i.verificationStatus || '').toLowerCase() === v);
  }

  if (opts.cursor) {
    const idx = items.findIndex((it) => it.id === opts.cursor);
    if (idx >= 0) items = items.slice(idx + 1);
  }
  const limit = opts.limit || 200;
  const sliced = items.slice(0, limit);

  return { summary, items: sliced };
}

export async function saveAllergy(record: Partial<AllergyRecord>) {
  const patientId = record.patientId || 'patient-001';
  return createAllergy(patientId, record, record.recorder?.display || 'Clinician');
}

export async function updateAllergy(id: string, patch: Partial<AllergyRecord> & { actor?: string; action?: string }) {
  const patientId = patch.patientId || 'patient-001';
  return updateAllergyRecord(patientId, id, patch, patch.actor || 'Clinician', patch.action || 'updated');
}
