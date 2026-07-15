import { NextResponse } from 'next/server';
import { rescheduleAppointment } from '@/scheduling/services/scheduling.mock';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { appointmentId, newSlotId } = body || {};
    if (!appointmentId || !newSlotId) return NextResponse.json({ error: 'appointmentId and newSlotId are required' }, { status: 400 });
    const res = await rescheduleAppointment(appointmentId, newSlotId);
    if (res.success) return NextResponse.json(res);
    return NextResponse.json(res, { status: 400 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('reschedule error', err);
    return NextResponse.json({ error: 'failed to reschedule' }, { status: 500 });
  }
}
