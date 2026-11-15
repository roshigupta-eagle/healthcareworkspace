'use client';

import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, FileHeart, FileText, History, Home, LogOut, MessageCircle, TestTube } from 'lucide-react';
import { subscribeToPatientRecordChanges } from '@/lib/patientRecordSync';

const NAV_ITEMS = [
  { href: '/patient/dashboard', label: 'Overview', icon: Home },
  { href: '/patient/appointments', label: 'Appointments', icon: CalendarDays },
  { href: '/patient/results', label: 'Results', icon: TestTube },
  { href: '/patient/visits', label: 'Visit History', icon: History },
  { href: '/patient/records', label: 'Health Records', icon: FileHeart },
  { href: '/patient/documents', label: 'Documents', icon: FileText },
  { href: '/patient/communication', label: 'Communication', icon: MessageCircle },
] as const;

export function PatientPortalShell({
  children,
  patientName,
  signOutAction,
}: {
  readonly children: ReactNode;
  readonly patientName: string;
  readonly signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    document.body.classList.add('patient-portal-active');
    return () => document.body.classList.remove('patient-portal-active');
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToPatientRecordChanges(() => router.refresh());
    const interval = window.setInterval(() => router.refresh(), 30_000);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [router]);

  return (
    <div className='patient-portal min-h-screen bg-[#f7faff] text-slate-900 md:flex'>
      <a href='#patient-main-content' className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-sky-600 focus:text-white focus:rounded'>Skip to main content</a>
      <aside className='hidden w-64 shrink-0 md:block'>
        <div className='sticky top-0 h-screen overflow-y-auto doctor-sidebar'>
          <div className='doctor-sidebar-brand'><div className='doctor-sidebar-brand-mark'>R</div><div><h2>Roshi Health</h2><p>{patientName} · My Care</p></div></div>
          <nav aria-label='Patient clinical workspace navigation'>
            <div className='doctor-sidebar-group'><div className='doctor-sidebar-group-label'>My care</div><ul role='list'>{NAV_ITEMS.slice(0, 2).map(({ href, label, icon: Icon }) => <li key={href}><Link href={href} className={'doctor-sidebar-link' + ((pathname === href || pathname.startsWith(href + '/')) ? ' is-active' : '')}><span className='doctor-sidebar-link-content'><Icon size={17} aria-hidden='true' /><span>{label}</span></span></Link></li>)}</ul></div>
            <div className='doctor-sidebar-group'><div className='doctor-sidebar-group-label'>Health information</div><ul role='list'>{NAV_ITEMS.slice(2, 6).map(({ href, label, icon: Icon }) => <li key={href}><Link href={href} className={'doctor-sidebar-link' + ((pathname === href || pathname.startsWith(href + '/')) ? ' is-active' : '')}><span className='doctor-sidebar-link-content'><Icon size={17} aria-hidden='true' /><span>{label}</span></span></Link></li>)}</ul></div>
            <div className='doctor-sidebar-group'><div className='doctor-sidebar-group-label'>Care team</div><ul role='list'>{NAV_ITEMS.slice(6).map(({ href, label, icon: Icon }) => <li key={href}><Link href={href} className={'doctor-sidebar-link' + ((pathname === href || pathname.startsWith(href + '/')) ? ' is-active' : '')}><span className='doctor-sidebar-link-content'><Icon size={17} aria-hidden='true' /><span>{label}</span></span></Link></li>)}</ul></div>
          </nav>
        </div>
      </aside>
      <div className='min-w-0 flex-1'>
        <header className='border-b border-sky-100 bg-white'><div className='flex items-center justify-between gap-4 px-5 py-4 sm:px-8'><div className='flex items-center gap-3 md:hidden'><div className='grid h-10 w-10 place-items-center rounded-2xl bg-sky-600 text-base font-black text-white'>R</div><div><p className='text-base font-semibold text-slate-900'>Roshi Health</p><p className='text-sm text-slate-500'>Welcome, {patientName}</p></div></div><p className='hidden text-sm font-semibold text-slate-600 md:block'>Patient Clinical Workspace</p><form action={signOutAction}><button type='submit' className='flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50'><LogOut size={16} aria-hidden='true' />Sign out</button></form></div></header>
        <nav aria-label='Patient workspace navigation' className='flex gap-2 overflow-x-auto border-b border-sky-100 bg-white px-5 py-3 md:hidden'>{NAV_ITEMS.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ' + ((pathname === href || pathname.startsWith(href + '/')) ? 'bg-sky-600 text-white' : 'border border-slate-200 text-slate-600')}><Icon size={16} aria-hidden='true' />{label}</Link>)}</nav>
        <main id='patient-main-content' className='mx-auto max-w-6xl px-5 py-6 text-base leading-relaxed sm:px-8'>{children}</main>
      </div>
    </div>
  );
}
