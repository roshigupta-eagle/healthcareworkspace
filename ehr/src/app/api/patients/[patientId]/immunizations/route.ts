import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import {
  createImmunization,
  listImmunizations,
  mapLegacyImmunization,
  normalizeImmunizationStatus,
} from '@/lib/immunizationStore';

type RouteContext = { params: Promise<{ patientId: string }> };

function mergePatientHistory(patientId: string, stored: Awaited<ReturnType<typeof listImmunizations>>, patient: ReturnType<typeof getPatientById>) {
  const legacy = (patient?.immunizations || []).map((item, index) => mapLegacyImmunization(patientId, item, index));
  const records = [...stored];
  const knownIds = new Set(records.map((item) => item.id));
  legacy.forEach((item) => {
    if (!knownIds.has(item.id)) records.push(item);
  });
  return records.sort((left, right) => Date.parse(right.date || '') - Date.parse(left.date || ''));
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  const stored = await listImmunizations(patientId);
  return NextResponse.json({ items: mergePatientHistory(patientId, stored, patient) });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { patientId } = await params;
  const patient = getPatientById(String(patientId));
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  let session: Awaited<ReturnType<typeof auth>> = null;
  try {
    session = await auth();
  } catch {}
  if (!session && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'vaccine name is required' }, { status: 400 });

  const date = typeof body.date === 'string' && body.date ? body.date : undefined;
  const nextReview = typeof body.nextReview === 'string' && body.nextReview ? body.nextReview : undefined;
  if (date && Number.isNaN(Date.parse(date))) return NextResponse.json({ error: 'administration date is invalid' }, { status: 400 });
  if (nextReview && Number.isNaN(Date.parse(nextReview))) return NextResponse.json({ error: 'review date is invalid' }, { status: 400 });

  const record = await createImmunization(
    patientId,
    {
      name,
      date,
      nextReview,
      status: normalizeImmunizationStatus(typeof body.status === 'string' ? body.status : 'completed'),
      lotNumber: typeof body.lotNumber === 'string' ? body.lotNumber.trim() || undefined : undefined,
      manufacturer: typeof body.manufacturer === 'string' ? body.manufacturer.trim() || undefined : undefined,
      site: typeof body.site === 'string' ? body.site.trim() || undefined : undefined,
      route: typeof body.route === 'string' ? body.route.trim() || undefined : undefined,
      provider: typeof body.provider === 'string' ? body.provider.trim() || undefined : undefined,
      notes: typeof body.notes === 'string' ? body.notes.trim() || undefined : undefined,
    },
    session?.user?.name || 'Clinician',
  );

  return NextResponse.json({ item: record }, { status: 201 });
}