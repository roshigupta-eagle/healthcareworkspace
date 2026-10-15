import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { updateReferral } from '@/lib/referralStore';
import { getAuthorizedReferral } from '@/lib/referralWorkspace';
import { transitionReferral, type ReferralTransitionAction } from '@/lib/referralWorkflow';

export const dynamic = 'force-dynamic';

const ACTIONS = new Set<ReferralTransitionAction>([
  'submit',
  'review',
  'route',
  'send',
  'confirm-received',
  'request-information',
  'resume-review',
  'accept',
  'waitlist',
  'decline',
  'schedule',
  'start',
  'complete-consult',
  'receive-outcome',
  'close',
  'cancel',
]);

export async function POST(request: Request, { params }: { params: Promise<{ referralId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { referralId } = await params;
  const referral = await getAuthorizedReferral(referralId, access.actor!);
  if (!referral) {
    await logAuditEvent({ agentId: access.actor!.id, entityType: 'ServiceRequest', entityId: referralId, action: 'U', outcome: 'denied', description: 'Attempted referral transition outside authorized scope' });
    return NextResponse.json({ error: 'Referral not found or unavailable.' }, { status: 404 });
  }

  let body: { action?: unknown; expectedUpdatedAt?: unknown; scheduledAt?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid referral transition request.' }, { status: 400 });
  }
  const action = typeof body.action === 'string' && ACTIONS.has(body.action as ReferralTransitionAction) ? body.action as ReferralTransitionAction : null;
  if (!action) return NextResponse.json({ error: 'Unsupported referral transition.' }, { status: 400 });

  const scheduledAt = typeof body.scheduledAt === 'string' ? body.scheduledAt.trim() : '';
  if (referral.businessState === 'Scheduling' && action === 'schedule' && (!scheduledAt || Number.isNaN(Date.parse(scheduledAt)))) {
    return NextResponse.json({ error: 'A valid scheduled appointment date is required before recording this referral as scheduled.' }, { status: 400 });
  }

  try {
    const transition = transitionReferral(referral, action, access.actor!);
    const updated = await updateReferral(referralId, {
      businessState: transition.businessState,
      status: transition.status,
      ...(scheduledAt ? { scheduledAt } : {}),
      events: [transition.event],
    }, typeof body.expectedUpdatedAt === 'string' ? body.expectedUpdatedAt : undefined);
    if (!updated) return NextResponse.json({ error: 'Referral could not be updated.' }, { status: 404 });
    await logAuditEvent({ agentId: access.actor!.id, entityType: 'ServiceRequest', entityId: referralId, action: 'U', outcome: 'success', description: `Referral transition: ${action}`, detail: { action, businessState: transition.businessState } });
    return NextResponse.json({ item: updated }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'REFERRAL_INVALID_TRANSITION') return NextResponse.json({ error: 'This referral cannot move to that workflow state from its current state.' }, { status: 409 });
    if (error instanceof Error && error.message === 'REFERRAL_TRANSITION_FORBIDDEN') return NextResponse.json({ error: 'You do not have permission to cancel this referral.' }, { status: 403 });
    if (error instanceof Error && error.message === 'REFERRAL_VERSION_CONFLICT') return NextResponse.json({ error: 'This referral changed since you opened it. Refresh the referral to continue.' }, { status: 409 });
    return NextResponse.json({ error: 'The referral transition could not be saved. The referral has not been sent or changed.' }, { status: 500 });
  }
}
