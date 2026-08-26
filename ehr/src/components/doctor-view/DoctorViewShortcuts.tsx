"use client";

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ShortcutIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    users: <><path d="M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1" /><circle cx="9.5" cy="7" r="3" /><path d="M17 11a3 3 0 100-6M21 20v-1a4 4 0 00-3-3.8" /></>,
    encounters: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8v8" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M8 14h3M8 17h6" /></>,
    orders: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2h6v2M8 10h8M8 14h6" /></>,
    records: <><path d="M5 3h10l4 4v14H5z" /><path d="M14 3v5h5M8 13h8M8 17h6" /></>,
    documents: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h5" /></>,
    refresh: <><path d="M20 11a8 8 0 00-14-5L3 9M3 4v5h5M4 13a8 8 0 0014 5l3-3M21 20v-5h-5" /></>,
  };
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.records}</svg>;
}

export default function DoctorViewShortcuts({ refreshing, status, onRefresh }: { refreshing: boolean; status?: string | null; onRefresh: () => void }) {
  const searchParams = useSearchParams();
  const preview = process.env.NODE_ENV !== 'production' && Boolean(searchParams.get('noauth') || searchParams.get('asUser'));
  const previewQuery = searchParams.get('asUser') ? `asUser=${encodeURIComponent(searchParams.get('asUser')!)}` : 'noauth=1&asUser=dev';
  const href = (path: string) => preview ? `${path}${path.includes('?') ? '&' : '?'}${previewQuery}` : path;
  return <div className="doctor-view-shortcuts" aria-label="Clinical workspace shortcuts"><div className="doctor-view-shortcut-links"><Link href={href('/dashboard/records')} className="doctor-view-shortcut"><ShortcutIcon name="users" />Patients</Link><Link href={href('/dashboard/encounters')} className="doctor-view-shortcut"><ShortcutIcon name="encounters" />Encounters</Link><Link href={href('/dashboard/appointments')} className="doctor-view-shortcut"><ShortcutIcon name="calendar" />Appointments</Link><Link href={href('/dashboard/orders')} className="doctor-view-shortcut"><ShortcutIcon name="orders" />Orders</Link><Link href={href('/dashboard/records')} className="doctor-view-shortcut"><ShortcutIcon name="records" />Health Records</Link><Link href={href('/dashboard/documents?tab=needs-review')} className="doctor-view-shortcut"><ShortcutIcon name="documents" />Documents</Link></div><div className="doctor-view-shortcut-utility"><button type="button" onClick={onRefresh} disabled={refreshing} className="doctor-view-shortcut doctor-view-shortcut-refresh" title="Refresh Doctor View"><ShortcutIcon name="refresh" />{refreshing ? 'Refreshing...' : 'Refresh'}</button>{status && <span className="doctor-view-refresh-status" role="status">{status}</span>}</div></div>;
}
