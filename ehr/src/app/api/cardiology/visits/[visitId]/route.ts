import { NextResponse } from 'next/server';
import { fetchVisitDetail } from '@/cardiology/services/api.mock';

export async function GET(req: Request, context: any) {
  try {
    // context.params may be a Promise in some Next types; handle both
    const rawParams = context?.params;
    const params = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams || {};
    const { visitId } = params as { visitId?: string };
    if (!visitId) return NextResponse.json({ error: 'missing id' }, { status: 400 });
    const v = await fetchVisitDetail(visitId);
    if (!v) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(v);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('visit detail error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
