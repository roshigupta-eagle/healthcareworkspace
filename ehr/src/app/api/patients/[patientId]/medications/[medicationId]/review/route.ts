import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { appendChartActivity } from '@/lib/chartActivityStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { upsertPatientRecord } from '@/lib/patientRecordStore';

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string; medicationId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;

  const { patientId, medicationId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  if (!access.actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actor = access.actor.name || access.actor.id;
  const now = new Date().toISOString();

  try {
    const meds = Array.isArray(patient.medications) ? patient.medications : [];
    let med: any | undefined;

    if (medicationId && medicationId.startsWith('index:')) {
      const idx = parseInt(medicationId.replace('index:', ''), 10);
      med = meds[idx];
    } else {
      med = meds.find((m: any) => String(m.id) === medicationId || String(m.name) === decodeURIComponent(medicationId));
    }

    if (med) {
      med.reviewed = true;
      med.reviewedBy = actor;
      med.reviewedAt = now;
    }

    patient.dataUpdatedAt = now;
    await upsertPatientRecord(patient);
  } catch (err) {
    console.error('Failed to persist medication review', err);
    return NextResponse.json({ error: 'failed to persist review' }, { status: 500 });
  }

  try {
    await appendChartActivity({
      id: `medrev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
      patientId,
      action: 'Medication reviewed',
      user: actor,
      date: now,
      resourceType: 'Medication',
      sourceRecordId: medicationId,
      sourceRecordType: 'Medication',
      sourceRecordDisplay: `Reviewed medication ${medicationId}`,
    });
  } catch (e) {
    console.error('appendChartActivity failed', e);
  }

  return NextResponse.json({ ok: true, reviewedBy: actor, reviewedAt: now }, { status: 200 });
}
