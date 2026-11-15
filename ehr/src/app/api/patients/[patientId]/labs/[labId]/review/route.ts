import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { appendChartActivity } from '@/lib/chartActivityStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { upsertPatientRecord } from '@/lib/patientRecordStore';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string; labId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;

  const { patientId, labId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  if (!access.actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actorId = access.actor.id || 'unknown';
  const actorName = access.actor.name || actorId;
  const now = new Date().toISOString();

  const lab = (patient.labResults || []).find((candidate) => candidate.id === labId);
  if (!lab) return NextResponse.json({ error: 'Laboratory result not found for this patient.' }, { status: 404 });

  // Mark the canonical result as reviewed. Interpretation and report status remain unchanged.
  try {
    lab.reviewed = true;
    Object.assign(lab, { reviewedBy: actorName, reviewedAt: now });
    patient.dataUpdatedAt = now;

    await upsertPatientRecord(patient);
  } catch (err) {
    console.error('Failed to persist lab review', err);
    return NextResponse.json({ error: 'failed to persist review', ...(process.env.NODE_ENV !== 'production' && err instanceof Error ? { detail: err.message } : {}) }, { status: 500 });
  }

  try {
    await appendChartActivity({
      id: `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
      patientId,
      action: 'Result reviewed',
      user: actorName,
      date: now,
      resourceType: 'Result',
      sourceRecordId: labId,
      sourceRecordType: 'Laboratory Result',
      sourceRecordDisplay: `Reviewed lab ${labId}`,
    });
  } catch (e) {
    // ignore logging failures but return success since persistence succeeded
    console.error('appendChartActivity failed', e);
  }

  // record an audit event (dev-safe: `logAuditEvent` is a no-op in dev unless ENABLE_AUDIT=true)
  void logAuditEvent({ agentId: actorId, entityType: 'Observation', entityId: labId, action: 'U', outcome: 'success', description: `Reviewed lab ${labId} for patient ${patientId}`, detail: { patientId, reviewedBy: actorName, reviewedAt: now } });

  return NextResponse.json({ ok: true, reviewedBy: { id: actorId, name: actorName, role: access.actor.role }, reviewedAt: now }, { status: 200 });
}
