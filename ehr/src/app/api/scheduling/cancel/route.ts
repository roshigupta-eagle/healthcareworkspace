import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { cancelFhirAppointment } from '@/lib/schedulingMutation';

export async function POST(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  try {
    if (access.response) return access.response;
    const body = await request.json() as { appointmentId?: unknown };
    const appointmentId = typeof body.appointmentId === 'string' ? body.appointmentId.trim() : '';
    if (!appointmentId) return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 });
    const appointment = await cancelFhirAppointment(appointmentId);
    if (!appointment) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
    await logAuditEvent({ agentId: access.actor!.id, entityType: 'Appointment', entityId: appointmentId, action: 'U', outcome: 'success', description: 'Cancelled appointment from Scheduling workspace' });
    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Cancellation was rejected by the scheduling source.' }, { status: 409 });
  }
}
