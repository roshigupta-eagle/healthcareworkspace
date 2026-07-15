import { NextResponse } from 'next/server';
import { bookAppointment } from '@/scheduling/services/scheduling.mock';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await bookAppointment(body);
    if (res.success) return NextResponse.json(res, { status: 201 });
    return NextResponse.json(res, { status: 400 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('booking error', err);
    return NextResponse.json({ error: 'failed to book' }, { status: 500 });
  }
}
