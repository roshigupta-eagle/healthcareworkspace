import { NextResponse } from 'next/server';
import { getReviewRecord, recordAllergyReview, type NkaStatus } from '@/lib/allergyReviewStore';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { auth } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  try { await auth(); } catch { /* allow dev preview */ }

  const item = await getReviewRecord(patientId);
  return NextResponse.json({ item });
}

export async function POST(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  let user: any = null;
  try { user = await auth(); } catch { /* dev */ }

  const body = await req.json();
  const nkaStatus: NkaStatus = body.nkaStatus || 'not-documented';
  const patientReportedStatus = body.patientReportedStatus || 'No new allergies reported';
  const note = body.note;

  const record = await recordAllergyReview(patientId, user?.user?.name || 'Clinician', nkaStatus, patientReportedStatus, note);
  return NextResponse.json({ item: record });
}
