import { NextResponse } from 'next/server';
import { getReconciliation, recordReconciliation } from '@/lib/medicationReconciliationStore';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { auth } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  try { await auth(); } catch { /* allow dev preview */ }

  const item = await getReconciliation(patientId);
  return NextResponse.json({ item });
}

export async function POST(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  let user: any = null;
  try { user = await auth(); } catch { /* dev */ }

  const body = await req.json();
  const summary = {
    confirmed: Number(body?.confirmed) || 0,
    updated: Number(body?.updated) || 0,
    stopped: Number(body?.stopped) || 0,
    unresolved: Number(body?.unresolved) || 0,
  };

  const record = await recordReconciliation(patientId, user?.user?.name || 'Clinician', summary);
  return NextResponse.json({ item: record });
}
