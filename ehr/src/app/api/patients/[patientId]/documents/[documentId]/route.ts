import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { getDocument, markDocumentReviewed } from '@/lib/documentStore';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function PATCH(request: Request, { params }: { params: Promise<{ patientId: string; documentId: string }> }) {
  const { patientId, documentId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const actor = access.actor!;
  const body = await request.json().catch(() => ({}));
  if (body.action !== 'review') return NextResponse.json({ error: 'unsupported document action' }, { status: 400 });
  const document = await markDocumentReviewed(patientId, documentId, actor.name, patient);
  if (!document) return NextResponse.json({ error: 'document not found or is not mutable' }, { status: 404 });
  await logAuditEvent({ agentId: actor.id, entityType: 'DocumentReference', entityId: documentId, action: 'U', outcome: 'success', description: 'Marked document reviewed', detail: { patientId } });
  return NextResponse.json({ item: document });
}

export async function GET(_request: Request, { params }: { params: Promise<{ patientId: string; documentId: string }> }) {
  const { patientId, documentId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  const access = await resolveDoctorWorkspaceActor(_request);
  if (access.response) return access.response;
  const document = await getDocument(patientId, documentId, patient);
  if (!document) return NextResponse.json({ error: 'document not found' }, { status: 404 });
  return NextResponse.json({ item: document });
}