import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'ehr', 'data', 'medications.json');

export type MedicationStatus = 'active' | 'on-hold' | 'completed' | 'stopped' | 'entered-in-error' | 'draft';
export type MedicationSource = 'native' | 'imported' | 'patient-reported';

export interface MedicationHistoryEntry {
  date: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface MedicationRecord {
  id: string;
  patientId: string;
  name: string;
  genericName?: string;
  brandNames?: string[];
  dose?: string;
  unit?: string;
  route?: string;
  frequency?: string;
  instructions?: string;
  prnReason?: string;
  durationDays?: number;
  indication?: string;
  conditionId?: string;
  status: MedicationStatus;
  prescribedBy?: string;
  startDate?: string;
  endDate?: string;
  quantity?: string;
  refillsAuthorized?: number;
  refillsRemaining?: number;
  daysSupply?: number;
  lastRefillDate?: string;
  nextEligibleRefillDate?: string;
  pharmacy?: string;
  lastReviewed?: string;
  reviewedBy?: string;
  source: MedicationSource;
  holdReason?: string;
  holdEffectiveDate?: string;
  stopReason?: string;
  stopEffectiveDate?: string;
  enteredInErrorReason?: string;
  carePlanId?: string;
  carePlanName?: string;
  history: MedicationHistoryEntry[];
}

async function readRaw(): Promise<{ items: MedicationRecord[] }> {
  try {
    const raw = await fs.promises.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return { items: [] };
  }
}

async function writeAll(data: { items: MedicationRecord[] }) {
  try {
    await fs.promises.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.promises.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    /* best-effort persistence in this mock environment */
  }
}

export async function listMedications(patientId: string): Promise<MedicationRecord[]> {
  const data = await readRaw();
  return (data.items || []).filter((m) => String(m.patientId) === String(patientId));
}

export async function getMedication(patientId: string, medicationId: string): Promise<MedicationRecord | null> {
  const all = await listMedications(patientId);
  return all.find((m) => m.id === medicationId) || null;
}

export async function createMedication(patientId: string, input: Partial<MedicationRecord>, actor: string): Promise<MedicationRecord> {
  const data = await readRaw();
  const now = new Date().toISOString();
  const record: MedicationRecord = {
    id: input.id || `med-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
    patientId,
    name: input.name || 'Unspecified medication',
    genericName: input.genericName,
    brandNames: input.brandNames,
    dose: input.dose,
    unit: input.unit,
    route: input.route || 'Oral',
    frequency: input.frequency,
    instructions: input.instructions,
    prnReason: input.prnReason,
    durationDays: input.durationDays,
    indication: input.indication,
    conditionId: input.conditionId,
    status: input.status || 'active',
    prescribedBy: input.prescribedBy || actor,
    startDate: input.startDate || now.slice(0, 10),
    quantity: input.quantity,
    refillsAuthorized: input.refillsAuthorized,
    refillsRemaining: input.refillsRemaining,
    daysSupply: input.daysSupply,
    pharmacy: input.pharmacy,
    source: input.source || 'native',
    carePlanId: input.carePlanId,
    carePlanName: input.carePlanName,
    history: [{ date: now, actor, action: 'prescribed' }],
  };
  data.items = [...(data.items || []), record];
  await writeAll(data);
  return record;
}

export async function updateMedication(
  patientId: string,
  medicationId: string,
  patch: Partial<MedicationRecord>,
  actor: string,
  action: string,
  detail?: string,
): Promise<MedicationRecord | null> {
  const data = await readRaw();
  const items = data.items || [];
  const idx = items.findIndex((m) => m.id === medicationId && String(m.patientId) === String(patientId));
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const updated: MedicationRecord = {
    ...items[idx],
    ...patch,
    history: [...(items[idx].history || []), { date: now, actor, action, detail }],
  };
  items[idx] = updated;
  data.items = items;
  await writeAll(data);
  return updated;
}
