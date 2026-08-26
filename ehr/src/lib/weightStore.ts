import fs from 'fs';
import path from 'path';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

export type WeightMeasurementSource = 'clinic' | 'patient-reported' | 'device' | 'imported';
export type WeightMeasurementStatus = 'preliminary' | 'final' | 'corrected' | 'entered-in-error';

export interface WeightMeasurement {
  id: string;
  patientId: string;
  value: number;
  unit: 'kg' | 'lb';
  occurredAt: string;
  source: WeightMeasurementSource;
  status: WeightMeasurementStatus;
  enteredInError?: boolean;
  note?: string;
  recorder?: { id?: string; name?: string; credential?: string };
  encounterId?: string;
  method?: string;
  sourceResource?: { resourceType: string; id?: string; display?: string };
  correction?: { correctedAt?: string; previousValue?: number; previousUnit?: string; reason?: string; correctedBy?: string; correctedByCredential?: string; replacedByMeasurementId?: string };
  replacesMeasurementId?: string;
  replacedByMeasurementId?: string;
  enteredInErrorReason?: string;
  dataQuality?: { state: 'review'; reason: string; source?: string };
  provenance?: { createdAt?: string; updatedAt?: string; sourceSystem?: string; version?: string };
  history?: Array<Record<string, unknown>>;
  version?: number;
}

export interface WeightGoal {
  id: string;
  patientId: string;
  goalType?: string;
  targetWeight?: number;
  targetWeightMin?: number;
  targetWeightMax?: number;
  baselineWeight?: number;
  targetDate?: string;
  owner?: string;
  status?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  replacedBy?: string;
  history?: Array<Record<string, unknown>>;
  version?: number;
}

function ehrRoot() {
  const cwd = path.resolve(process.cwd());
  return path.basename(cwd).toLowerCase() === 'ehr' ? cwd : path.join(cwd, 'ehr');
}

const DATA_DIR = path.join(ehrRoot(), 'data');
const DATA_PATH = path.join(DATA_DIR, 'weight_measurements.json');
const GOAL_PATH = path.join(DATA_DIR, 'weight_goals.json');
const LEGACY_DATA_PATH = path.join(DATA_DIR, '..', 'ehr', 'data', 'weight_measurements.json');
const LEGACY_GOAL_PATH = path.join(DATA_DIR, '..', 'ehr', 'data', 'weight_goals.json');

async function readRaw(filePath: string) {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw || '{}');
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

async function readMerged(filePath: string, legacyPath: string) {
  const [primary, legacy] = await Promise.all([readRaw(filePath), readRaw(legacyPath)]);
  const merged = new Map<string, Record<string, unknown>>();
  for (const item of legacy.items) if (item && typeof item === 'object' && typeof item.id === 'string') merged.set(item.id, item as Record<string, unknown>);
  for (const item of primary.items) if (item && typeof item === 'object' && typeof item.id === 'string') merged.set(item.id, item as Record<string, unknown>);
  return { items: Array.from(merged.values()) };
}

async function writeRaw(filePath: string, items: Array<Record<string, unknown>>) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, JSON.stringify({ items }, null, 2), 'utf-8');
}

function normalizeSource(value: unknown): WeightMeasurementSource {
  const source = typeof value === 'string' ? value.toLowerCase().replace(/[_\s]+/g, '-') : '';
  return source === 'patient-reported' || source === 'device' || source === 'imported' ? source : 'clinic';
}

function normalizeUnit(value: unknown): 'kg' | 'lb' | null {
  if (value == null || value === '') return 'kg';
  if (typeof value !== 'string') return null;
  const unit = value.toLowerCase();
  if (['lb', 'lbs', 'pound', 'pounds'].includes(unit)) return 'lb';
  if (['kg', 'kgs', 'kilogram', 'kilograms'].includes(unit)) return 'kg';
  return null;
}

function normalizeStatus(record: Record<string, unknown>): WeightMeasurementStatus {
  const status = typeof record.status === 'string' ? record.status.toLowerCase() : '';
  if (record.enteredInError === true || status === 'entered-in-error') return 'entered-in-error';
  if (status === 'corrected' || record.correction) return 'corrected';
  return status === 'preliminary' ? 'preliminary' : 'final';
}

function normalizeMeasurement(record: Record<string, unknown>): WeightMeasurement | null {
  const value = typeof record.value === 'number' ? record.value : Number(record.value);
  const id = typeof record.id === 'string' ? record.id : '';
  const patientId = typeof record.patientId === 'string' ? record.patientId : '';
  const occurredAt = typeof record.occurredAt === 'string' ? record.occurredAt : '';
  const unit = normalizeUnit(record.unit);
  if (!id || !patientId || !Number.isFinite(value) || !unit || !occurredAt || Number.isNaN(Date.parse(occurredAt))) return null;
  const status = normalizeStatus(record);
  return {
    ...record,
    id,
    patientId,
    value,
    unit,
    occurredAt,
    source: normalizeSource(record.source),
    status,
    enteredInError: status === 'entered-in-error',
  } as WeightMeasurement;
}

export async function listMeasurements(patientId: string, opts: { from?: string; to?: string; limit?: number } = {}) {
  const data = await readMerged(DATA_PATH, LEGACY_DATA_PATH);
  let items = data.items.map(normalizeMeasurement).filter((m): m is WeightMeasurement => Boolean(m)).filter((m) => String(m.patientId) === String(patientId));
  if (opts.from) {
    const fromT = Date.parse(opts.from);
    items = items.filter((m) => Date.parse(m.occurredAt) >= fromT);
  }
  if (opts.to) {
    const toT = Date.parse(opts.to);
    items = items.filter((m) => Date.parse(m.occurredAt) <= toT);
  }
  items.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
  const limit = opts.limit || 2000;
  return { items: items.slice(0, limit) };
}

export async function getMeasurement(id: string, patientId?: string) {
  const data = await readMerged(DATA_PATH, LEGACY_DATA_PATH);
  const measurement = data.items.map(normalizeMeasurement).find((m) => m?.id === id && (!patientId || m.patientId === patientId));
  return measurement || null;
}

export async function saveMeasurement(record: Record<string, unknown>) {
  const id = typeof record.id === 'string' && record.id ? record.id : `w${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  const normalized = normalizeMeasurement({ ...record, id });
  if (!normalized) throw new Error('invalid measurement');
  const now = new Date().toISOString();
  const toSave: WeightMeasurement = {
    ...normalized,
    provenance: { ...normalized.provenance, createdAt: now, updatedAt: now, sourceSystem: normalized.provenance?.sourceSystem || 'Roshi EHR', version: String(normalized.version || 1) },
    version: normalized.version || 1,
  };
  const data = await readMerged(DATA_PATH, LEGACY_DATA_PATH);
  await writeRaw(DATA_PATH, [...data.items, toSave]);
  return toSave;
}

export async function updateMeasurement(id: string, patch: Record<string, unknown>, patientId?: string) {
  const data = await readMerged(DATA_PATH, LEGACY_DATA_PATH);
  const idx = data.items.findIndex((item) => item.id === id && (!patientId || item.patientId === patientId));
  if (idx === -1) return null;
  const current = normalizeMeasurement(data.items[idx]);
  if (!current) return null;
  const now = new Date().toISOString();
  const correction = patch.correction && typeof patch.correction === 'object' ? patch.correction as Record<string, unknown> : null;
  const statusPatch = patch.enteredInError === true || patch.status === 'entered-in-error' ? { status: 'entered-in-error' as const, enteredInError: true } : correction ? { status: 'corrected' as const, enteredInError: false } : {};
  const history = Array.isArray(current.history) ? current.history : [];
  const historyEntry = correction ? { action: 'corrected', at: now, previousValue: current.value, previousUnit: current.unit, reason: typeof correction.reason === 'string' ? correction.reason : undefined } : patch.enteredInError === true ? { action: 'entered-in-error', at: now, reason: typeof patch.enteredInErrorReason === 'string' ? patch.enteredInErrorReason : undefined } : null;
  const merged = normalizeMeasurement({
    ...current,
    ...patch,
    ...statusPatch,
    correction: correction ? { ...current.correction, ...correction, correctedAt: correction.correctedAt || now, previousValue: current.value, previousUnit: current.unit } : current.correction,
    history: historyEntry ? [...history, historyEntry] : history,
    provenance: { ...current.provenance, updatedAt: now, version: String((current.version || 1) + 1) },
    version: (current.version || 1) + 1,
  });
  if (!merged) return null;
  data.items[idx] = merged;
  await writeRaw(DATA_PATH, data.items);
  return merged;
}

export async function correctMeasurement(id: string, patch: Record<string, unknown>, patientId: string) {
  const data = await readMerged(DATA_PATH, LEGACY_DATA_PATH);
  const idx = data.items.findIndex((item) => item.id === id && item.patientId === patientId);
  if (idx === -1) return null;
  const current = normalizeMeasurement(data.items[idx]);
  if (!current) return null;
  const now = new Date().toISOString();
  const correction = patch.correction && typeof patch.correction === 'object' ? patch.correction as Record<string, unknown> : {};
  const correctedId = `${id}-correction-${Date.now().toString(36)}`;
  const correctionDetails = { ...current.correction, ...correction, correctedAt: now, previousValue: current.value, previousUnit: current.unit, replacedByMeasurementId: correctedId };
  const corrected = normalizeMeasurement({
    ...current,
    ...patch,
    id: correctedId,
    status: 'corrected',
    enteredInError: false,
    replacesMeasurementId: id,
    correction: correctionDetails,
    history: [...(current.history || []), { action: 'created-as-correction', at: now, replacesMeasurementId: id, reason: correctionDetails.reason }],
    provenance: { ...current.provenance, createdAt: now, updatedAt: now, version: '1' },
    version: 1,
  });
  const original = normalizeMeasurement({
    ...current,
    status: 'corrected',
    replacedByMeasurementId: correctedId,
    correction: correctionDetails,
    history: [...(current.history || []), { action: 'corrected', at: now, replacedByMeasurementId: correctedId, reason: correctionDetails.reason }],
    provenance: { ...current.provenance, updatedAt: now, version: String((current.version || 1) + 1) },
    version: (current.version || 1) + 1,
  });
  if (!corrected || !original) return null;
  data.items[idx] = original;
  data.items.push(corrected);
  await writeRaw(DATA_PATH, data.items);
  return { original, corrected };
}

export async function listGoals(patientId: string) {
  const data = await readMerged(GOAL_PATH, LEGACY_GOAL_PATH);
  return data.items.filter((goal) => String(goal.patientId) === String(patientId)) as WeightGoal[];
}

export async function getActiveGoal(patientId: string) {
  const goals = await listGoals(patientId);
  const active = goals
    .filter((goal) => (goal.status || '').toLowerCase() === 'active')
    .sort((a, b) => {
      const aTime = Date.parse(a.updatedAt || a.createdAt || a.effectiveFrom || '') || -Infinity;
      const bTime = Date.parse(b.updatedAt || b.createdAt || b.effectiveFrom || '') || -Infinity;
      return bTime - aTime;
    })[0];
  return active || null;
}

export async function listClinicalEvents(patientId: string) {
  const patient = getPatientById(patientId);
  if (!patient) return [];
  const goals = await listGoals(patientId);
  const events = [
    ...(patient.upcoming || []).filter((appointment) => appointment.date).map((appointment) => ({
      id: `appointment-${appointment.id}`,
      patientId,
      date: new Date(appointment.date).toISOString(),
      type: 'encounter',
      category: appointment.status === 'Completed' ? 'Completed Encounter' : 'Scheduled Encounter',
      title: `${appointment.type} with ${appointment.doctor}`,
      actor: appointment.doctor,
      icon: 'stethoscope',
      details: `${appointment.status || 'Documented'} appointment${appointment.location ? ` at ${appointment.location}` : ''}. This event occurred during the selected period; causation is not inferred.`,
      recordHref: `/dashboard/records/${patientId}/appointments/${encodeURIComponent(appointment.id)}`,
    })),
    ...(patient.notes || []).filter((note) => note.date).map((note) => ({
      id: `note-${note.id}`,
      patientId,
      date: new Date(note.date).toISOString(),
      type: 'note',
      category: 'Clinical Note',
      title: 'Clinical note recorded',
      actor: note.author,
      icon: 'note',
      details: note.snippet,
      recordHref: `/dashboard/records/${patientId}/doctor-notes?noteId=${encodeURIComponent(note.id)}`,
    })),
    ...goals.filter((goal) => goal.createdAt || goal.effectiveFrom).map((goal) => ({
      id: `goal-${goal.id}`,
      patientId,
      date: goal.effectiveFrom || goal.createdAt!,
      type: 'goal',
      category: 'Documented Goal',
      title: goal.targetWeight != null ? `Weight goal documented: ${goal.targetWeight} kg` : 'Weight goal documented',
      actor: goal.owner || 'Care team',
      icon: 'target',
      details: `Goal type: ${goal.goalType || 'not specified'}. This event occurred during the selected period; goal status is not inferred from weight direction.`,
      recordHref: `/dashboard/records/${patientId}/weight-trend?tab=overview`,
    })),
  ];
  return events.filter((event) => !Number.isNaN(Date.parse(event.date))).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

export async function saveGoal(record: Record<string, unknown>) {
  const data = await readMerged(GOAL_PATH, LEGACY_GOAL_PATH);
  const id = typeof record.id === 'string' && record.id ? record.id : `g${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  const patientId = typeof record.patientId === 'string' ? record.patientId : '';
  if (!patientId) throw new Error('invalid goal');
  const toSave = { ...record, id, patientId, createdAt: record.createdAt || now, updatedAt: now, version: Number(record.version) || 1 };
  const next = data.items.map((goal) => {
    if (goal.id === id) return toSave;
    if (String(goal.patientId) === patientId && String(goal.status || '').toLowerCase() === 'active' && String(toSave.status || '').toLowerCase() === 'active') {
      return { ...goal, status: 'superseded', effectiveUntil: now, replacedBy: id, updatedAt: now };
    }
    return goal;
  });
  if (!next.some((goal) => goal.id === id)) next.push(toSave);
  await writeRaw(GOAL_PATH, next);
  return toSave as WeightGoal;
}
