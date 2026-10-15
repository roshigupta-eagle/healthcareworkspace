import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { documentStoragePath, getDocument } from '@/lib/documentStore';
import { canAccessTaskPatient } from '@/lib/doctorWorkStore';

export async function GET(_request: Request, { params }: { params: Promise<{ patientId: string; documentId: string }> }) {
  const { patientId, documentId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  let session: Awaited<ReturnType<typeof auth>> = null;
  try { session = await auth(); } catch {}
  if (!session && process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  if (session?.user && !canAccessTaskPatient(patientId, { id: session.user.id || '', name: session.user.name || '', role: session.user.role || '' })) return NextResponse.json({ error: 'You do not have access to this patient.' }, { status: 403 });
  const document = await getDocument(patientId, documentId, patient);
  if (!document?.storageKey) return NextResponse.json({ error: 'secure file content is unavailable' }, { status: 404 });
  try {
    const content = await fs.readFile(documentStoragePath(document.storageKey));
    return new NextResponse(content, { headers: { 'Content-Type': document.mimeType || 'application/octet-stream', 'Content-Disposition': `inline; filename="${document.title.replace(/[^a-zA-Z0-9._-]+/g, '_')}"`, 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'document content is unavailable' }, { status: 404 });
  }
}