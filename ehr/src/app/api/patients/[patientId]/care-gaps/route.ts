import { NextResponse } from 'next/server';
import { listCareGaps } from '@/lib/careGapStore';
import { auth } from '@/lib/auth';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

export async function GET(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  try { await auth(); } catch (e) { /* allow dev preview */ }

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const category = url.searchParams.get('category') || undefined;
  const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined;

  const result = await listCareGaps(patientId, { status, category, limit });
  return NextResponse.json(result);
}

export async function POST(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  await params;
  return NextResponse.json({ error: 'not implemented' }, { status: 501 });
}
