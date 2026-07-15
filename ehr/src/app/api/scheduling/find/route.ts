import { NextResponse } from 'next/server';
import { findAvailableSlots } from '@/scheduling/services/scheduling.mock';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams;
    const filter: any = {};
    if (q.get('practitionerId')) filter.practitionerId = q.get('practitionerId');
    if (q.get('locationId')) filter.locationId = q.get('locationId');
    if (q.get('serviceType')) filter.serviceType = q.get('serviceType');
    if (q.get('from')) filter.from = q.get('from');
    if (q.get('to')) filter.to = q.get('to');
    if (q.get('durationMinutes')) filter.durationMinutes = parseInt(q.get('durationMinutes') || '0', 10);
    if (q.get('includeTentative')) filter.includeTentative = q.get('includeTentative') === '1' || q.get('includeTentative') === 'true';

    const slots = await findAvailableSlots(filter);
    return NextResponse.json(slots);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('find slots error', err);
    return NextResponse.json({ error: 'failed to find slots' }, { status: 500 });
  }
}
