import { NextResponse } from 'next/server';
import { getMedication, updateMedication } from '@/lib/medicationsStore';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { auth } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ patientId: string; medicationId: string }> }) {
  const { patientId, medicationId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  try { await auth(); } catch { /* allow dev preview */ }

  const item = await getMedication(patientId, medicationId);
  if (!item) return NextResponse.json({ error: 'medication not found' }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ patientId: string; medicationId: string }> }) {
  const { patientId, medicationId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  let user: any = null;
  try { user = await auth(); } catch { /* dev */ }

  const body = await req.json();
  const action = typeof body.action === 'string' ? body.action : 'updated';
  const detail = typeof body.detail === 'string' ? body.detail : undefined;
  const { action: _action, detail: _detail, ...patch } = body;

  const updated = await updateMedication(patientId, medicationId, patch, user?.user?.name || 'Clinician', action, detail);
  if (!updated) return NextResponse.json({ error: 'medication not found' }, { status: 404 });
  return NextResponse.json({ item: updated });
}
