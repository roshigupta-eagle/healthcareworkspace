'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Bell, CalendarDays, ClipboardCheck, Gauge, Menu, PlugZap, Search, Settings2, ShieldCheck, SlidersHorizontal, UsersRound, Video, X, type LucideIcon } from 'lucide-react';
import { subscribeToPatientRecordChanges } from '@/lib/patientRecordSync';

type AdminNavItem = { readonly group: string; readonly href: string; readonly label: string; readonly icon: LucideIcon };

export const ADMIN_NAVIGATION: readonly AdminNavItem[] = [
  { group: 'Overview', href: '/admin', label: 'Dashboard', icon: Gauge },
  { group: 'People & access', href: '/admin/users', label: 'Users & Access', icon: UsersRound },
  { group: 'People & access', href: '/admin/patients', label: 'Patients & Accounts', icon: ClipboardCheck },
  { group: 'Operations', href: '/admin/operations', label: 'Scheduling & Encounters', icon: CalendarDays },
  { group: 'Operations', href: '/admin/telehealth', label: 'Telehealth & Communication', icon: Video },
  { group: 'Configuration', href: '/admin/clinical-configuration', label: 'Clinical Configuration', icon: SlidersHorizontal },
  { group: 'Configuration', href: '/admin/integrations', label: 'FHIR & Integrations', icon: PlugZap },
  { group: 'Governance', href: '/admin/security', label: 'Audit & Security', icon: ShieldCheck },
  { group: 'Governance', href: '/admin/analytics', label: 'Analytics & Reports', icon: BarChart3 },
  { group: 'System', href: '/admin/settings', label: 'System & Settings', icon: Settings2 },
];

export function AdminConsoleShell({ children, adminName }: { readonly children: ReactNode; readonly adminName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('admin-console-active');
    return () => document.body.classList.remove('admin-console-active');
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToPatientRecordChanges(() => router.refresh());
    const interval = window.setInterval(() => router.refresh(), 30_000);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [router]);

  const groups = ADMIN_NAVIGATION.reduce<Record<string, AdminNavItem[]>>((result, item) => {
    (result[item.group] ??= []).push(item);
    return result;
  }, {});
  const active = (path: string) => path === '/admin' ? pathname === path : pathname.startsWith(path);

  return (
    <div className='admin-console min-h-screen bg-[#f4f8f8] text-slate-950'>
      <button type='button' aria-label={open ? 'Close administration navigation' : 'Open administration navigation'} aria-expanded={open} onClick={() => setOpen(!open)} className='fixed left-4 top-4 z-50 rounded-lg bg-[#063d40] p-2 text-white shadow-lg md:hidden'>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && <button className='fixed inset-0 z-30 bg-slate-950/45 md:hidden' aria-label='Close navigation overlay' onClick={() => setOpen(false)} />}
      <aside className={'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#063d40] px-3 py-5 text-white shadow-2xl transition-transform md:translate-x-0 ' + (open ? 'translate-x-0' : '-translate-x-full')}>
        <div className='mb-7 flex items-center gap-3 px-3'><div className='grid h-9 w-9 place-items-center rounded-xl bg-[#7dddcf] text-sm font-black text-[#063d40]'>R</div><div><p className='text-sm font-bold tracking-wide'>ROSHI EHR</p><p className='text-xs text-teal-200'>Admin Console</p></div></div>
        <nav aria-label='Admin Console navigation' className='min-h-0 flex-1 overflow-y-auto'>
          {Object.entries(groups).map(([group, items]) => <section key={group} className='mb-5'><h2 className='px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-300/75'>{group}</h2><div className='space-y-1'>{items.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={'flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ' + (active(item.href) ? 'bg-[#bff3e7] text-[#083b3c]' : 'text-teal-50 hover:bg-white/10')}><Icon size={18} aria-hidden='true' /><span>{item.label}</span></Link>; })}</div></section>)}
        </nav>
      </aside>
      <div className='md:pl-64'><header className='sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:px-8'><div className='hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 sm:block'>Admin Console</div><div className='relative min-w-0 flex-1'><Search className='absolute left-3 top-2.5 text-slate-400' size={17} /><input aria-label='Search administrative workspace' placeholder='Search users, patients, integrations, or settings' className='h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100' /></div><button type='button' aria-label='Administrative notifications' className='rounded-lg p-2 text-slate-600 hover:bg-slate-100'><Bell size={19} /></button><div className='hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex'><div className='grid h-8 w-8 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-800'>{adminName.slice(0, 2).toUpperCase()}</div><span className='max-w-28 truncate text-sm font-medium text-slate-700'>{adminName}</span></div></header><main className='mx-auto w-full max-w-[1680px] px-5 py-7 sm:px-8 lg:px-10'>{children}</main></div>
    </div>
  );
}
