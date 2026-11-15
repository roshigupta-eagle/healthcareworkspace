"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileDoctorNav({ role }: { role?: string }) {
  const pathname = usePathname() || '';
  const staff = ['DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER'].includes(String(role || '').toUpperCase());
  if (!staff) return null;
  const links = [['/dashboard', 'Dashboard'], ['/doctor', 'Doctor View'], ['/schedule/today', "Today's Schedule"], ['/dashboard/appointments', 'Appointments'], ['/dashboard/tasks', 'Tasks & Inbox'], ['/communication', 'Communication'], ['/dashboard/records', 'Health Records'], ['/dashboard/patients', 'Patients']] as const;
  return <nav className="doctor-mobile-nav" aria-label="Doctor workspace navigation">{links.map(([href, label]) => <Link key={href} href={href} className={pathname === href || pathname.startsWith(`${href}/`) ? 'is-active' : ''}>{label}</Link>)}</nav>;
}
