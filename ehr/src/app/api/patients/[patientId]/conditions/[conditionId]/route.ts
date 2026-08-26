import { NextResponse } from 'next/server';
import { getCondition, updateCondition } from '@/lib/conditionsStore';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { auth } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ patientId: string; conditionId: string }> }) {
  const { patientId, conditionId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  try { await auth(); } catch { /* allow dev preview */ }

  const item = await getCondition(patientId, conditionId);
  if (!item) return NextResponse.json({ error: 'condition not found' }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ patientId: string; conditionId: string }> }) {
  const { patientId, conditionId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  let user: any = null;
  try { user = await auth(); } catch { /* dev */ }

  const body = await req.json();
  const action = typeof body.action === 'string' ? body.action : 'updated';
  const { action: _action, ...patch } = body;

  const updated = await updateCondition(patientId, conditionId, patch, user?.user?.name || 'Clinician', action);
  if (!updated) return NextResponse.json({ error: 'condition not found' }, { status: 404 });
  return NextResponse.json({ item: updated });
}
