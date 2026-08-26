import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { createDocument, documentStoragePath, listDocuments, normalizeDocumentSource, normalizeDocumentStatus, type DocumentInput, type DocumentStatus } from '@/lib/documentStore';
import { getDoctorWorkSnapshot } from '@/lib/doctorWorkStore';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg']);
const MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);

function formValue(value: FormDataEntryValue | null) { return typeof value === 'string' ? value.trim() : ''; }

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const actor = access.actor!;
  const snapshot = await getDoctorWorkSnapshot(actor.id, actor.name, actor.role);
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim().toLowerCase();
  const tab = url.searchParams.get('tab') || 'needs-review';
  const sort = url.searchParams.get('sort') || 'newest';
  const items = snapshot.documents.items.filter((item) => {
    const haystack = [item.patient.name, item.patient.mrn, item.title, item.type, item.source, item.author, item.organization].filter(Boolean).join(' ').toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (tab === 'needs-review') return item.reviewStatus === 'needs-review';
    if (tab === 'recent') return Boolean(item.addedAt && Date.parse(item.addedAt) >= Date.now() - 30 * 86400000);
    if (tab === 'external') return ['external', 'imported', 'scanned'].includes(item.source.toLowerCase());
    return true;
  }).sort((left, right) => sort === 'oldest' ? Date.parse(left.clinicalDate || '') - Date.parse(right.clinicalDate || '') : Date.parse(right.clinicalDate || '') - Date.parse(left.clinicalDate || ''));
  return NextResponse.json({ data: items, counts: snapshot.documents.counts }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function POST(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const actor = access.actor!;
  const form = await request.formData();
  const patientId = formValue(form.get('patientId'));
  const patient = getPatientById(patientId);
  const title = formValue(form.get('title'));
  const type = formValue(form.get('type'));
  if (!patient || !title || !type) return NextResponse.json({ error: 'Patient, title, and document type are required.' }, { status: 400 });
  const clinicalDate = formValue(form.get('clinicalDate')) || undefined;
  if (clinicalDate && Number.isNaN(Date.parse(clinicalDate))) return NextResponse.json({ error: 'Clinical date is invalid.' }, { status: 400 });
  const file = form.get('file');
  let storageKey: string | undefined;
  let checksum: string | undefined;
  if (file instanceof File && file.size > 0) {
    const extension = path.extname(file.name).toLowerCase();
    if (!EXTENSIONS.has(extension) || (file.type && !MIME_TYPES.has(file.type))) return NextResponse.json({ error: 'Unsupported document format.' }, { status: 415 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'Document exceeds the 10 MB limit.' }, { status: 413 });
    const bytes = Buffer.from(await file.arrayBuffer());
    checksum = crypto.createHash('sha256').update(bytes).digest('hex');
    const existing = await listDocuments(patientId, patient);
    if (existing.some((document) => document.checksum === checksum)) return NextResponse.json({ error: 'Possible duplicate document.', duplicate: true }, { status: 409 });
    storageKey = `${crypto.randomUUID()}${extension}`;
    const target = documentStoragePath(storageKey);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
  }
  const input: DocumentInput = { title, type, clinicalDate, author: formValue(form.get('author')) || actor.name, organization: formValue(form.get('organization')) || undefined, source: normalizeDocumentSource(formValue(form.get('source')) || (file instanceof File ? 'clinician-uploaded' : 'roshi')), status: normalizeDocumentStatus(formValue(form.get('status')) || (file instanceof File ? 'needs-review' : 'draft')) as DocumentStatus, content: file instanceof File ? undefined : formValue(form.get('content')) || undefined, mimeType: file instanceof File ? file.type : undefined, sizeBytes: file instanceof File ? file.size : undefined, storageKey, checksum };
  const document = await createDocument(patientId, input, actor.name);
  await logAuditEvent({ agentId: actor.id, entityType: 'DocumentReference', entityId: document.id, action: 'C', outcome: 'success', description: 'Uploaded global doctor workspace document', detail: { patientId, type: document.type, source: document.source } });
  return NextResponse.json({ data: document }, { status: 201 });
}
