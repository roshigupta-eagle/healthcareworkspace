import { NextResponse } from 'next/server';
import { fetchDashboard } from '@/cardiology/services/api.mock';
import { getCache, setCache } from '@/lib/cache';

export async function GET() {
  try {
    const key = 'cardio_dashboard_v1';
    const cached = getCache(key);
    if (cached) return NextResponse.json(cached);

    const dash = await fetchDashboard();
    // short TTL — keep data fresh but avoid duplicate work for many clients
    setCache(key, dash, 3000);
    return NextResponse.json(dash);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('dashboard fetch error', err);
    return NextResponse.json({ error: 'failed to fetch' }, { status: 500 });
  }
}
