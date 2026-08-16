import { NextResponse } from 'next/server';
import { generateSummaryFromPatient } from '@/lib/aiSummaryStore';
import { resolveSession } from '@/lib/serverAuth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request, { params }: { params: { patientId: string } }) {
  const { patientId } = params;
  const session = await resolveSession(req);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session?.user?.id || 'dev-user';

  try {
    const v = await generateSummaryFromPatient(patientId, userId);
    try { await logAuditEvent({ agentId: userId, entityType: 'AIClinicalSummary', entityId: v.versionId, action: 'C', outcome: 'success', description: 'Regenerated AI summary' }); } catch (e) { /* ignore */ }
    return NextResponse.json({ data: v });
  } catch (err: any) {
    try { await logAuditEvent({ agentId: userId, entityType: 'AIClinicalSummary', entityId: '', action: 'E', outcome: 'failure', description: `Regenerate failed: ${err?.message || String(err)}` }); } catch (e) {}
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

