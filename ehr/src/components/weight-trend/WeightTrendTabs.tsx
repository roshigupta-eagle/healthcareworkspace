"use client";

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Props = {
  achievementsCompleted?: number;
  achievementsTotal?: number;
};

const TABS: { key: string; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'insights', label: 'Insights' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'log', label: 'Log' },
];

export default function WeightTrendTabs({ achievementsCompleted, achievementsTotal }: Props) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = (searchParams?.get('tab') || 'overview').toLowerCase();
  const active = TABS.some((tab) => tab.key === requestedTab) ? requestedTab : requestedTab === 'acheivments' ? 'achievements' : 'overview';

  function selectTab(key: string) {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('tab', key);
    if (key !== 'log') params.delete('achievement');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    selectTab(TABS[nextIndex].key);
    document.getElementById(`weight-tab-${TABS[nextIndex].key}`)?.focus();
  }

  return (
    <nav aria-label="Weight Trend Tabs" className="mt-3 mb-6">
      <div className="border-b border-slate-200">
        <div role="tablist" aria-label="Weight Trend Tabs" className="flex gap-8 overflow-x-auto py-1">
          {TABS.map((t) => {
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                id={`weight-tab-${t.key}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`weight-panel-${t.key}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => selectTab(t.key)}
                onKeyDown={(event) => handleKeyDown(event, TABS.findIndex((tab) => tab.key === t.key))}
                className={`inline-flex items-center gap-2 py-3.5 px-1 text-sm sm:text-base font-bold transition-all duration-150 border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'text-teal-800 border-teal-600'
                    : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <span>{t.label}</span>
                {t.key === 'achievements' && achievementsCompleted != null && achievementsTotal != null && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-teal-100 text-teal-900' : 'bg-slate-100 text-slate-600'}`}>
                    {achievementsCompleted}/{achievementsTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
