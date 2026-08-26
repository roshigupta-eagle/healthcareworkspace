import { NextResponse } from 'next/server';
import { mapSummaryToFhir } from '@/lib/aiSummaryStore';
import { resolveSession } from '@/lib/serverAuth';

export async function GET(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const session = await resolveSession(req);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = String(session.user.role || '').toUpperCase();
  if (role && !new Set(['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER', 'DEV']).has(role)) return NextResponse.json({ error: 'FHIR preview is restricted to authorized clinical staff.' }, { status: 403 });
  try {
    const url = new URL(req.url);
    const versionId = url.searchParams.get('versionId') || undefined;
    const bundle = await mapSummaryToFhir(patientId, versionId);
    return NextResponse.json({ data: bundle });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

