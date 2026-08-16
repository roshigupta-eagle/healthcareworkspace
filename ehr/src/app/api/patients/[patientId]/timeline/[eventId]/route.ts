import { NextResponse } from 'next/server';
import { getEvent, mapEventToFhir } from '@/lib/timelineStore';
import { auth } from '@/lib/auth';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

export async function GET(req: Request, { params }: { params: { patientId: string; eventId: string } }) {
  const { patientId, eventId } = params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  try { await auth(); } catch (e) { }

  const ev = await getEvent(patientId, eventId);
  if (!ev) return NextResponse.json({ error: 'event not found' }, { status: 404 });
  return NextResponse.json(ev);
}

export async function PATCH(req: Request, { params }: { params: { patientId: string; eventId: string } }) {
  return NextResponse.json({ error: 'not implemented' }, { status: 501 });
}

