import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'ehr', 'data', 'medication_safety.json');

export type SafetySeverity = 'info' | 'moderate' | 'high' | 'critical';
export type SafetyCheckStatus = 'completed' | 'unavailable';

export interface SafetyAlert {
  id: string;
  medicationIds: string[];
  type: 'allergy' | 'interaction' | 'duplicate-therapy' | 'monitoring';
  severity: SafetySeverity;
  message: string;
  source: string;
  recommendedAction?: string;
}

export interface PatientSafetyResult {
  patientId: string;
  status: SafetyCheckStatus;
  checkedAt?: string;
  alerts: SafetyAlert[];
}

async function readRaw(): Promise<{ items: PatientSafetyResult[] }> {
  try {
    const raw = await fs.promises.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return { items: [] };
  }
}

/** Reads the pre-computed authoritative safety result for a patient. Never computed in the frontend. */
export async function getSafetyResult(patientId: string): Promise<PatientSafetyResult | null> {
  const data = await readRaw();
  return (data.items || []).find((r) => String(r.patientId) === String(patientId)) || null;
}
