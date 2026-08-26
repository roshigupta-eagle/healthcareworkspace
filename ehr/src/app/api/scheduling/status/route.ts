import { NextResponse } from 'next/server';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { cancelFhirAppointment, markFhirAppointmentArrived } from '@/lib/schedulingMutation';
import { logAuditEvent } from '@/lib/audit';

const allowedStatuses = new Set(['arrived', 'cancelled']);

export async function POST(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  let body: { appointmentId?: unknown; status?: unknown };
  try { body = await request.json() as { appointmentId?: unknown; status?: unknown }; } catch { return NextResponse.json({ error: 'Invalid appointment status request.' }, { status: 400 }); }
  const appointmentId = typeof body.appointmentId === 'string' ? body.appointmentId.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : '';
  if (!appointmentId || !allowedStatuses.has(status)) return NextResponse.json({ error: 'Appointment and supported status are required.' }, { status: 400 });
  try {
    const updated = status === 'cancelled' ? await cancelFhirAppointment(appointmentId) : await markFhirAppointmentArrived(appointmentId);
    if (!updated) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
    await logAuditEvent({ agentId: access.actor!.id, entityType: 'Appointment', entityId: appointmentId, action: 'U', outcome: 'success', description: `Appointment status changed to ${status}` });
    return NextResponse.json({ ok: true, status, appointment: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Appointment status change was rejected.' }, { status: 409 });
  }
}
