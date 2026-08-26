import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { documentStoragePath, getDocument } from '@/lib/documentStore';

export async function GET(_request: Request, { params }: { params: Promise<{ patientId: string; documentId: string }> }) {
  const { patientId, documentId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  let session: Awaited<ReturnType<typeof auth>> = null;
  try { session = await auth(); } catch {}
  if (!session && process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  const document = await getDocument(patientId, documentId, patient);
  if (!document?.storageKey) return NextResponse.json({ error: 'secure file content is unavailable' }, { status: 404 });
  try {
    const content = await fs.readFile(documentStoragePath(document.storageKey));
    return new NextResponse(content, { headers: { 'Content-Type': document.mimeType || 'application/octet-stream', 'Content-Disposition': `inline; filename="${document.title.replace(/[^a-zA-Z0-9._-]+/g, '_')}"`, 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'document content is unavailable' }, { status: 404 });
  }
}