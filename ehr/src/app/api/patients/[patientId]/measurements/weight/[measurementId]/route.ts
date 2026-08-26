import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { checkWeightClinicalAccess } from '@/lib/weightAccess';
import { correctMeasurement, updateMeasurement, getMeasurement } from '@/lib/weightStore';

export async function PATCH(request: Request, { params }: { params: { patientId: string; measurementId: string } }) {
  try {
    const resolvedParams = await params;
    const access = await checkWeightClinicalAccess();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const patient = getPatientById(resolvedParams.patientId);
    if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
    const body = await request.json() as Record<string, unknown>;
    const existing = await getMeasurement(resolvedParams.measurementId, resolvedParams.patientId);
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (typeof body.version === 'number' && body.version !== existing.version) return NextResponse.json({ error: 'measurement changed; reload before saving' }, { status: 409 });
    if (existing.status === 'entered-in-error') return NextResponse.json({ error: 'entered-in-error measurements cannot be changed' }, { status: 409 });

    if (body.enteredInError === true || body.status === 'entered-in-error') {
      if (existing.status === 'entered-in-error') return NextResponse.json({ error: 'measurement is already entered in error' }, { status: 409 });
      const reason = typeof body.enteredInErrorReason === 'string' ? body.enteredInErrorReason.trim() : '';
      if (!reason) return NextResponse.json({ error: 'a reason is required to mark a measurement entered in error' }, { status: 400 });
      const updated = await updateMeasurement(resolvedParams.measurementId, { enteredInError: true, status: 'entered-in-error', enteredInErrorReason: reason }, resolvedParams.patientId);
      return NextResponse.json({ success: true, item: updated });
    }

    const patch: Record<string, unknown> = {};
    if (body.value !== undefined) {
      const value = typeof body.value === 'number' ? body.value : Number(body.value);
      if (!Number.isFinite(value) || value <= 0) return NextResponse.json({ error: 'weight must be greater than 0' }, { status: 400 });
      patch.value = value;
    }
    if (body.unit !== undefined) {
      const unit = typeof body.unit === 'string' ? body.unit.toLowerCase() : '';
      if (unit !== 'kg' && unit !== 'lb') return NextResponse.json({ error: 'unit must be kg or lb' }, { status: 400 });
      patch.unit = unit;
    }
    if (body.occurredAt !== undefined) {
      const occurredAt = typeof body.occurredAt === 'string' ? body.occurredAt : '';
      const parsedDate = new Date(occurredAt);
      if (!occurredAt || Number.isNaN(parsedDate.getTime())) return NextResponse.json({ error: 'occurredAt is invalid' }, { status: 400 });
      if (parsedDate.getTime() > Date.now() + 5 * 60 * 1000) return NextResponse.json({ error: 'future measurement times are not allowed' }, { status: 400 });
      patch.occurredAt = parsedDate.toISOString();
    }
    if (body.correction !== undefined) {
      if (existing.replacedByMeasurementId) return NextResponse.json({ error: 'this measurement has already been superseded by a correction' }, { status: 409 });
      if (!body.correction || typeof body.correction !== 'object') return NextResponse.json({ error: 'correction details are invalid' }, { status: 400 });
      const correctionBody = body.correction as Record<string, unknown>;
      const reason = typeof correctionBody.reason === 'string' ? correctionBody.reason.trim() : '';
      if (!reason) return NextResponse.json({ error: 'a correction reason is required' }, { status: 400 });
      patch.correction = { correctedAt: new Date().toISOString(), previousValue: existing.value, previousUnit: existing.unit, reason, correctedBy: access.session?.user?.name || 'Doctor User' };
    }
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'no supported changes supplied' }, { status: 400 });
    if (body.value !== undefined || body.unit !== undefined || body.occurredAt !== undefined) {
      if (body.correction === undefined) return NextResponse.json({ error: 'value, unit, and time changes require a correction reason' }, { status: 400 });
    }
    const finalValue = Number(patch.value ?? existing.value);
    const finalUnit = String(patch.unit ?? existing.unit);
    if (toKg(finalValue, finalUnit) > 500) return NextResponse.json({ error: 'weight must be no more than 500 kg equivalent' }, { status: 400 });
    const corrected = await correctMeasurement(resolvedParams.measurementId, patch, resolvedParams.patientId);
    if (!corrected) return NextResponse.json({ error: 'correction could not be saved' }, { status: 409 });
    return NextResponse.json({ success: true, item: corrected.corrected, original: corrected.original });
  } catch {
    return NextResponse.json({ error: 'invalid measurement update' }, { status: 400 });
  }
}
