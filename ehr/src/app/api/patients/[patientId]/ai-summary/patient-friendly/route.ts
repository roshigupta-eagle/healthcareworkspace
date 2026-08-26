import { NextResponse } from 'next/server';
import { generatePatientFriendlySummary, listVersions } from '@/lib/aiSummaryStore';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { resolveSession } from '@/lib/serverAuth';
import { logAuditEvent } from '@/lib/audit';

const CLINICAL_ROLES = new Set(['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER', 'DEV']);

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const session = await resolveSession(request);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = String(session.user.role || '').toUpperCase();
  if (role && !CLINICAL_ROLES.has(role)) return NextResponse.json({ error: 'Patient communication drafting is restricted to authorized clinical staff.' }, { status: 403 });
  if (!getPatientById(patientId)) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  let body: { versionId?: unknown } = {};
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const versionId = typeof body.versionId === 'string' ? body.versionId : (await listVersions(patientId))[0]?.versionId;
  if (!versionId) return NextResponse.json({ error: 'summary version not found' }, { status: 404 });
  try {
    const version = await generatePatientFriendlySummary(patientId, versionId, session.user.id || session.user.name || 'unknown-clinician');
    await logAuditEvent({ agentId: session.user.id || 'unknown', entityType: 'AIClinicalSummary', entityId: versionId, action: 'E', outcome: 'success', description: 'Generated patient-friendly summary draft', detail: { patientId, version: version.versionNumber } });
    return NextResponse.json({ data: version });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Patient-friendly summary generation failed.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const session = await resolveSession(request);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = String(session.user.role || '').toUpperCase();
  if (role && !CLINICAL_ROLES.has(role)) return NextResponse.json({ error: 'Patient communication editing is restricted to authorized clinical staff.' }, { status: 403 });
  let body: { versionId?: unknown; text?: unknown } = {};
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const versionId = typeof body.versionId === 'string' ? body.versionId : '';
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!versionId || !text) return NextResponse.json({ error: 'versionId and text are required' }, { status: 400 });
  try {
    const { updatePatientFriendlySummary } = await import('@/lib/aiSummaryStore');
    const version = await updatePatientFriendlySummary(patientId, versionId, text, session.user.id || session.user.name || 'unknown-clinician');
    return NextResponse.json({ data: version });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Patient-friendly summary could not be saved.' }, { status: 500 });
  }
}