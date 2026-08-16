import { NextResponse } from 'next/server';
import { mapSummaryToFhir } from '@/lib/aiSummaryStore';
import { resolveSession } from '@/lib/serverAuth';

export async function GET(req: Request, { params }: { params: { patientId: string; versionId?: string } }) {
  const { patientId } = params;
  const session = await resolveSession(req);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const composition = await mapSummaryToFhir(patientId);
    return NextResponse.json({ data: composition });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

