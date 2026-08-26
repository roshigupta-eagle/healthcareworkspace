import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { createDocument, documentStoragePath, listDocuments, normalizeDocumentSource, normalizeDocumentStatus, type DocumentInput, type DocumentStatus } from '@/lib/documentStore';
import { canAccessTaskPatient } from '@/lib/doctorWorkStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg']);
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);

function asString(value: FormDataEntryValue | null) { return typeof value === 'string' ? value.trim() : ''; }

export async function GET(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient.' }, { status: 403 });
  const url = new URL(request.url);
  const allDocuments = await listDocuments(patientId, patient);
  const query = (url.searchParams.get('q') || '').trim().toLowerCase();
  const type = url.searchParams.get('type') || 'all';
  const status = url.searchParams.get('status') || 'all';
  const source = url.searchParams.get('source') || 'all';
  const range = url.searchParams.get('range') || 'all';
  const sort = url.searchParams.get('sort') || 'newest';
  const days = ({ '30d': 30, '90d': 90, '6m': 183, '1y': 365, '2y': 730 } as Record<string, number>)[range];
  const cutoff = days ? Date.now() - days * 86400000 : null;
  const filtered = allDocuments.filter((document) => {
    const haystack = [document.title, document.type, document.author, document.organization, document.encounterDisplay, document.clinicalDate].filter(Boolean).join(' ').toLowerCase();
    const clinicalTime = document.clinicalDate ? Date.parse(document.clinicalDate) : NaN;
    return (!query || haystack.includes(query))
      && (type === 'all' || document.type === type)
      && (status === 'all' || document.status === status)
      && (source === 'all' || document.source === source)
      && (!cutoff || (Number.isFinite(clinicalTime) && clinicalTime >= cutoff));
  });
  filtered.sort((left, right) => {
    if (sort === 'oldest') return Date.parse(left.clinicalDate || '') - Date.parse(right.clinicalDate || '');
    if (sort === 'type') return left.type.localeCompare(right.type);
    if (sort === 'author') return (left.author || left.organization || '').localeCompare(right.author || right.organization || '');
    if (sort === 'attention') return Number(right.status === 'needs-review') - Number(left.status === 'needs-review') || Date.parse(right.clinicalDate || '') - Date.parse(left.clinicalDate || '');
    if (sort === 'updated') return Date.parse(right.updatedAt || right.uploadedAt || '') - Date.parse(left.updatedAt || left.uploadedAt || '');
    return Date.parse(right.clinicalDate || '') - Date.parse(left.clinicalDate || '');
  });
  const recentCutoff = Date.now() - 30 * 86400000;
  const summary = {
    total: allDocuments.length,
    recentlyAdded: allDocuments.filter((document) => document.uploadedAt && Date.parse(document.uploadedAt) >= recentCutoff).length,
    needsReview: allDocuments.filter((document) => ['needs-review', 'awaiting-signature', 'failed'].includes(document.status)).length,
    externalImported: allDocuments.filter((document) => ['external', 'imported', 'scanned'].includes(document.source)).length,
    missingMetadata: allDocuments.filter((document) => !document.type || !document.clinicalDate || (!document.author && !document.organization)).length,
  };
  return NextResponse.json({ items: filtered, allItems: allDocuments, summary, filterOptions: { types: Array.from(new Set(allDocuments.map((item) => item.type))).sort(), sources: Array.from(new Set(allDocuments.map((item) => item.source))).sort(), statuses: Array.from(new Set(allDocuments.map((item) => item.status))).sort() } }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (!canAccessTaskPatient(patientId, access.actor!)) return NextResponse.json({ error: 'You do not have access to this patient.' }, { status: 403 });

  const form = await request.formData();
  const fileEntry = form.get('file');
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
  const title = asString(form.get('title'));
  const type = asString(form.get('type'));
  if (!title || !type) return NextResponse.json({ error: 'title and document type are required' }, { status: 400 });
  const clinicalDate = asString(form.get('clinicalDate')) || undefined;
  if (clinicalDate && Number.isNaN(Date.parse(clinicalDate))) return NextResponse.json({ error: 'clinical date is invalid' }, { status: 400 });

  let storageKey: string | undefined;
  let checksum: string | undefined;
  if (file) {
    const extension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension) || (file.type && !ALLOWED_MIME_TYPES.has(file.type))) return NextResponse.json({ error: 'unsupported document format; use PDF, PNG, or JPG' }, { status: 415 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'file exceeds the 10 MB limit' }, { status: 413 });
    const buffer = Buffer.from(await file.arrayBuffer());
    checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const existing = await listDocuments(patientId, patient);
    if (existing.some((document) => document.checksum === checksum)) return NextResponse.json({ error: 'possible duplicate document', duplicate: true }, { status: 409 });
    storageKey = `${crypto.randomUUID()}${extension}`;
    const storagePath = documentStoragePath(storageKey);
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    await fs.writeFile(storagePath, buffer);
  }

  const input: DocumentInput = {
    title,
    type,
    clinicalDate,
    author: asString(form.get('author')) || undefined,
    organization: asString(form.get('organization')) || undefined,
    source: normalizeDocumentSource(asString(form.get('source')) || (file ? 'clinician-uploaded' : 'roshi')),
    status: normalizeDocumentStatus(asString(form.get('status')) || (file ? 'needs-review' : 'draft')) as DocumentStatus,
    encounterId: asString(form.get('encounterId')) || undefined,
    encounterDisplay: asString(form.get('encounterDisplay')) || undefined,
    content: file ? undefined : asString(form.get('content')) || undefined,
    mimeType: file?.type || undefined,
    sizeBytes: file?.size,
    storageKey,
    checksum,
  };
  const document = await createDocument(patientId, input, access.actor!.name || 'Clinician');
  return NextResponse.json({ item: document }, { status: 201, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}