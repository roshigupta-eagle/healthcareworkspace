import { NextResponse } from 'next/server';
import { listAllergiesRecords, createAllergy } from '@/lib/allergyStore';
import { getReviewRecord } from '@/lib/allergyReviewStore';
import { getAllergySafetyResult } from '@/lib/allergySafetyStore';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { auth } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  try { await auth(); } catch { /* allow dev preview */ }

  const [items, review, safety] = await Promise.all([
    listAllergiesRecords(patientId),
    getReviewRecord(patientId),
    getAllergySafetyResult(patientId),
  ]);
  return NextResponse.json({ items, review, safety });
}

export async function POST(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  let user: any = null;
  try { user = await auth(); } catch { /* dev */ }

  const body = await req.json();
  if (!body?.substance?.display) return NextResponse.json({ error: 'allergen name is required' }, { status: 400 });

  const record = await createAllergy(patientId, body, user?.user?.name || 'Clinician');
  return NextResponse.json({ item: record }, { status: 201 });
}
