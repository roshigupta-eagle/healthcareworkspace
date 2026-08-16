import { NextResponse } from 'next/server';
import { getLatestSummary, listVersions, mapSummaryToFhir } from '@/lib/aiSummaryStore';
import { resolveSession } from '@/lib/serverAuth';

export async function GET(req: Request, { params }: { params: { patientId: string } }) {
  const { patientId } = params;
  const session = await resolveSession(req);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const v = await getLatestSummary(patientId);
  if (!v) return NextResponse.json({ error: 'no summary' }, { status: 404 });
  // Return structured JSON for download
  const filename = `ai-summary-${patientId}-v${v.versionNumber}.json`;
  return NextResponse.json(v, { status: 200, headers: { 'Content-Disposition': `attachment; filename="${filename}"` } });
}

