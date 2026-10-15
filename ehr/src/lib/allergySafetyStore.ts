import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'ehr', 'data', 'allergy_safety.json');

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
    const raw = await fs.promises.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return { items: [] };
  }
}

/** Reads the pre-computed authoritative allergy-medication safety result for a patient. Never computed in the frontend. */
export async function getAllergySafetyResult(patientId: string): Promise<PatientAllergySafetyResult | null> {
  const data = await readRaw();
  return (data.items || []).find((r) => String(r.patientId) === String(patientId)) || null;
}

export async function retrySafetyCheck(patientId: string): Promise<PatientAllergySafetyResult> {
  const existing = await getAllergySafetyResult(patientId);
  return existing || { patientId, status: 'unavailable', conflicts: [] };
}
