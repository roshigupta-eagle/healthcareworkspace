import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { createCareTeamMember, listCareTeam } from '@/lib/careTeamStore';

export async function GET(_request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  return NextResponse.json({ items: await listCareTeam(patientId, patient) });
}

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  let session: Awaited<ReturnType<typeof auth>> = null;
  try { session = await auth(); } catch {}
  if (!session && process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'authentication required' }, { status: 401 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const role = typeof body.role === 'string' ? body.role.trim() : '';
  if (!name || !role) return NextResponse.json({ error: 'name and role are required' }, { status: 400 });

  try {
    const member = await createCareTeamMember(patientId, {
      name,
      role,
      specialty: typeof body.specialty === 'string' ? body.specialty : undefined,
      organization: typeof body.organization === 'string' ? body.organization : undefined,
      careTeamRole: typeof body.careTeamRole === 'string' ? body.careTeamRole : undefined,
      responsibilities: Array.isArray(body.responsibilities) ? body.responsibilities.filter((value): value is string => typeof value === 'string') : undefined,
    }, session?.user?.name || 'Clinician', patient);
    return NextResponse.json({ item: member }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to add care-team member.' }, { status: 409 });
  }
}