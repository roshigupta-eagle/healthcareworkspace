import { NextResponse } from 'next/server';
import { retrySafetyCheck } from '@/lib/allergySafetyStore';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { auth } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  try { await auth(); } catch { /* dev */ }

  const result = await retrySafetyCheck(patientId);
  return NextResponse.json({ safety: result });
}
