import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { Patient } from '@/app/dashboard/records/mockPatients';
import { resolveDataPath } from '@/lib/dataPath';
import { activityFromDocument } from '@/lib/chartActivity';
import { appendChartActivity as persistChartActivity } from '@/lib/chartActivityStore';

const DOCUMENTS_FILE = resolveDataPath('documents.json');

export type DocumentStatus = 'final' | 'signed' | 'draft' | 'needs-review' | 'awaiting-signature' | 'imported' | 'corrected' | 'superseded' | 'entered-in-error' | 'processing' | 'failed';
export type DocumentSource = 'roshi' | 'clinician-uploaded' | 'patient-uploaded' | 'external' | 'imported' | 'scanned';

export interface DocumentHistoryEntry {
  action: string;
  actor?: string;
  timestamp: string;
  details?: string;
}

export interface PatientDocument {
  id: string;
  patientId: string;
  title: string;
  type: string;
  clinicalDate?: string;
  createdAt?: string;
  uploadedAt?: string;
  updatedAt?: string;
  author?: string;
  organization?: string;
  source: DocumentSource;
  status: DocumentStatus;
  encounterId?: string;
  encounterDisplay?: string;
  url?: string;
  storageKey?: string;
  content?: string;
  mimeType?: string;
  sizeBytes?: number;
  checksum?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  version: number;
  history: DocumentHistoryEntry[];
}

export interface DocumentInput {
  title: string;
  type: string;
  clinicalDate?: string;
  author?: string;
  organization?: string;
  source?: DocumentSource;
  status?: DocumentStatus;
  encounterId?: string;
  encounterDisplay?: string;
  content?: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  checksum?: string;
}

async function readAll(): Promise<{ items: PatientDocument[] }> {
  try {
    const raw = await fs.readFile(DOCUMENTS_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

async function writeAll(data: { items: PatientDocument[] }) {
  await fs.mkdir(path.dirname(DOCUMENTS_FILE), { recursive: true });
  await fs.writeFile(DOCUMENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeStatus(value?: string): DocumentStatus {
  const status = (value || '').toLowerCase().replace(/[\s_]+/g, '-');
  if (status === 'signed') return 'signed';
  if (status === 'draft') return 'draft';
  if (status === 'needs-review' || status === 'review') return 'needs-review';
  if (status === 'awaiting-signature' || status === 'pending-signature') return 'awaiting-signature';
  if (status === 'imported') return 'imported';
  if (status === 'corrected') return 'corrected';
  if (status === 'superseded') return 'superseded';
  if (status === 'entered-in-error') return 'entered-in-error';
  if (status === 'processing') return 'processing';
  if (status === 'failed') return 'failed';
  return 'final';
}

function normalizeSource(value?: string): DocumentSource {
  const source = (value || '').toLowerCase().replace(/[\s_]+/g, '-');
  if (source === 'clinician-uploaded') return 'clinician-uploaded';
  if (source === 'patient-uploaded') return 'patient-uploaded';
  if (source === 'external' || source === 'external-organization') return 'external';
  if (source === 'imported') return 'imported';
  if (source === 'scanned') return 'scanned';
  return 'roshi';
}

export function mapLegacyDocument(patientId: string, document: NonNullable<Patient['documents']>[number]): PatientDocument {
  const title = document.name || 'Untitled clinical document';
  return {
    id: String(document.id),
    patientId,
    title,
    type: document.type || (/discharge/i.test(title) ? 'Discharge Summary' : 'Clinical Document'),
    clinicalDate: document.date,
    author: document.author,
    source: 'roshi',
    status: normalizeStatus(document.status || 'final'),
    url: document.url,
    content: document.content,
    version: 1,
    history: [],
  };
}

export async function listDocuments(patientId: string, patient: Patient): Promise<PatientDocument[]> {
  const data = await readAll();
  const stored = data.items.filter((item) => String(item.patientId) === String(patientId));
  const legacy = (patient.documents || []).map((document) => mapLegacyDocument(patientId, document));
  const known = new Set(stored.map((item) => item.id));
  return [...stored, ...legacy.filter((item) => !known.has(item.id))];
}

export async function getDocument(patientId: string, documentId: string, patient: Patient): Promise<PatientDocument | null> {
  const documents = await listDocuments(patientId, patient);
  return documents.find((item) => item.id === documentId) || null;
}

export async function createDocument(patientId: string, input: DocumentInput, actor?: string): Promise<PatientDocument> {
  const data = await readAll();
  const now = new Date().toISOString();
  const id = `doc-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  const document: PatientDocument = {
    id,
    patientId,
    title: input.title.trim(),
    type: input.type.trim(),
    clinicalDate: input.clinicalDate,
    createdAt: now,
    uploadedAt: now,
    updatedAt: now,
    author: input.author?.trim() || actor,
    organization: input.organization?.trim(),
    source: normalizeSource(input.source),
    status: normalizeStatus(input.status || 'needs-review'),
    encounterId: input.encounterId?.trim() || undefined,
    encounterDisplay: input.encounterDisplay?.trim() || undefined,
    content: input.content,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    storageKey: input.storageKey,
    checksum: input.checksum,
    version: 1,
    history: [{ action: 'created', actor, timestamp: now }],
  };
  data.items.push(document);
  await writeAll(data);
  await persistChartActivity(activityFromDocument(patientId, document, 'Document uploaded', actor || 'Clinician', document.status === 'needs-review'));
  return document;
}

export async function markDocumentReviewed(patientId: string, documentId: string, actor: string, patient: Patient): Promise<PatientDocument | null> {
  const data = await readAll();
  const index = data.items.findIndex((item) => item.patientId === patientId && item.id === documentId);
  if (index < 0) return null;
  const now = new Date().toISOString();
  const current = data.items[index];
  data.items[index] = {
    ...current,
    status: current.status === 'needs-review' ? 'final' : current.status,
    reviewedAt: now,
    reviewedBy: actor,
    updatedAt: now,
    history: [...(current.history || []), { action: 'reviewed', actor, timestamp: now }],
  };
  await writeAll(data);
  await persistChartActivity(activityFromDocument(patientId, data.items[index], 'Document reviewed', actor, false));
  return getDocument(patientId, documentId, patient);
}

export function normalizeDocumentStatus(value?: string) { return normalizeStatus(value); }
export function normalizeDocumentSource(value?: string) { return normalizeSource(value); }
export function documentDataPath() { return DOCUMENTS_FILE; }
export function documentStoragePath(storageKey: string) { return path.join(path.dirname(DOCUMENTS_FILE), 'document-files', storageKey); }