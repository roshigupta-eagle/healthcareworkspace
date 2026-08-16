import { NextResponse } from 'next/server';
import { markSummaryReviewed } from '@/lib/aiSummaryStore';
import { resolveSession } from '@/lib/serverAuth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: Request, { params }: { params: { patientId: string } }) {
  const { patientId } = params;
  const session = await resolveSession(req);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session?.user || { id: 'dev', name: 'dev' };
  const body = await req.json().catch(() => ({}));
  const { versionId, disposition, note } = body;
  if (!versionId) return NextResponse.json({ error: 'missing versionId' }, { status: 400 });
  try {
    const v = await markSummaryReviewed(patientId, versionId, { id: user.id, name: user.name, disposition, note });
    try { await logAuditEvent({ agentId: user.id, entityType: 'AIClinicalSummary', entityId: versionId, action: 'U', outcome: 'success', description: `Reviewed summary: ${disposition || 'Reviewed'}` }); } catch (e) {}
    return NextResponse.json({ data: v });
  } catch (err: any) {
    try { await logAuditEvent({ agentId: user.id, entityType: 'AIClinicalSummary', entityId: versionId || '', action: 'E', outcome: 'failure', description: `Review failed: ${err?.message || String(err)}` }); } catch (e) {}
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

