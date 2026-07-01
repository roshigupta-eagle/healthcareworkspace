/**
 * API: /api/appointments
 * Returns mock appointments for a practitioner (or role-based fallback).
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const practitionerId = url.searchParams.get("practitionerId") ?? undefined;
  const startParam = url.searchParams.get("start") ?? undefined; // YYYY-MM-DD
  const endParam = url.searchParams.get("end") ?? undefined;   // YYYY-MM-DD

  const startDate = startParam ? new Date(`${startParam}T00:00:00`) : new Date();
  const endDate = endParam ? new Date(`${endParam}T23:59:59`) : new Date(startDate.getTime() + 7 * 24 * 3600 * 1000);

  const clinicianId = practitionerId ?? (session.user.role === 'DOCTOR' ? session.user.id : undefined);

  const appointments = generateMockAppointments(clinicianId ?? 'any', startDate, endDate);

  await logAuditEvent({ agentId: session.user.id!, entityType: 'Appointment', action: 'R', description: `List appointments for ${clinicianId ?? 'all'}` });

  return NextResponse.json({ appointments });
}

function generateMockAppointments(clinicianId: string, start: Date, end: Date) {
  const appts: any[] = [];
  const patients = [
    { id: 'u-patient-1', name: 'John Doe', mrn: 'MRN1001' },
    { id: 'u-patient-2', name: 'Mary Johnson', mrn: 'MRN1002' },
    { id: 'u-patient-3', name: 'Carlos Diaz', mrn: 'MRN1003' },
  ];

  const day = new Date(start);
  day.setHours(0, 0, 0, 0);
  let counter = 1;
  for (let d = new Date(day); d <= end; d.setDate(d.getDate() + 1)) {
    const times = [9, 14];
    for (const t of times) {
      const s = new Date(d);
      s.setHours(t, 0, 0, 0);
      const e = new Date(s.getTime() + 30 * 60 * 1000);
      if (s < start || s > end) continue;
      const patient = patients[(counter - 1) % patients.length];
      appts.push({
        id: `appt-${clinicianId}-${counter}`,
        visitId: `v-${Math.random().toString(36).slice(2, 9)}`,
        patientId: patient.id,
        patientName: patient.name,
        mrn: patient.mrn,
        clinicianId,
        start: s.toISOString(),
        end: e.toISOString(),
        reason: counter % 2 === 0 ? 'Follow-up' : 'Consultation',
      });
      counter++;
    }
  }

  return appts;
}
