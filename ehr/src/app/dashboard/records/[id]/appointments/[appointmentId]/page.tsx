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

  const appointment = (patient.upcoming || []).find((a: any) => a.id === appointmentId) || {
    id: appointmentId,
    date: '2026-07-18 10:30',
    doctor: 'Dr. Aris Thorne',
    type: 'Follow-up',
    status: 'Scheduled',
    location: 'Main Clinic — Room 203',
    duration: '30 minutes',
    bookedOn: '2026-05-10',
  };

  return (
    <div className="min-h-[88vh] bg-[#F6F9FB] py-10">
      <div className="mx-auto w-[94vw] max-w-[1500px] rounded-2xl bg-white border border-[#DDE7F0] shadow-lg p-8">
        <AppointmentDetailClient appointment={appointment} patient={patient} />
      </div>
    </div>
  );
}
