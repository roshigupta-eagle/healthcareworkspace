import { NextResponse } from 'next/server';
import { listCareGaps } from '@/lib/careGapStore';
import { auth } from '@/lib/auth';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const patientId = url.searchParams.get('patientId') || undefined;
  if (!patientId) return NextResponse.json({ error: 'missing patientId' }, { status: 400 });

  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  try { await auth(); } catch (e) { /* dev: allow unauth view when auth not configured */ }

  const status = url.searchParams.get('status') || undefined;
  const category = url.searchParams.get('category') || undefined;
  const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined;

  const result = await listCareGaps(patientId, { status, category, limit });
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  return NextResponse.json({ error: 'not implemented' }, { status: 501 });
}
