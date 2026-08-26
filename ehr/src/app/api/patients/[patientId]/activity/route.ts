import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { buildChartActivity, type ActivitySort, type ChartActivityFilters } from '@/lib/chartActivity';
import { listStoredChartActivity } from '@/lib/chartActivityStore';

export async function GET(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  const url = new URL(request.url);
  const requestedSort = url.searchParams.get('sort');
  const filters: ChartActivityFilters = {
    query: url.searchParams.get('q') || undefined,
    category: url.searchParams.get('category') || undefined,
    actor: url.searchParams.get('actor') || undefined,
    range: url.searchParams.get('range') || 'all',
    sinceLastVisit: url.searchParams.get('sinceLastVisit') === 'true',
    sort: (['newest', 'oldest', 'updated', 'category', 'actor', 'actionable'].includes(requestedSort || '') ? requestedSort : 'newest') as ActivitySort,
  };
  const model = buildChartActivity(patientId, patient, await listStoredChartActivity(patientId), filters);
  return NextResponse.json(model);
}