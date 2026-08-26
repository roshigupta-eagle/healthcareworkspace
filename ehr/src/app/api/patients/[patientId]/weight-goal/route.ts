import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { saveGoal, listGoals, getActiveGoal } from '@/lib/weightStore';
import { validateGoal } from '@/lib/weightMath';
import { checkWeightClinicalAccess } from '@/lib/weightAccess';

export async function POST(request: Request, { params }: { params: { patientId: string } }) {
  try {
    const resolvedParams = await params;
    const access = await checkWeightClinicalAccess();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    if (!getPatientById(resolvedParams.patientId)) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
    const body = await request.json() as Record<string, unknown>;
    const goalType = typeof body.goalType === 'string' ? body.goalType : '';
    const numeric = (value: unknown) => { if (value === undefined || value === null || value === '') return undefined; const number = typeof value === 'number' ? value : Number(value); return Number.isFinite(number) ? number : undefined; };
    const targetDate = typeof body.targetDate === 'string' && body.targetDate ? new Date(body.targetDate).toISOString() : undefined;
    const active = await getActiveGoal(resolvedParams.patientId);
    const now = new Date().toISOString();
    const toSave = {
      patientId: resolvedParams.patientId,
      goalType,
      targetWeight: numeric(body.targetWeight),
      targetWeightMin: numeric(body.targetWeightMin),
      targetWeightMax: numeric(body.targetWeightMax),
      baselineWeight: numeric(body.baselineWeight),
      targetDate,
      owner: ['clinician', 'patient', 'shared'].includes(String(body.owner)) ? body.owner : 'clinician',
      status: ['active', 'proposed', 'on-hold', 'completed', 'cancelled'].includes(String(body.status)) ? body.status : 'active',
      notes: typeof body.notes === 'string' ? body.notes.trim() : undefined,
      effectiveFrom: now,
      history: [...(active?.history || []), { when: now, actor: access.session?.user?.name || 'Doctor User', action: active ? 'updated' : 'created', details: `Documented ${goalType || 'weight'} goal.` }],
    };
    const validation = validateGoal(toSave);
    if (!validation.valid) return NextResponse.json({ error: 'goal validation failed', details: validation.errors }, { status: 422 });
    const saved = await saveGoal(toSave);
    return NextResponse.json({ success: true, item: saved }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'invalid goal payload' }, { status: 400 });
  }
}

export async function GET(request: Request, { params }: { params: { patientId: string } }) {
  const resolvedParams = await params;
  const access = await checkWeightClinicalAccess();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!getPatientById(resolvedParams.patientId)) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  const goals = await listGoals(resolvedParams.patientId);
  return NextResponse.json({ items: goals });
}
