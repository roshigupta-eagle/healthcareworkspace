import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import {
  EncounterCommandError,
  transitionEncounter,
} from '@/lib/encounterWorkspace';

export const dynamic = 'force-dynamic';

function text(value: unknown, maximum = 160): string | undefined {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maximum)
    : undefined;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ encounterId: string }> },
) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { encounterId } = await params;
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return NextResponse.json({ error: 'Invalid encounter transition request.' }, { status: 400 });
  }
  try {
    const result = await transitionEncounter(access.actor!, {
      encounterId,
      event: text(body.event, 80) || '',
      expectedUpdatedAt: text(body.expectedUpdatedAt, 80) || '',
      roomId: text(body.roomId),
      assignedPractitionerId: text(body.assignedPractitionerId),
      note: text(body.note, 1000),
    });
    await logAuditEvent({
      agentId: access.actor!.id,
      entityType: 'Encounter',
      entityId: encounterId,
      action: 'U',
      outcome: 'success',
      description: `Encounter workflow transition: ${result.event}`,
      detail: { event: result.event, toState: result.toState },
    });
    return NextResponse.json({ data: result }, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  } catch (error) {
    const commandError = error instanceof EncounterCommandError
      ? error
      : new EncounterCommandError(
        'The encounter workflow transition could not be completed.',
        502,
      );
    await logAuditEvent({
      agentId: access.actor!.id,
      entityType: 'Encounter',
      entityId: encounterId,
      action: 'U',
      outcome: commandError.outcome,
      description: 'Encounter workflow transition was not completed',
      detail: { status: commandError.status },
    });
    return NextResponse.json({ error: commandError.message }, {
      status: commandError.status,
    });
  }
}