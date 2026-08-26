import fs from 'fs';
import path from 'path';
import { resolveDataPath } from './dataPath';

function getDataPath(): string {
  return resolveDataPath('allergy_safety.json');
}

export type SafetyCheckStatus = 'completed' | 'unavailable';

export interface MedicationAllergyConflict {
  id: string;
  medicationName: string;
  allergyId: string;
  allergenName: string;
  reaction: string;
  severity: 'critical' | 'high' | 'moderate';
  message: string;
  source: string;
}

export interface PatientAllergySafetyResult {
  patientId: string;
  status: SafetyCheckStatus;
  checkedAt?: string;
  conflicts: MedicationAllergyConflict[];
}

async function readRaw(): Promise<{ items: PatientAllergySafetyResult[] }> {
  try {
    const dataPath = getDataPath();
    const raw = await fs.promises.readFile(dataPath, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return { items: [] };
  }
}

async function writeAll(data: { items: PatientAllergySafetyResult[] }) {
  try {
    const dataPath = getDataPath();
    await fs.promises.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.promises.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    /* best-effort persistence in mock environment */
  }
}

/** Reads the pre-computed authoritative allergy-medication safety result for a patient. Never computed in the frontend. */
export async function getAllergySafetyResult(patientId: string): Promise<PatientAllergySafetyResult | null> {
  const data = await readRaw();
  return (data.items || []).find((r) => String(r.patientId) === String(patientId)) || null;
}

export async function retrySafetyCheck(patientId: string): Promise<PatientAllergySafetyResult> {
  const data = await readRaw();
  const items = data.items || [];
  const now = new Date().toISOString();
  const idx = items.findIndex((r) => String(r.patientId) === String(patientId));

  const result: PatientAllergySafetyResult = {
    patientId,
    status: 'completed',
    checkedAt: now,
    conflicts: idx >= 0 ? items[idx].conflicts || [] : [],
  };

  if (idx >= 0) {
    items[idx] = result;
  } else {
    items.push(result);
  }
  data.items = items;
  await writeAll(data);
  return result;
}
