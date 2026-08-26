"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function MobileDoctorNav({ role }: { role?: string }) {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const asUser = searchParams.get('asUser');
  const preview = searchParams.get('noauth') === '1' || searchParams.get('noauth') === 'true' || asUser === 'dev' || asUser === 'dev-doctor';
  const previewQuery = searchParams.get('asUser') ? `?asUser=${encodeURIComponent(searchParams.get('asUser')!)}` : '?noauth=1&asUser=dev';
  const staff = ['DOCTOR', 'ADMIN', 'NURSE', 'CLINICIAN', 'PRACTITIONER'].includes(String(role || '').toUpperCase()) || (process.env.NODE_ENV !== 'production' && preview);
  if (!staff) return null;
  const links = [['/doctor', 'Doctor View'], ['/schedule/today', "Today's Schedule"], ['/dashboard/appointments', 'Appointments'], ['/dashboard/tasks', 'Tasks & Inbox'], ['/communication', 'Communication'], ['/dashboard/records', 'Health Records'], ['/dashboard/patients', 'Patients']] as const;
  return <nav className="doctor-mobile-nav" aria-label="Doctor workspace navigation">{links.map(([href, label]) => <Link key={href} href={preview ? `${href}${previewQuery}` : href} className={pathname === href || pathname.startsWith(`${href}/`) ? 'is-active' : ''}>{label}</Link>)}</nav>;
}
