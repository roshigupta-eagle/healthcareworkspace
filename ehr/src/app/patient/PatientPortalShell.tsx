'use client';

import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { CalendarDays, FileHeart, FileText, History, Home, LogOut, MessageCircle, TestTube } from 'lucide-react';

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
  const searchParams = useSearchParams();
  const preview = searchParams.get('asUser') === 'patient-001' ? '?asUser=patient-001&noauth=1' : '';

  useEffect(() => {
    document.body.classList.add('patient-portal-active');
    return () => document.body.classList.remove('patient-portal-active');
  }, []);

  return (
    <div className='patient-portal min-h-screen bg-[#f7faff] text-slate-900'>
      <header className='border-b border-sky-100 bg-white'>
        <div className='mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4 sm:px-8'>
          <div className='flex items-center gap-3'>
            <div className='grid h-10 w-10 place-items-center rounded-2xl bg-sky-600 text-base font-black text-white'>R</div>
            <div><p className='text-base font-semibold text-slate-900'>Roshi Health</p><p className='text-sm text-slate-500'>Welcome, {patientName}</p></div>
          </div>
          <form action={signOutAction}>
            <button type='submit' className='flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50'>
              <LogOut size={16} aria-hidden='true' />
              Sign out
            </button>
          </form>
        </div>
      </header>
      <nav aria-label='Patient portal navigation' className='mx-auto flex max-w-4xl flex-wrap gap-2 px-5 pt-5 sm:px-8'>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href + preview} className={'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ' + (active ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-sky-50')}>
              <Icon size={17} aria-hidden='true' />
              {label}
            </Link>
          );
        })}
      </nav>
      <main className='mx-auto max-w-4xl px-5 py-6 text-base leading-relaxed sm:px-8'>{children}</main>
    </div>
  );
}
