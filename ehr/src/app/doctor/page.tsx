import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDoctorViewSnapshot } from '@/lib/doctorView';
import DoctorViewShell from '@/components/doctor-view/DoctorViewShell';

export const dynamic = 'force-dynamic';

export default async function DoctorViewPage() {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fdoctor');
  const user = session.user as { id?: string; name?: string; role?: string };
  const role = String(user.role || '').toUpperCase();
  if (!new Set(['DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER']).has(role)) redirect('/unauthorized');
  const snapshot = await getDoctorViewSnapshot({
    actorId: user.id || '',
    actorName: user.name || '',
    actorRole: role,
    clinic: process.env.DOCTOR_VIEW_CLINIC,
    specialty: process.env.DOCTOR_VIEW_SPECIALTY,
    timeZone: process.env.DOCTOR_VIEW_TIME_ZONE,
  });
  return <DoctorViewShell initialData={snapshot} />;
}

