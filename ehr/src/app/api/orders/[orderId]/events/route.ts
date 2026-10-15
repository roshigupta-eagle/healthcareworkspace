import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor, type DoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { applyOrderExternalEvent, type OrderExternalEvent, type ResultStatus } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

const EVENTS = new Set<OrderExternalEvent['event']>(['accepted', 'failed', 'scheduled', 'collected', 'in-progress', 'completed', 'result', 'result-reviewed']);
const RESULT_STATUSES = new Set<ResultStatus>(['partial', 'preliminary', 'final', 'corrected', 'amended']);
const RESOURCE_TYPES = new Set(['DiagnosticReport', 'Observation']);

async function resolveEventActor(request: Request): Promise<{ actor?: DoctorWorkspaceActor; response?: NextResponse }> {
  const integrationToken = process.env.ORDERS_INTEGRATION_TOKEN?.trim();
  if (integrationToken && request.headers.get('x-roshi-integration-token') === integrationToken) return { actor: { id: 'orders-integration', name: 'LIMS/RIS integration', role: 'SYSTEM' } };
  return resolveDoctorWorkspaceActor(request);
}

function text(value: unknown, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const access = await resolveEventActor(request);
  if (access.response) return access.response;
  const { orderId } = await params;
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return NextResponse.json({ error: 'Invalid order event request.' }, { status: 400 });
  }
  const event = text(body.event, 40) as OrderExternalEvent['event'];
  if (!EVENTS.has(event)) return NextResponse.json({ error: 'Order event is invalid.' }, { status: 400 });
  const resultStatus = text(body.resultStatus, 40) as ResultStatus | '';
  const resourceType = text(body.resourceType, 40) as OrderExternalEvent['resourceType'];
  if (event === 'result' && (!RESULT_STATUSES.has(resultStatus) || !RESOURCE_TYPES.has(resourceType))) return NextResponse.json({ error: 'Result events require a valid result status and DiagnosticReport or Observation resource type.' }, { status: 400 });
  const payload: OrderExternalEvent = {
    event,
    eventId: text(body.eventId, 160) || undefined,
    at: text(body.at, 40) || undefined,
    patientId: text(body.patientId, 160) || undefined,
    failure: text(body.failure, 500) || undefined,
    resourceType: RESOURCE_TYPES.has(resourceType) ? resourceType : undefined,
    resourceId: text(body.resourceId, 160) || undefined,
    resultStatus: RESULT_STATUSES.has(resultStatus) ? resultStatus : undefined,
    resultDisplay: text(body.resultDisplay, 240) || undefined,
    collectedAt: text(body.collectedAt, 40) || undefined,
    finalizedAt: text(body.finalizedAt, 40) || undefined,
  };
  try {
    const order = await applyOrderExternalEvent(orderId, payload, access.actor!);
    await logAuditEvent({ agentId: access.actor!.id, entityType: event === 'result' || event === 'result-reviewed' ? payload.resourceType || 'DiagnosticReport' : 'ServiceRequest', entityId: order.id, action: 'U', outcome: 'success', description: `Received order integration event: ${event}` });
    return NextResponse.json({ data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The order event could not be saved.';
    return NextResponse.json({ error: message }, { status: message === 'Order not found.' ? 404 : 422 });
  }
}
