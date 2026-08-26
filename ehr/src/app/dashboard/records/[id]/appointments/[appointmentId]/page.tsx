import React from 'react';
import { redirect } from 'next/navigation';
import { getPatientById } from '../../../mockPatients';
import AppointmentDetailClient from '@/components/AppointmentDetailClient';

export default async function AppointmentDetailPage({ params }: { params: any }) {
  const resolved = await params;
  const patientId = resolved?.id ?? resolved.id;
  const appointmentId = resolved?.appointmentId ?? resolved.appointmentId;

  const patient = getPatientById(String(patientId));
  if (!patient) return redirect('/dashboard/records');

  // Never fabricate a fallback appointment — an unmatched id must render the
  // "Appointment Not Found" state instead of silently showing wrong data.
  const appointment = (patient.upcoming || []).find((a: any) => a.id === appointmentId) || null;

  return (
    <div className="min-h-[88vh] bg-[#F6F9FB] py-10">
      <div className="mx-auto w-[94vw] max-w-[1500px] rounded-2xl bg-white border border-[#DDE7F0] shadow-lg p-8">
        <AppointmentDetailClient appointment={appointment} patient={patient} />
      </div>
    </div>
  );
}
