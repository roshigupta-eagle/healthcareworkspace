import { NextResponse } from 'next/server';
import { generateSummaryFromPatient } from '@/lib/aiSummaryStore';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function POST(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const access = await resolveDoctorWorkspaceActor(req);
  if (access.response) return access.response;
  const actor = access.actor!;
  const userId = actor.id;

  try {
    const v = await generateSummaryFromPatient(patientId, userId);
    try { await logAuditEvent({ agentId: userId, entityType: 'AIClinicalSummary', entityId: v.versionId, action: 'C', outcome: 'success', description: 'Regenerated AI summary' }); } catch { /* ignore */ }
    return NextResponse.json({ data: v });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    try { await logAuditEvent({ agentId: userId, entityType: 'AIClinicalSummary', entityId: '', action: 'E', outcome: 'failure', description: `Regenerate failed: ${message}` }); } catch { /* ignore */ }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

