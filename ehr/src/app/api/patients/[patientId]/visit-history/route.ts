import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { buildVisitHistory, type VisitHistoryFilters } from '@/lib/visitHistory';

export async function GET(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const url = new URL(request.url);
  const sort = url.searchParams.get('sort');
  const filters: VisitHistoryFilters = {
    query: url.searchParams.get('q') || undefined,
    type: url.searchParams.get('type') || undefined,
    provider: url.searchParams.get('provider') || undefined,
    status: url.searchParams.get('status') || undefined,
    range: url.searchParams.get('range') || 'all',
    sort: sort === 'oldest' || sort === 'provider' || sort === 'type' || sort === 'updated' ? sort : 'newest',
  };

  return NextResponse.json(buildVisitHistory(patientId, patient, filters));
}