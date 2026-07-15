import { NextResponse } from 'next/server';
import { providers } from '@/scheduling/services/scheduling.mock';

export async function GET() {
  try {
    return NextResponse.json(providers);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('providers fetch error', err);
    return NextResponse.json({ error: 'failed to fetch providers' }, { status: 500 });
  }
}
