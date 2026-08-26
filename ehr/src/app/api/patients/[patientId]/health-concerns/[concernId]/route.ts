import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { getConcern, updateConcern } from '@/lib/healthConcernsStore';
import { resolveActor } from '@/lib/noteActor';

export async function GET(_req: Request, { params }: { params: { patientId: string; concernId: string } }) {
  const { patientId, concernId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const concern = await getConcern(patientId, concernId);
  if (!concern) return NextResponse.json({ error: 'concern not found' }, { status: 404 });
  return NextResponse.json(concern);
}

export async function PATCH(request: Request, { params }: { params: { patientId: string; concernId: string } }) {
  const { patientId, concernId } = await params;
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const body = await request.json().catch(() => ({} as any));
  const expectedVersion = Number(body?.version);
  if (!Number.isFinite(expectedVersion)) return NextResponse.json({ error: 'version is required for optimistic concurrency' }, { status: 400 });

  const actor = await resolveActor();
  const patch: any = {};
  if (body.clinicalStatus) patch.clinicalStatus = body.clinicalStatus;
  if (body.attentionStatus) patch.attentionStatus = body.attentionStatus;
  if (body.verification) patch.verification = body.verification;
  if (body.severity !== undefined) patch.severity = body.severity;
  if (body.onset !== undefined) patch.onset = body.onset;
  if (body.description !== undefined) patch.description = body.description;
  if (body.markReviewed) patch.lastReviewedAt = new Date().toISOString();

  const result = await updateConcern(patientId, concernId, patch, expectedVersion, actor);
  if (!result.ok) {
    if (result.conflict) {
      return NextResponse.json({ error: 'conflict', message: 'This health concern changed while you were editing.', latest: result.latest }, { status: 409 });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.concern);
}
