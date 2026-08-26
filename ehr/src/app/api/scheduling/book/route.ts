import { NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';
import { bookFhirAppointment } from '@/lib/schedulingMutation';
import { getSchedulingSnapshot } from '@/lib/schedulingData';

export async function POST(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  let body: { slotId?: unknown; patient?: unknown; appointmentType?: unknown; reason?: unknown; notes?: unknown; providerId?: unknown; locationId?: unknown; slotStart?: unknown; slotEnd?: unknown; allowDuplicate?: unknown };
  try {
    body = await request.json() as { slotId?: unknown; patient?: unknown; appointmentType?: unknown; reason?: unknown; notes?: unknown; providerId?: unknown; locationId?: unknown; slotStart?: unknown; slotEnd?: unknown; allowDuplicate?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid booking request.' }, { status: 400 });
  }
  const patient = body.patient && typeof body.patient === 'object' && !Array.isArray(body.patient) ? body.patient as { id?: unknown; name?: unknown } : {};
  const slotId = typeof body.slotId === 'string' ? body.slotId.trim() : '';
  const patientId = typeof patient.id === 'string' ? patient.id.trim() : '';
  if (!slotId || !patientId) return NextResponse.json({ error: 'A live slot and an explicitly selected patient are required.' }, { status: 400 });
  try {
    const snapshot = await getSchedulingSnapshot();
    const selectedSlot = snapshot.slots.find((slot) => slot.id === slotId);
    const appointmentType = typeof body.appointmentType === 'string' ? body.appointmentType.trim() : undefined;
    const duplicate = selectedSlot && snapshot.appointments.find((appointment) => appointment.patientId === patientId && ['proposed', 'pending', 'booked', 'arrived', 'checked-in', 'waitlist'].includes(appointment.status) && appointment.start.slice(0, 10) === selectedSlot.start.slice(0, 10) && (!appointmentType || (appointment.appointmentType || appointment.serviceType || '').toLowerCase() === appointmentType.toLowerCase()));
    if (duplicate && body.allowDuplicate !== true) return NextResponse.json({ error: 'This patient already has a similar appointment on the selected date.', code: 'DUPLICATE_APPOINTMENT', existing: { id: duplicate.id, start: duplicate.start, end: duplicate.end, appointmentType: duplicate.appointmentType || duplicate.serviceType } }, { status: 409 });
    const appointment = await bookFhirAppointment({ slotId, patientId, patientName: typeof patient.name === 'string' ? patient.name : undefined, appointmentType, description: typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : undefined, comment: typeof body.notes === 'string' ? body.notes.trim().slice(0, 3000) : undefined, expectedProviderId: typeof body.providerId === 'string' ? body.providerId.trim() : undefined, expectedLocationId: typeof body.locationId === 'string' ? body.locationId.trim() : undefined, expectedStart: typeof body.slotStart === 'string' ? body.slotStart.trim() : undefined, expectedEnd: typeof body.slotEnd === 'string' ? body.slotEnd.trim() : undefined, actorId: access.actor!.id, idempotencyKey: request.headers.get('idempotency-key') || undefined });
    await logAuditEvent({ agentId: access.actor!.id, entityType: 'Appointment', entityId: String(appointment.id || ''), action: 'C', outcome: 'success', description: 'Booked appointment from Scheduling workspace' });
    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Booking was rejected by the scheduling source.' }, { status: 409 });
  }
}
