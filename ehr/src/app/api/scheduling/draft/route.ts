import { NextResponse } from 'next/server';
import { discardBookingDraft, getBookingDraft, saveBookingDraft } from '@/lib/bookingDraftStore';
import { logAuditEvent } from '@/lib/audit';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

function text(value: unknown, max = 1000) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;
}

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  return NextResponse.json({ data: await getBookingDraft(access.actor!.id) }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function PUT(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: 'Invalid booking draft.' }, { status: 400 }); }
  const draft = await saveBookingDraft(access.actor!.id, { patientId: text(body.patientId, 160), appointmentType: text(body.appointmentType, 240), providerId: text(body.providerId, 160), locationId: text(body.locationId, 160), date: text(body.date, 20), slotId: text(body.slotId, 160), reason: text(body.reason, 1000), notes: text(body.notes, 3000) });
  await logAuditEvent({ agentId: access.actor!.id, entityType: 'Appointment', entityId: 'booking-draft', action: 'C', outcome: 'success', description: 'Saved appointment booking draft' });
  return NextResponse.json({ data: draft });
}

export async function DELETE(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  await discardBookingDraft(access.actor!.id);
  await logAuditEvent({ agentId: access.actor!.id, entityType: 'Appointment', entityId: 'booking-draft', action: 'D', outcome: 'success', description: 'Discarded appointment booking draft' });
  return NextResponse.json({ success: true });
}
