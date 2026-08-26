import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDoctorViewSnapshot } from '@/lib/doctorView';
import DoctorViewShell from '@/components/doctor-view/DoctorViewShell';

export const dynamic = 'force-dynamic';

export default async function DoctorViewPage() {
  const session = await auth().catch(() => null);
  if (!session?.user && process.env.NODE_ENV === 'production') redirect('/login?returnTo=%2Fdoctor');
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const role = String(user?.role || 'DOCTOR').toUpperCase();
  if (session?.user && !new Set(['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER']).has(role)) redirect('/unauthorized');
  const snapshot = await getDoctorViewSnapshot({
    actorId: user?.id || 'dev-doctor',
    actorName: user?.name || 'Doctor User',
    actorRole: role,
    clinic: process.env.DOCTOR_VIEW_CLINIC,
    specialty: process.env.DOCTOR_VIEW_SPECIALTY,
    timeZone: process.env.DOCTOR_VIEW_TIME_ZONE,
  });
  return <DoctorViewShell initialData={snapshot} />;
}

