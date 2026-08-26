import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { detectOutlierIds, toKg } from '@/lib/weightMath';
import { listMeasurements, saveMeasurement } from '@/lib/weightStore';
import { checkWeightClinicalAccess } from '@/lib/weightAccess';

export async function POST(request: Request, { params }: { params: { patientId: string } }) {
  const resolvedParams = await params;
  const { patientId } = resolvedParams;
  const access = await checkWeightClinicalAccess();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const value = typeof body.value === 'number' ? body.value : Number(body.value);
    const unit = typeof body.unit === 'string' ? body.unit.toLowerCase() : '';
    const occurredAt = typeof body.occurredAt === 'string' ? body.occurredAt : '';
    const source = typeof body.source === 'string' ? body.source.toLowerCase() : 'clinic';
    const status = typeof body.status === 'string' ? body.status.toLowerCase() : 'final';
    if (!Number.isFinite(value) || value <= 0) return NextResponse.json({ error: 'weight must be greater than 0' }, { status: 400 });
    if (unit !== 'kg' && unit !== 'lb') return NextResponse.json({ error: 'unit must be kg or lb' }, { status: 400 });
    if (!['clinic', 'patient-reported', 'device', 'imported'].includes(source)) return NextResponse.json({ error: 'source is invalid' }, { status: 400 });
    if (status !== 'final' && status !== 'preliminary') return NextResponse.json({ error: 'new measurements must be final or preliminary' }, { status: 400 });
    const parsedDate = new Date(occurredAt);
    if (!occurredAt || Number.isNaN(parsedDate.getTime())) return NextResponse.json({ error: 'occurredAt is invalid' }, { status: 400 });
    if (parsedDate.getTime() > Date.now() + 5 * 60 * 1000) return NextResponse.json({ error: 'future measurement times are not allowed' }, { status: 400 });
    const encounterId = typeof body.encounterId === 'string' && body.encounterId.trim() ? body.encounterId.trim() : undefined;
    if (encounterId && ![...(patient.upcoming || []).map((item) => item.id), ...(patient.history || []).map((item) => item.id)].includes(encounterId)) return NextResponse.json({ error: 'encounter is unavailable for this patient' }, { status: 403 });
    const existing = await listMeasurements(patientId, { limit: 2000 });
    const valueKg = toKg(value, unit);
    if (!Number.isFinite(valueKg) || valueKg > 500) return NextResponse.json({ error: 'weight must be no more than 500 kg equivalent' }, { status: 400 });
    const duplicate = existing.items.find((item) => !item.enteredInError && Math.abs(toKg(item.value, item.unit) - valueKg) < 0.2 && new Date(item.occurredAt).toDateString() === parsedDate.toDateString());
    if (duplicate) return NextResponse.json({ error: 'similar measurement already exists', duplicate }, { status: 409 });
    const id = `w${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
    const candidate = { id, patientId, value, unit, occurredAt: parsedDate.toISOString(), source, status, encounterId, method: typeof body.method === 'string' ? body.method.trim() : undefined, note: typeof body.note === 'string' ? body.note.trim() : undefined, recorder: { id: access.session?.user?.id || 'dev-doctor', name: access.session?.user?.name || 'Doctor User' }, sourceResource: { resourceType: 'Observation', code: '29463-7', display: 'Body weight' } };
    const outlierIds = detectOutlierIds([...existing.items, candidate]);
    const record = outlierIds.has(id) ? { ...candidate, dataQuality: { state: 'review' as const, reason: 'This measurement differs substantially from surrounding documented measurements.', source: 'Roshi data-quality review' } } : candidate;
    const saved = await saveMeasurement(record);
    return NextResponse.json({ success: true, item: saved }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'invalid measurement payload' }, { status: 400 });
  }
}
