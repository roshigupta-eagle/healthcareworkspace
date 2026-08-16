"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SearchBar from './SearchBarClient';
import ThemeLangControlsClient from './ThemeLangControlsClient';
import CommandPaletteClient from './CommandPaletteClient';

export default function GlobalHeader({ session, role }: { session?: any; role?: string }) {
  const [unread, setUnread] = useState(3);
  const [syncStatus, setSyncStatus] = useState({ ok: true, last: '2 min ago' });
  const tenant = session?.user?.tenant || 'Maple Health';
  const searchParams = useSearchParams();
  const noAuth = !!(searchParams && (searchParams.get('noauth') === '1' || searchParams.get('noauth') === 'true'));
  const homeHref = noAuth || role === 'DOCTOR' || role === 'ADMIN' ? '/doctor' : '/dashboard';

  

  return (
    <header className="mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link href={homeHref} className="flex items-center gap-3">
          <div className="rounded-md bg-indigo-600 text-white px-3 py-2 font-semibold shadow">R</div>
          <div className="text-lg font-semibold">Roshi EHR</div>
        </Link>

        <div className="hidden sm:block">
          <select aria-label="Facility selector" defaultValue={tenant} className="rounded-md border border-gray-200 px-2 py-1 text-sm">
            <option>Maple Health</option>
            <option>Northern Care</option>
            <option>Community Health</option>
          </select>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <SearchBar />
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <span className={`inline-block w-2 h-2 rounded-full ${syncStatus.ok ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <span className="text-xs">{syncStatus.ok ? 'Connected' : 'Syncing'}</span>
            <span className="text-xs text-gray-400">• Last: {syncStatus.last}</span>
          </div>
        </div>

        <div className="relative">
          <button aria-label="Notifications" className="relative p-2 rounded hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unread > 0 && <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">{unread}</span>}
          </button>
        </div>

        <div className="hidden sm:block">
          <ThemeLangControlsClient />
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs px-2 py-1 rounded bg-gray-100">Ctrl+K</div>
          <Link href="/profile" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-700">{(session?.user?.name || 'Me').split(' ').map((s:string)=>s[0]).slice(0,2).join('')}</div>
          </Link>
        </div>
      </div>
      <CommandPaletteClient />
    </header>
  );
}
