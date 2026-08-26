import { NextResponse } from 'next/server';
import { markSummaryReviewed } from '@/lib/aiSummaryStore';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function POST(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const access = await resolveDoctorWorkspaceActor(req);
  if (access.response) return access.response;
  const user = access.actor!;
  const body = await req.json().catch(() => ({}));
  const { versionId, disposition, note } = body;
  if (!versionId) return NextResponse.json({ error: 'missing versionId' }, { status: 400 });
  try {
    const v = await markSummaryReviewed(patientId, versionId, { id: user.id, name: user.name, disposition, note });
    try { await logAuditEvent({ agentId: user.id, entityType: 'AIClinicalSummary', entityId: versionId, action: 'U', outcome: 'success', description: `Reviewed summary: ${disposition || 'Reviewed'}` }); } catch { /* ignore */ }
    return NextResponse.json({ data: v });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    try { await logAuditEvent({ agentId: user.id, entityType: 'AIClinicalSummary', entityId: versionId || '', action: 'E', outcome: 'failure', description: `Review failed: ${message}` }); } catch { /* ignore */ }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

