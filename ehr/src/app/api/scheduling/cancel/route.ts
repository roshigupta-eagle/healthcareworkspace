import { NextResponse } from 'next/server';
import { cancelAppointment } from '@/scheduling/services/scheduling.mock';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { appointmentId } = body || {};
    if (!appointmentId) return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 });
    const ok = await cancelAppointment(appointmentId);
    return NextResponse.json({ success: ok });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('cancel appointment error', err);
    return NextResponse.json({ error: 'failed to cancel' }, { status: 500 });
  }
}
