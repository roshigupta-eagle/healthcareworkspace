import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { generateSummaryFromPatient, getLatestSummary } from '@/lib/aiSummaryStore';
import { resolveSession } from '@/lib/serverAuth';

const CLINICAL_ROLES = new Set(['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER', 'DEV']);

async function authorized(request: Request) {
  const session = await resolveSession(request);
  if (!session?.user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const role = String(session.user.role || '').toUpperCase();
  if (role && !CLINICAL_ROLES.has(role)) return { response: NextResponse.json({ error: 'AI clinical summaries are restricted to authorized clinical staff.' }, { status: 403 }) };
  return { session };
}

export async function GET(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const access = await authorized(request);
  if (access.response) return access.response;
  const summary = await getLatestSummary(patientId);
  return summary ? NextResponse.json({ data: summary }) : NextResponse.json({ error: 'no summary' }, { status: 404 });
}

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const access = await authorized(request);
  if (access.response) return access.response;
  if (!getPatientById(patientId)) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  try {
    const summary = await generateSummaryFromPatient(patientId, access.session.user.id || access.session.user.name || 'unknown-clinician');
    return NextResponse.json({ data: summary }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'AI clinical summary generation failed.' }, { status: 500 });
  }
}