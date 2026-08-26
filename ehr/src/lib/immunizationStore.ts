import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'ehr', 'data', 'immunizations.json');

export type ImmunizationStatus = 'completed' | 'planned' | 'not-done' | 'entered-in-error' | 'unknown';

export interface ImmunizationHistoryEntry {
  date: string;
  actor: string;
  action: string;
}

export interface ImmunizationRecord {
  id: string;
  patientId: string;
  name: string;
  date?: string;
  status: ImmunizationStatus;
  nextReview?: string;
  lotNumber?: string;
  manufacturer?: string;
  site?: string;
  route?: string;
  provider?: string;
  notes?: string;
  source: 'native' | 'imported' | 'patient-history';
  recordedBy?: string;
  history: ImmunizationHistoryEntry[];
}

async function readRaw(): Promise<{ items: ImmunizationRecord[] }> {
  try {
    const raw = await fs.promises.readFile(DATA_PATH, 'utf-8');
    const parsed = JSON.parse(raw || '{}');
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

async function writeAll(data: { items: ImmunizationRecord[] }) {
  try {
    await fs.promises.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.promises.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

export function normalizeImmunizationStatus(value?: string): ImmunizationStatus {
  switch (value?.toLowerCase().trim()) {
    case 'completed':
      return 'completed';
    case 'planned':
    case 'scheduled':
      return 'planned';
    case 'not-done':
    case 'not done':
    case 'not given':
      return 'not-done';
    case 'entered-in-error':
    case 'entered in error':
      return 'entered-in-error';
    default:
      return 'unknown';
  }
}

export function mapLegacyImmunization(
  patientId: string,
  input: { id?: string; name: string; date?: string; status?: string; nextReview?: string },
  index: number,
): ImmunizationRecord {
  return {
    id: input.id || `patient-history-${patientId}-${index}`,
    patientId,
    name: input.name,
    date: input.date,
    status: normalizeImmunizationStatus(input.status || 'completed'),
    nextReview: input.nextReview,
    source: 'patient-history',
    history: [],
  };
}

export async function listImmunizations(patientId: string): Promise<ImmunizationRecord[]> {
  const data = await readRaw();
  return data.items.filter((item) => String(item.patientId) === String(patientId));
}

export async function createImmunization(
  patientId: string,
  input: Partial<ImmunizationRecord>,
  actor: string,
): Promise<ImmunizationRecord> {
  const data = await readRaw();
  const now = new Date().toISOString();
  const record: ImmunizationRecord = {
    id: input.id || `imm-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
    patientId,
    name: input.name?.trim() || 'Unspecified immunization',
    date: input.date,
    status: input.status || 'completed',
    nextReview: input.nextReview,
    lotNumber: input.lotNumber,
    manufacturer: input.manufacturer,
    site: input.site,
    route: input.route,
    provider: input.provider,
    notes: input.notes,
    source: input.source || 'native',
    recordedBy: input.recordedBy || actor,
    history: [{ date: now, actor, action: 'recorded' }],
  };
  data.items = [...data.items, record];
  await writeAll(data);
  return record;
}