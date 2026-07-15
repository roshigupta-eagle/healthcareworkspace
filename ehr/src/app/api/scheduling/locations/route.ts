import { NextResponse } from 'next/server';
import { locations } from '@/scheduling/services/scheduling.mock';

export async function GET() {
  try {
    return NextResponse.json(locations);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('locations fetch error', err);
    return NextResponse.json({ error: 'failed to fetch locations' }, { status: 500 });
  }
}
