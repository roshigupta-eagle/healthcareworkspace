import { NextResponse } from 'next/server';
import { mockQueueItems } from '@/cardiology/services/api.mock';
import { getCache, setCache } from '@/lib/cache';

export async function GET() {
  try {
    const key = 'cardio_queue_v1';
    const cached = getCache(key);
    if (cached) return NextResponse.json(cached);

    // currently mockQueueItems is in-memory; cache for a short period
    setCache(key, mockQueueItems, 3000);
    return NextResponse.json(mockQueueItems);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('queueitems fetch error', err);
    return NextResponse.json({ error: 'failed to fetch' }, { status: 500 });
  }
}
