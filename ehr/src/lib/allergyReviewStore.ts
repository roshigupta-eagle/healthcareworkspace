import fs from 'fs';
import path from 'path';
import { resolveDataPath } from './dataPath';

function getDataPath(): string {
  return resolveDataPath('allergy_reviews.json');
}

export type NkaStatus = 'confirmed-nka' | 'has-allergies' | 'unconfirmed' | 'not-documented';

export interface ReviewHistoryEntry {
  date: string;
  by: string;
  patientReportedStatus: string;
  nkaStatus: NkaStatus;
  note?: string;
}

export interface AllergyReviewRecord {
  patientId: string;
  nkaStatus: NkaStatus;
  lastReviewedAt?: string;
  reviewedBy?: string;
  source?: string;
  patientReportedStatus?: string;
  history: ReviewHistoryEntry[];
}

async function readRaw(): Promise<{ items: AllergyReviewRecord[] }> {
  try {
    const dataPath = getDataPath();
    const raw = await fs.promises.readFile(dataPath, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return { items: [] };
  }
}

async function writeAll(data: { items: AllergyReviewRecord[] }) {
  try {
    const dataPath = getDataPath();
    await fs.promises.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.promises.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    /* best-effort persistence in mock environment */
  }
}

export async function getReviewRecord(patientId: string): Promise<AllergyReviewRecord | null> {
  const data = await readRaw();
  return (data.items || []).find((r) => String(r.patientId) === String(patientId)) || null;
}

export async function recordAllergyReview(
  patientId: string,
  by: string,
  nkaStatus: NkaStatus,
  patientReportedStatus: string = 'No new allergies reported',
  note?: string,
): Promise<AllergyReviewRecord> {
  const data = await readRaw();
  const items = data.items || [];
  const now = new Date().toISOString();
  const idx = items.findIndex((r) => String(r.patientId) === String(patientId));
  const entry: ReviewHistoryEntry = { date: now, by, patientReportedStatus, nkaStatus, note };

  if (idx === -1) {
    const record: AllergyReviewRecord = {
      patientId,
      nkaStatus,
      lastReviewedAt: now,
      reviewedBy: by,
      source: 'Patient Chart Review',
      patientReportedStatus,
      history: [entry],
    };
    items.push(record);
    data.items = items;
    await writeAll(data);
    return record;
  }

  items[idx] = {
    ...items[idx],
    nkaStatus,
    lastReviewedAt: now,
    reviewedBy: by,
    patientReportedStatus,
    history: [...(items[idx].history || []), entry],
  };
  data.items = items;
  await writeAll(data);
  return items[idx];
}
