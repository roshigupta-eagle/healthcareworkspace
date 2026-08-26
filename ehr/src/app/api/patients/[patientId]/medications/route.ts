import { NextResponse } from 'next/server';
import { listMedications, createMedication } from '@/lib/medicationsStore';
import { getSafetyResult } from '@/lib/medicationSafetyStore';
import { getReconciliation } from '@/lib/medicationReconciliationStore';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { auth } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  try { await auth(); } catch { /* allow dev preview */ }

  const [items, safety, reconciliation] = await Promise.all([
    listMedications(patientId),
    getSafetyResult(patientId),
    getReconciliation(patientId),
  ]);
  return NextResponse.json({ items, safety, reconciliation });
}

export async function POST(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  let user: any = null;
  try { user = await auth(); } catch { /* dev */ }

  const body = await req.json();
  if (!body?.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const record = await createMedication(patientId, body, user?.user?.name || 'Clinician');
  return NextResponse.json({ item: record }, { status: 201 });
}
