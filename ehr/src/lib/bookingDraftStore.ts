import fs from 'fs/promises';
import path from 'path';
import { resolveDataPath } from '@/lib/dataPath';

export type BookingDraft = {
  actorId: string;
  patientId?: string;
  appointmentType?: string;
  providerId?: string;
  locationId?: string;
  date?: string;
  slotId?: string;
  reason?: string;
  notes?: string;
  updatedAt: string;
};

const DRAFTS_FILE = resolveDataPath('scheduling_booking_drafts.json');
const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
let writeQueue = Promise.resolve();

async function readAll(): Promise<BookingDraft[]> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(DRAFTS_FILE, 'utf8'));
    const now = Date.now();
    return Array.isArray(parsed) ? parsed.filter((item): item is BookingDraft => Boolean(item && typeof item === 'object' && typeof (item as { actorId?: unknown }).actorId === 'string' && typeof (item as { updatedAt?: unknown }).updatedAt === 'string' && now - Date.parse((item as { updatedAt: string }).updatedAt) <= DRAFT_MAX_AGE_MS)) : [];
  } catch {
    return [];
  }
}

async function writeAll(items: BookingDraft[]) {
  await fs.mkdir(path.dirname(DRAFTS_FILE), { recursive: true });
  const temporaryFile = `${DRAFTS_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(items, null, 2), 'utf8');
  await fs.rename(temporaryFile, DRAFTS_FILE);
}

async function withWriteLock<T>(operation: () => Promise<T>) {
  const previous = writeQueue;
  let release!: () => void;
  writeQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try { return await operation(); } finally { release(); }
}

export async function getBookingDraft(actorId: string) {
  return (await readAll()).find((draft) => draft.actorId === actorId) || null;
}

export async function saveBookingDraft(actorId: string, input: Omit<BookingDraft, 'actorId' | 'updatedAt'>) {
  return withWriteLock(async () => {
    const items = await readAll();
    const draft: BookingDraft = { actorId, ...input, updatedAt: new Date().toISOString() };
    const remaining = items.filter((item) => item.actorId !== actorId);
    await writeAll([draft, ...remaining]);
    return draft;
  });
}

export async function discardBookingDraft(actorId: string) {
  return withWriteLock(async () => {
    const items = await readAll();
    await writeAll(items.filter((item) => item.actorId !== actorId));
  });
}
