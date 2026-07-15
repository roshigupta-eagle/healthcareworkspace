import { NextResponse } from 'next/server';
import { fetchSlots } from '@/scheduling/services/scheduling.mock';

export async function GET() {
  try {
    const slots = await fetchSlots();
    return NextResponse.json(slots);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('scheduling slots fetch error', err);
    return NextResponse.json({ error: 'failed to fetch slots' }, { status: 500 });
  }
}
