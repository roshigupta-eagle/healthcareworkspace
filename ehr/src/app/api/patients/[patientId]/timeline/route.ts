import { NextResponse } from 'next/server';
import { listEvents, getEvent, mapEventToFhir } from '@/lib/timelineStore';
import { auth } from '@/lib/auth';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

export async function GET(req: Request, { params }: { params: { patientId: string } }) {
  const { patientId } = params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  // optional auth
  try { await auth(); } catch (e) { /* allow dev preview */ }

  const url = new URL(req.url);
  const q = url.searchParams.get('q') || undefined;
  const types = url.searchParams.get('types') ? url.searchParams.get('types')!.split(',') : undefined;
  const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined;
  const cursor = url.searchParams.get('cursor') || undefined;

  const result = await listEvents(patientId, { types, q, limit, cursor });
  return NextResponse.json(result);
}

export async function POST(req: Request, { params }: { params: { patientId: string } }) {
  return NextResponse.json({ error: 'not implemented' }, { status: 501 });
}

