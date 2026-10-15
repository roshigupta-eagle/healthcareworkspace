import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { buildServiceRequest, readOrders } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const { orderId } = await params;
  const order = (await readOrders()).find((candidate) => candidate.id === orderId);
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  await logAuditEvent({ agentId: access.actor!.id, entityType: 'ServiceRequest', entityId: order.id, action: 'R', outcome: 'success', description: 'Viewed order details' });
  return NextResponse.json({ data: order, fhir: buildServiceRequest(order) }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
