import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'ehr', 'data', 'conditions.json');

export type ClinicalStatus = 'active' | 'inactive' | 'resolved' | 'remission' | 'entered-in-error';
export type VerificationStatus = 'confirmed' | 'provisional' | 'differential' | 'unconfirmed' | 'refuted' | 'entered-in-error';

export interface ConditionHistoryEntry {
  date: string;
  actor: string;
  action: string;
}

export interface ConditionRecord {
  id: string;
  patientId: string;
  name: string;
  category?: string;
  clinicalStatus: ClinicalStatus;
  verificationStatus: VerificationStatus;
  onsetDate?: string;
  recordedDate?: string;
  lastReviewed?: string;
  managedBy?: string;
  recorder?: string;
  note?: string;
  resolvedDate?: string;
  resolvedReason?: string;
  enteredInErrorReason?: string;
  source?: 'native' | 'imported';
  history: ConditionHistoryEntry[];
}

async function readRaw(): Promise<{ items: ConditionRecord[] }> {
  try {
    const raw = await fs.promises.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return { items: [] };
  }
}

async function writeAll(data: { items: ConditionRecord[] }) {
  try {
    await fs.promises.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.promises.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    /* best-effort persistence in this mock environment */
  }
}

export async function listConditions(patientId: string): Promise<ConditionRecord[]> {
  const data = await readRaw();
  return (data.items || []).filter((c) => String(c.patientId) === String(patientId));
}

export async function getCondition(patientId: string, conditionId: string): Promise<ConditionRecord | null> {
  const all = await listConditions(patientId);
  return all.find((c) => c.id === conditionId) || null;
}

export async function createCondition(patientId: string, input: Partial<ConditionRecord>, actor: string): Promise<ConditionRecord> {
  const data = await readRaw();
  const now = new Date().toISOString();
  const record: ConditionRecord = {
    id: input.id || `cond-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
    patientId,
    name: input.name || 'Unspecified condition',
    category: input.category,
    clinicalStatus: input.clinicalStatus || 'active',
    verificationStatus: input.verificationStatus || 'provisional',
    onsetDate: input.onsetDate,
    recordedDate: input.recordedDate || now.slice(0, 10),
    lastReviewed: input.lastReviewed,
    managedBy: input.managedBy,
    recorder: input.recorder || actor,
    note: input.note,
    source: input.source || 'native',
    history: [{ date: now, actor, action: 'recorded' }],
  };
  data.items = [...(data.items || []), record];
  await writeAll(data);
  return record;
}

export async function updateCondition(
  patientId: string,
  conditionId: string,
  patch: Partial<ConditionRecord>,
  actor: string,
  action: string,
): Promise<ConditionRecord | null> {
  const data = await readRaw();
  const items = data.items || [];
  const idx = items.findIndex((c) => c.id === conditionId && String(c.patientId) === String(patientId));
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const updated: ConditionRecord = {
    ...items[idx],
    ...patch,
    history: [...(items[idx].history || []), { date: now, actor, action }],
  };
  items[idx] = updated;
  data.items = items;
  await writeAll(data);
  return updated;
}
