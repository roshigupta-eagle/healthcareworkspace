import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { resolveDataPath } from '@/lib/dataPath';

const REFERRALS_FILE = resolveDataPath('referrals.json');
const WRITE_LOCK_FILE = `${REFERRALS_FILE}.lock`;
let writeQueue = Promise.resolve();

export type ReferralBusinessState =
  | 'Draft'
  | 'Submitted'
  | 'Routing'
  | 'Delivered'
  | 'Received'
  | 'NeedsInformation'
  | 'UnderReview'
  | 'Accepted'
  | 'Redirected'
  | 'Declined'
  | 'Waitlisted'
  | 'Scheduling'
  | 'Scheduled'
  | 'InProgress'
  | 'ConsultCompleted'
  | 'OutcomeReceived'
  | 'Closed'
  | 'Cancelled';

export type ReferralPriority = 'routine' | 'high' | 'urgent';

export interface ReferralEvent {
  id: string;
  ts: string; // ISO
  actor?: string;
  type: string;
  detail?: unknown;
}

export interface Referral {
  id: string;
  patientId: string;
  subject?: string; // short display
  serviceCode?: string;
  specialty?: string;
  destination?: string; // organization/service display
  priority?: ReferralPriority;
  status?: string; // FHIR status if applicable
  businessState: ReferralBusinessState;
  authoredOn?: string;
  requester?: { id?: string; name?: string } | null;
  performer?: { id?: string; name?: string } | null;
  supportingInfo?: Array<{ type: string; id: string; display?: string }>;
  note?: string;
  dueAt?: string;
  scheduledAt?: string;
  events?: ReferralEvent[];
  createdAt: string;
  updatedAt?: string;
  version?: number;
}

export type CreateReferralInput = {
  id?: string;
  patientId: string;
  subject: string;
  serviceCode?: string;
  specialty?: string;
  destination?: string;
  priority?: ReferralPriority;
  dueAt?: string;
  note?: string;
  requester?: Referral['requester'];
};

export type ReferralWorkflowPatch = {
  businessState: ReferralBusinessState;
  status: string;
  scheduledAt?: string;
  events: ReferralEvent[];
};

async function ensureDataDir() {
  await fs.mkdir(path.dirname(REFERRALS_FILE), { recursive: true });
  try { await fs.access(REFERRALS_FILE); } catch { await fs.writeFile(REFERRALS_FILE, JSON.stringify({ items: [] }, null, 2), 'utf8'); }
}

function parseJson<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw || '') as T; } catch { return fallback; }
}

async function readAll(): Promise<Referral[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(REFERRALS_FILE, 'utf8');
    const parsed = parseJson<{ items?: Referral[] }>(raw, { items: [] });
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function writeAll(items: Referral[]) {
  const tmp = `${REFERRALS_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ items }, null, 2), 'utf8');
  await fs.rename(tmp, REFERRALS_FILE);
}

async function withWriteLock<T>(operation: () => Promise<T>) {
  const previous = writeQueue;
  let release!: () => void;
  writeQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  const token = await acquireFileLock();
  try {
    return await operation();
  } finally {
    await releaseFileLock(token);
    release();
  }
}

async function acquireFileLock() {
  const token = `${process.pid}:${randomUUID()}`;
  for (;;) {
    try {
      await fs.writeFile(WRITE_LOCK_FILE, token, { encoding: 'utf8', flag: 'wx' });
      return token;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      try {
        const lock = await fs.stat(WRITE_LOCK_FILE);
        if (Date.now() - lock.mtimeMs > 30_000) await fs.rm(WRITE_LOCK_FILE, { force: true });
      } catch {
        // Another writer may have released the lock while it was being inspected.
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

async function releaseFileLock(token: string) {
  try {
    if ((await fs.readFile(WRITE_LOCK_FILE, 'utf8')) === token) await fs.rm(WRITE_LOCK_FILE, { force: true });
  } catch {
    // The lock may already have been recovered after an interrupted process.
  }
}

export async function listReferrals(filter?: { patientId?: string; businessState?: string }): Promise<Referral[]> {
  const all = await readAll();
  let items = all;
  if (filter?.patientId) items = items.filter((r) => String(r.patientId) === String(filter.patientId));
  if (filter?.businessState) items = items.filter((r) => r.businessState === filter.businessState);
  // sort newest first by authoredOn or createdAt
  items.sort((a, b) => (b.authoredOn || b.createdAt || '').localeCompare(a.authoredOn || a.createdAt || ''));
  return items;
}

export async function getReferral(referralId: string): Promise<Referral | null> {
  const all = await readAll();
  return all.find((r) => String(r.id) === String(referralId)) || null;
}

export async function createReferral(input: CreateReferralInput): Promise<Referral> {
  if (!input.patientId || input.patientId === 'unknown') throw new Error('REFERRAL_PATIENT_REQUIRED');
  if (!input.subject.trim()) throw new Error('REFERRAL_SUBJECT_REQUIRED');
  return withWriteLock(async () => {
    const all = await readAll();
    const now = new Date().toISOString();
    const id = input.id || `ref-${randomUUID()}`;
    const existing = all.find((referral) => referral.id === id);
    if (existing) return existing;
    const referral: Referral = {
      id,
      patientId: input.patientId,
      subject: input.subject.trim(),
      serviceCode: input.serviceCode?.trim() || undefined,
      specialty: input.specialty?.trim() || undefined,
      destination: input.destination?.trim() || undefined,
      priority: input.priority || 'routine',
      status: 'active',
      businessState: 'Submitted',
      authoredOn: now,
      requester: input.requester || null,
      performer: null,
      supportingInfo: [],
      note: input.note?.trim() || undefined,
      dueAt: input.dueAt || undefined,
      events: [{ id: `evt-${randomUUID()}`, ts: now, type: 'created', actor: input.requester?.name || 'system' }],
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    all.push(referral);
    await writeAll(all);
    return referral;
  });
}

export async function updateReferral(referralId: string, patch: ReferralWorkflowPatch, expectedUpdatedAt?: string): Promise<Referral | null> {
  return withWriteLock(async () => {
    const all = await readAll();
    const idx = all.findIndex((referral) => referral.id === referralId);
    if (idx === -1) return null;
    const existing = all[idx];
    if (expectedUpdatedAt && existing.updatedAt !== expectedUpdatedAt) throw new Error('REFERRAL_VERSION_CONFLICT');
    const now = new Date().toISOString();
    const updated: Referral = {
      ...existing,
      businessState: patch.businessState,
      status: patch.status,
      ...(patch.scheduledAt ? { scheduledAt: patch.scheduledAt } : {}),
      updatedAt: now,
      version: (existing.version || 1) + 1,
      events: [...(existing.events || []), ...patch.events],
    };
    all[idx] = updated;
    await writeAll(all);
    return updated;
  });
}

export function referralDataPath() { return REFERRALS_FILE; }
