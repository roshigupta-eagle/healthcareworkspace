import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDoctorViewSnapshot } from '@/lib/doctorView';

export const dynamic = 'force-dynamic';

const CLINICAL_ROLES = new Set(['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER']);

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user && process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  const user = session?.user as { id?: string; name?: string; role?: string; tenant?: string } | undefined;
  const role = String(user?.role || 'DOCTOR').toUpperCase();
  if (session?.user && !CLINICAL_ROLES.has(role)) return NextResponse.json({ error: 'Doctor View is restricted to authorized clinical staff' }, { status: 403 });
  const snapshot = await getDoctorViewSnapshot({
    actorId: user?.id || 'dev-doctor',
    actorName: user?.name || 'Doctor User',
    actorRole: role,
    clinic: process.env.DOCTOR_VIEW_CLINIC,
    specialty: process.env.DOCTOR_VIEW_SPECIALTY,
    timeZone: process.env.DOCTOR_VIEW_TIME_ZONE,
  });
  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
