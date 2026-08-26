import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { rescheduleFhirAppointment } from '@/lib/schedulingMutation';

export async function POST(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  let body: { appointmentId?: unknown; newSlotId?: unknown };
  try {
    body = await request.json() as { appointmentId?: unknown; newSlotId?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid reschedule request.' }, { status: 400 });
  }
  const appointmentId = typeof body.appointmentId === 'string' ? body.appointmentId.trim() : '';
  const newSlotId = typeof body.newSlotId === 'string' ? body.newSlotId.trim() : '';
  if (!appointmentId || !newSlotId) return NextResponse.json({ error: 'appointmentId and newSlotId are required' }, { status: 400 });
  try {
    const appointment = await rescheduleFhirAppointment(appointmentId, newSlotId);
    await logAuditEvent({ agentId: access.actor!.id, entityType: 'Appointment', entityId: appointmentId, action: 'U', outcome: 'success', description: 'Rescheduled appointment from Scheduling workspace' });
    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Reschedule was rejected by the scheduling source.' }, { status: 409 });
  }
}
