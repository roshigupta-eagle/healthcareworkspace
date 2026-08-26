"use client";

import React, { useEffect, useState } from 'react';
import AnimatedLink from '@/components/AnimatedLink';
import { usePathname, useSearchParams } from 'next/navigation';

type SidebarSession = { user?: { name?: string; role?: string } } | null;
type WorkCounts = { counts?: { open?: number; urgent?: number }; messages?: { unread?: number }; documents?: { needsReview?: number } };
type IconName = 'dashboard' | 'calendar' | 'stethoscope' | 'patients' | 'appointments' | 'encounters' | 'tasks' | 'messages' | 'communication' | 'records' | 'documents' | 'orders' | 'users' | 'audit';

const STAFF_ROLES = new Set(['DOCTOR', 'ADMIN', 'NURSE', 'CLINICIAN', 'PRACTITIONER']);

export function isSidebarRouteActive(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    stethoscope: <><path d="M6 3v5a4 4 0 008 0V3M4 3h4M12 3h4M14 12v3a4 4 0 004 4h1a2 2 0 002-2v-1" /><circle cx="19" cy="12" r="2" /></>,
    patients: <><path d="M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1" /><circle cx="9.5" cy="7" r="3" /><path d="M17 11a3 3 0 100-6M21 20v-1a4 4 0 00-3-3.8" /></>,
    appointments: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M8 14h3M8 17h6" /></>,
    encounters: <><path d="M12 21a9 9 0 100-18 9 9 0 000 18z" /><path d="M8 12h8M12 8v8" /></>,
    tasks: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h5M8 17h8" /><path d="M17 3v3" /></>,
    messages: <><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 13h5" /></>,
    communication: <><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 13h5" /><path d="M16 3v3M20 7h2" /></>,
    records: <><path d="M5 3h10l4 4v14H5z" /><path d="M14 3v5h5M8 13h8M8 17h6" /></>,
    documents: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h5" /></>,
    orders: <><path d="M6 3h12v18H6z" /><path d="M9 7h6M9 11h6M9 15h4" /></>,
    users: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0114 0" /></>,
    audit: <><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h5M8 17h8" /></>,
  };
  return <svg className="doctor-sidebar-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function badgeTone(kind: 'tasks' | 'messages' | 'documents', counts: WorkCounts) {
  if (kind === 'tasks' && (counts.counts?.urgent || 0) > 0) return 'doctor-sidebar-badge doctor-sidebar-badge-urgent';
  if (kind === 'tasks') return 'doctor-sidebar-badge doctor-sidebar-badge-action';
  if (kind === 'documents') return 'doctor-sidebar-badge doctor-sidebar-badge-action';
  return 'doctor-sidebar-badge doctor-sidebar-badge-info';
}

export default function Sidebar({ session, role = 'PATIENT' }: { session?: SidebarSession; role?: string }) {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const asUser = searchParams.get('asUser');
  const noAuth = searchParams.get('noauth') === '1' || searchParams.get('noauth') === 'true';
  const explicitPreview = process.env.NODE_ENV !== 'production' && (noAuth || asUser === 'dev' || asUser === 'dev-doctor');
  const preview = explicitPreview;
  const effectiveRole = STAFF_ROLES.has(role.toUpperCase()) || explicitPreview ? 'DOCTOR' : role.toUpperCase();
  const [counts, setCounts] = useState<WorkCounts>({});

  useEffect(() => {
    if (!STAFF_ROLES.has(effectiveRole) && effectiveRole !== 'DOCTOR') return;
    const query = asUser ? `?asUser=${encodeURIComponent(asUser)}` : '';
    let active = true;
    fetch(`/api/doctor-work-summary${query}`, { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return;
      const next = await response.json() as WorkCounts;
      if (active) setCounts(next);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [asUser, effectiveRole]);

  function linkClass(href: string) {
    return `doctor-sidebar-link${isSidebarRouteActive(pathname, href) ? ' is-active' : ''}`;
  }

  function item(href: string, label: string, icon: IconName, badge?: { value?: number; kind: 'tasks' | 'messages' | 'documents' }, dataI18n?: string) {
    const value = badge?.value || 0;
    const previewQuery = asUser ? `asUser=${encodeURIComponent(asUser)}` : 'noauth=1&asUser=dev';
    const linkHref = preview ? `${href}${href.includes('?') ? '&' : '?'}${previewQuery}` : href;
    return <li key={href}><AnimatedLink href={linkHref} className={linkClass(href)} aria-current={isSidebarRouteActive(pathname, href) ? 'page' : undefined} data-i18n={dataI18n}><span className="doctor-sidebar-link-content"><SidebarIcon name={icon} /><span>{label}</span></span>{badge && value > 0 && <span className={badgeTone(badge.kind, counts)}>{value}</span>}</AnimatedLink></li>;
  }

  const staff = STAFF_ROLES.has(effectiveRole) || effectiveRole === 'DOCTOR';
  return <nav aria-label="Main navigation" className="doctor-sidebar">
    <div className="doctor-sidebar-brand"><div className="doctor-sidebar-brand-mark">R</div><div><h2>Roshi EHR</h2><p>{session?.user?.name || 'Clinical workspace'} · {staff ? 'Doctor' : effectiveRole}</p></div></div>
    <div className="doctor-sidebar-group"><div className="doctor-sidebar-group-label">Overview</div><ul role="list">{item('/dashboard', 'Dashboard', 'dashboard', undefined, 'dashboard')}{staff && item('/schedule/today', "Today's Schedule", 'calendar', undefined, 'todaysSchedule')}{staff && item('/doctor', 'Doctor View', 'stethoscope', undefined, 'doctorView')}</ul></div>
    {staff && <div className="doctor-sidebar-group"><div className="doctor-sidebar-group-label">Clinical Work</div><ul role="list">{item('/dashboard/patients', 'Patients', 'patients', undefined, 'patientList')}{item('/dashboard/appointments', 'Appointments', 'appointments', undefined, 'appointments')}{item('/dashboard/encounters', 'Encounters', 'encounters', undefined, 'encounters')}{item('/dashboard/tasks', 'Tasks & Inbox', 'tasks', { value: counts.counts?.open, kind: 'tasks' })}{item('/communication', 'Communication', 'communication', { value: counts.messages?.unread, kind: 'messages' })}</ul></div>}
    {staff && <div className="doctor-sidebar-group"><div className="doctor-sidebar-group-label">Records</div><ul role="list">{item('/dashboard/records', 'Health Records', 'records', undefined, 'healthRecords')}{item('/dashboard/documents', 'Documents', 'documents', { value: counts.documents?.needsReview, kind: 'documents' })}{item('/dashboard/orders', 'Orders', 'orders', undefined, 'orders')}</ul></div>}
    {effectiveRole === 'ADMIN' && <div className="doctor-sidebar-group doctor-sidebar-admin"><div className="doctor-sidebar-group-label">Administration</div><ul role="list">{item('/admin/users', 'User Management', 'users', undefined, 'userManagement')}{item('/admin/audit', 'Audit Log', 'audit', undefined, 'auditLog')}</ul></div>}
  </nav>;
}
