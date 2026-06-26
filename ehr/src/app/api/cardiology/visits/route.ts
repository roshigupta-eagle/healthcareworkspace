import { NextResponse } from 'next/server';
import { mockVisits } from '@/cardiology/services/api.mock';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    return NextResponse.json(mockVisits);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('visits fetch error', err);
    return NextResponse.json({ error: 'failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patientName, patientDOB, mrn, chiefComplaint, priority } = body || {};

    if (!patientName) {
      return NextResponse.json({ error: 'patientName is required' }, { status: 400 });
    }

    const id = `visit-${randomUUID()}`;
    const now = new Date().toISOString();

    const newVisit = {
      id,
      tenantId: 'default',
      patientId: `patient-${randomUUID()}`,
      patientName,
      patientDOB: patientDOB || undefined,
      mrn: mrn || undefined,
      chiefComplaint: chiefComplaint || undefined,
      currentState: undefined,
      priority: priority || undefined,
      arrivedAt: now,
      stateEnteredAt: now,
      isNewPatient: false,
    };

    // Add to the front of the in-memory list for immediate visibility
    mockVisits.unshift(newVisit as any);

    return NextResponse.json(newVisit, { status: 201 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('create visit error', err);
    return NextResponse.json({ error: 'failed to create visit' }, { status: 500 });
  }
}
