import { NextResponse } from 'next/server';
import { fetchAppointments } from '@/scheduling/services/scheduling.mock';

export async function GET() {
  try {
    const appts = await fetchAppointments();
    return NextResponse.json(appts);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('scheduling appointments fetch error', err);
    return NextResponse.json({ error: 'failed to fetch appointments' }, { status: 500 });
  }
}
