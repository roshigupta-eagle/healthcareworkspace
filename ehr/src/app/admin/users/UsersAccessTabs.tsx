'use client';

import { useState, type ReactNode } from 'react';

const tabs = [
  ['users', 'Users'],
  ['roles', 'Roles'],
  ['permissions', 'Permissions'],
  ['invitations', 'Invitations'],
  ['services', 'Service Identities'],
  ['authentication', 'Authentication'],
] as const;

export default function UsersAccessTabs({ children }: { readonly children: ReactNode }) {
  const [active, setActive] = useState<(typeof tabs)[number][0]>('users');
  return <div className='space-y-5'>
    <div role='tablist' aria-label='Users and access sections' className='flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm'>
      {tabs.map(([id, label]) => <button key={id} type='button' role='tab' aria-selected={active === id} onClick={() => setActive(id)} className={'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-teal-600 ' + (active === id ? 'bg-[#063d40] text-white' : 'text-slate-600 hover:bg-slate-100')}>{label}</button>)}
    </div>
    {active === 'users' ? children : <section role='tabpanel' className='rounded-xl border border-slate-200 bg-white p-6 shadow-sm'><h2 className='text-lg font-semibold text-slate-900'>{tabs.find(([id]) => id === active)?.[1]}</h2><p className='mt-2 max-w-2xl text-sm leading-6 text-slate-600'>This administrative capability requires a persisted identity and authorization policy service. It is intentionally unavailable until a server-authorized workflow and audit trail are configured.</p></section>}
  </div>;
}
