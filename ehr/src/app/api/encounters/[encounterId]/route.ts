import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { getEncounterDetail } from '@/lib/encounterWorkspace';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ encounterId: string }> },
) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { encounterId } = await params;
  const detail = await getEncounterDetail(access.actor!, encounterId);
  if (!detail) {
    await logAuditEvent({
      agentId: access.actor!.id,
      entityType: 'Encounter',
      entityId: encounterId,
      action: 'R',
      outcome: 'denied',
      description: 'Attempted to open unavailable encounter details',
    });
    return NextResponse.json(
      { error: 'Encounter not found or unavailable in your authorized scope.' },
      { status: 404 },
    );
  }
  await logAuditEvent({
    agentId: access.actor!.id,
    entityType: 'Encounter',
    entityId: encounterId,
    action: 'R',
    outcome: 'success',
    description: 'Viewed encounter details',
  });
  return NextResponse.json(detail, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}