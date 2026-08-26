import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'ehr', 'data', 'medication_reconciliation.json');

export interface ReconciliationHistoryEntry {
  date: string;
  by: string;
  encounterId?: string;
  confirmed: number;
  updated: number;
  stopped: number;
  unresolved: number;
}

export interface ReconciliationRecord {
  patientId: string;
  lastReconciledDate?: string;
  reconciledBy?: string;
  status: 'current' | 'review-due';
  history: ReconciliationHistoryEntry[];
}

async function readRaw(): Promise<{ items: ReconciliationRecord[] }> {
  try {
    const raw = await fs.promises.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return { items: [] };
  }
}

async function writeAll(data: { items: ReconciliationRecord[] }) {
  try {
    await fs.promises.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.promises.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    /* best-effort persistence in this mock environment */
  }
}

export async function getReconciliation(patientId: string): Promise<ReconciliationRecord | null> {
  const data = await readRaw();
  return (data.items || []).find((r) => String(r.patientId) === String(patientId)) || null;
}

export async function recordReconciliation(
  patientId: string,
  by: string,
  summary: { confirmed: number; updated: number; stopped: number; unresolved: number },
): Promise<ReconciliationRecord> {
  const data = await readRaw();
  const items = data.items || [];
  const now = new Date().toISOString();
  const idx = items.findIndex((r) => String(r.patientId) === String(patientId));
  const entry: ReconciliationHistoryEntry = { date: now, by, ...summary };
  const status: ReconciliationRecord['status'] = summary.unresolved > 0 ? 'review-due' : 'current';
  if (idx === -1) {
    const record: ReconciliationRecord = { patientId, lastReconciledDate: now, reconciledBy: by, status, history: [entry] };
    items.push(record);
    data.items = items;
    await writeAll(data);
    return record;
  }
  items[idx] = {
    ...items[idx],
    lastReconciledDate: now,
    reconciledBy: by,
    status,
    history: [...(items[idx].history || []), entry],
  };
  data.items = items;
  await writeAll(data);
  return items[idx];
}
