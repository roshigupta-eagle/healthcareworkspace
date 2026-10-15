import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { applyOrderAction, type OrderAction, OrderActionError, OrderConflictError } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

const ACTIONS = new Set<OrderAction>(['sign', 'send', 'resend', 'schedule', 'collect', 'start', 'complete', 'review-result', 'hold', 'resume', 'cancel']);

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { orderId } = await params;
  let body: { action?: unknown; version?: unknown } = {};
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid order action request.' }, { status: 400 });
  }
  const action = typeof body.action === 'string' && ACTIONS.has(body.action as OrderAction) ? body.action as OrderAction : undefined;
  const version = typeof body.version === 'number' ? body.version : undefined;
  if (!action) return NextResponse.json({ error: 'Order action is invalid.' }, { status: 400 });
  try {
    const order = await applyOrderAction(orderId, action, access.actor!, version);
    await logAuditEvent({ agentId: access.actor!.id, entityType: 'ServiceRequest', entityId: order.id, action: action === 'review-result' ? 'R' : 'U', outcome: 'success', description: `Order action: ${action}` });
    return NextResponse.json({ data: order });
  } catch (error) {
    if (error instanceof OrderConflictError) return NextResponse.json({ error: error.message, code: 'CONCURRENCY_CONFLICT' }, { status: 409 });
    if (error instanceof OrderActionError) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ error: 'The order action could not be saved.' }, { status: 500 });
  }
}
