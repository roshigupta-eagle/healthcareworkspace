'use client';

import { useState } from 'react';
import { CircleAlert, CircleHelp, ExternalLink } from 'lucide-react';

export type AdminWorkspaceTab = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly state: 'available' | 'unknown';
};

export function AdminWorkspacePage({
  title,
  description,
  tabs,
  actions = [],
}: {
  readonly title: string;
  readonly description: string;
  readonly tabs: readonly AdminWorkspaceTab[];
  readonly actions?: readonly { label: string; href: string }[];
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? 'overview');
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return <div className='space-y-6'>
    <header><p className='text-xs font-bold uppercase tracking-[0.14em] text-teal-700'>Administrative workspace</p><h1 className='mt-2 text-3xl font-semibold tracking-tight text-slate-950'>{title}</h1><p className='mt-2 max-w-3xl text-sm text-slate-600'>{description}</p></header>
    <div role='tablist' aria-label={title + ' sections'} className='flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm'>
      {tabs.map((tab) => <button key={tab.id} type='button' role='tab' aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-teal-600 ' + (activeTab === tab.id ? 'bg-[#063d40] text-white' : 'text-slate-600 hover:bg-slate-100')}>{tab.label}</button>)}
    </div>
    {active && <section role='tabpanel' className='grid gap-5 lg:grid-cols-[1fr_300px]'>
      <article className='rounded-xl border border-slate-200 bg-white p-6 shadow-sm'><div className='flex items-start gap-3'>{active.state === 'available' ? <CircleHelp className='mt-0.5 text-teal-700' size={20} /> : <CircleAlert className='mt-0.5 text-slate-500' size={20} />}<div><h2 className='text-lg font-semibold text-slate-900'>{active.label}</h2><p className='mt-2 text-sm leading-6 text-slate-600'>{active.description}</p></div></div><div className='mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600'>{active.state === 'available' ? 'Use the linked administrative workflow to review the current data.' : 'No verified administrative read model is connected for this section. The console will not infer a healthy status or fabricate configuration values.'}</div></article>
      <aside className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'><h2 className='text-sm font-bold text-slate-900'>Available actions</h2><div className='mt-3 space-y-2'>{actions.length === 0 ? <p className='text-sm text-slate-500'>No persisted action is available in this workspace yet.</p> : actions.map((action) => <a key={action.href} href={action.href} className='flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50'>{action.label}<ExternalLink size={15} /></a>)}</div></aside>
    </section>}
  </div>;
}
