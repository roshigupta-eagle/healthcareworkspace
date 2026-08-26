import { NextResponse } from 'next/server';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { listMeasurements, getActiveGoal, listClinicalEvents } from '@/lib/weightStore';
import { computeAchievements } from '@/lib/weightAchievements';
import { checkWeightClinicalAccess } from '@/lib/weightAccess';

export async function GET(request: Request, { params }: { params: { patientId: string } }) {
  const resolvedParams = await params;
  const { patientId } = resolvedParams;
  const access = await checkWeightClinicalAccess();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!getPatientById(patientId)) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  const url = new URL(request.url);
  const from = url.searchParams.get('from') || undefined;
  const to = url.searchParams.get('to') || undefined;
  const data = await listMeasurements(patientId, { from, to, limit: 2000 });
  const allData = from || to ? await listMeasurements(patientId, { limit: 2000 }) : data;
  const goal = await getActiveGoal(patientId).catch(() => null);
  const allEvents = await listClinicalEvents(patientId).catch(() => []);
  const fromTime = from ? Date.parse(from) : -Infinity;
  const toTime = to ? Date.parse(to) : Infinity;
  const events = allEvents.filter((event) => {
    const time = Date.parse(event.date);
    return Number.isFinite(time) && time >= fromTime && time <= toTime;
  });
  const validCount = allData.items.filter((item) => (item.status === 'final' || item.status === 'corrected' || !item.status) && !item.enteredInError && !item.replacedByMeasurementId).length;
  return NextResponse.json({
    items: data.items,
    goal,
    clinicalEvents: events,
    achievements: computeAchievements(allData.items, goal),
    measurementPolicy: { validStatuses: ['final', 'corrected'], provisionalStatuses: ['preliminary'], excludedStatuses: ['entered-in-error'], totalCount: allData.items.length, validCount },
    selectedRange: { from: from || null, to: to || null },
  });
}
