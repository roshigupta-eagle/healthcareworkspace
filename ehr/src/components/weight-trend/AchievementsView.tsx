"use client";

import React, { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AchievementsModel, WeightAchievement, AchievementCategory } from '@/lib/weightAchievements';
import AchievementDetailsDrawer from './AchievementDetailsDrawer';
import FullAchievementCatalogDrawer from './FullAchievementCatalogDrawer';

const CATEGORY_LABELS: Record<'all' | AchievementCategory, string> = {
  all: 'All Categories',
  tracking: 'Tracking',
  consistency: 'Consistency',
  goal: 'Goals',
  'long-term': 'Long-Term',
};

const RARITY_STYLES: Record<string, { chip: string; accent: string; iconBg: string; iconText: string }> = {
  common: { chip: 'bg-blue-50 text-blue-700 border-blue-200', accent: '#3B82F6', iconBg: 'bg-blue-100', iconText: 'text-blue-700' },
  rare: { chip: 'bg-violet-50 text-violet-700 border-violet-200', accent: '#7C3AED', iconBg: 'bg-violet-100', iconText: 'text-violet-700' },
  epic: { chip: 'bg-pink-50 text-pink-700 border-pink-200', accent: '#DB2777', iconBg: 'bg-pink-100', iconText: 'text-pink-700' },
  legendary: { chip: 'bg-amber-50 text-amber-800 border-amber-200', accent: '#D97706', iconBg: 'bg-amber-100', iconText: 'text-amber-800' },
};

const CATEGORY_ICON_PATH: Record<AchievementCategory, string> = {
  tracking: 'M3 3v18M3 4h13l-2 4 2 4H3',
  consistency: 'M12 2c1.5 3 4 4.5 4 8a4 4 0 11-8 0c0-1.5.5-2.5 1.2-3.6.3.9 1 1.6 1.8 1.6-.4-2 .2-4 1-6z',
  goal: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 100 12 6 6 0 000-12zm0 4a2 2 0 100 4 2 2 0 000-4z',
  'long-term': 'M3 5h18M3 5v14a2 2 0 002 2h14a2 2 0 002-2V5M8 3v4M16 3v4',
};

function CategoryIcon({ category, className }: { category: AchievementCategory; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={CATEGORY_ICON_PATH[category]} />
    </svg>
  );
}
function AchievementCard({ a, onOpen }: { a: WeightAchievement; onOpen: () => void }) {
  const rarity = RARITY_STYLES[a.rarity] || RARITY_STYLES.common;
  const pct = a.progress ? Math.min(100, Math.round((a.progress.current / (a.progress.target || 1)) * 100)) : a.status === 'completed' ? 100 : 0;
  const isCompleted = a.status === 'completed';
  const isNotStarted = a.status === 'not-started';

  const summary =
    isCompleted
      ? `${a.title}. ${a.rarity} achievement. Completed${a.completedAt ? ` ${new Date(a.completedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}. Reward ${a.points} points.`
      : `${a.title}. ${a.rarity} achievement. ${a.status === 'in-progress' ? 'In progress' : 'Not started'}.${a.progress ? ` ${a.progress.current} of ${a.progress.target}${a.progress.unit === '%' ? '%' : ''}.` : ''} Reward ${a.points} points.`;

  return (
    <button
      onClick={onOpen}
      aria-label={summary}
      className={`weight-trend-surface text-left h-full min-h-[180px] flex flex-col p-5 transition-colors duration-150 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
        isCompleted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-100 hover:border-violet-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isNotStarted ? 'bg-slate-100 text-slate-400' : `${rarity.iconBg} ${rarity.iconText}`}`}>
          <CategoryIcon category={a.category} className="w-4 h-4" />
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border flex-shrink-0 ${rarity.chip}`}>{a.rarity}</span>
      </div>

      <div className="mt-2.5 flex-1">
        <div className="text-[15px] font-semibold text-slate-900 leading-snug">{a.title}</div>
        <div className="text-xs text-slate-500 mt-1 leading-relaxed">{a.description}</div>
      </div>

      <div className="mt-3">
        {isCompleted ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            Completed{a.completedAt ? ` · ${new Date(a.completedAt).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}` : ''}
          </div>
        ) : (
          <>
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${a.title} progress`}>
              <div className="h-1.5 rounded-full transition-all duration-150" style={{ width: `${pct}%`, background: isNotStarted ? '#CBD5E1' : rarity.accent }} />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[11px]">
              <span className="text-slate-500">{!isNotStarted && a.progress ? `${a.progress.current} / ${a.progress.target}${a.progress.unit === '%' ? '%' : ''}` : ''}</span>
              <span className={`font-semibold ${isNotStarted ? 'text-slate-400' : 'text-slate-600'}`}>{a.status === 'in-progress' ? 'In Progress' : 'Not Started'}</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 text-right">
        <span className="text-xs font-semibold" style={{ color: isNotStarted ? '#94A3B8' : rarity.accent }}>+{a.points} pts</span>
      </div>
    </button>
  );
}
export default function AchievementsView({
  model,
  onSetGoal,
}: {
  model: AchievementsModel | null;
  onSetGoal: () => void;
}) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [category, setCategory] = useState<'all' | AchievementCategory>('all');
  const [sort, setSort] = useState<'most-recent' | 'closest-to-unlock' | 'completed-first' | 'points'>('most-recent');
  const [selected, setSelected] = useState<WeightAchievement | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const list = useMemo(() => model?.list || [], [model]);
  const summary = model?.summary || null;
  const closestToUnlock = model?.closestToUnlock || null;

  const filtered = useMemo(() => {
    let items = list.slice();
    if (category !== 'all') items = items.filter((a) => a.category === category);
    if (sort === 'most-recent') items = items.sort((a, b) => (b.completedAt ? Date.parse(b.completedAt) : 0) - (a.completedAt ? Date.parse(a.completedAt) : 0));
    else if (sort === 'closest-to-unlock') {
      items = items.sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (b.status === 'completed' && a.status !== 'completed') return -1;
        const ra = a.progress ? a.progress.current / (a.progress.target || 1) : 0;
        const rb = b.progress ? b.progress.current / (b.progress.target || 1) : 0;
        return rb - ra;
      });
    } else if (sort === 'completed-first') items = items.sort((a, b) => (a.status === 'completed' ? -1 : 1) - (b.status === 'completed' ? -1 : 1));
    else if (sort === 'points') items = items.sort((a, b) => b.points - a.points);
    return items;
  }, [list, category, sort]);

  if (!model) {
    return (
      <div id="weight-panel-achievements" role="tabpanel" aria-labelledby="weight-tab-achievements" className="weight-trend-view" aria-busy="true" aria-live="polite">
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <section id="weight-panel-achievements" role="tabpanel" aria-labelledby="weight-tab-achievements" className="weight-trend-view">
      {/* Hero */}
      <div className="weight-trend-surface relative overflow-hidden bg-gradient-to-br from-violet-50 via-violet-50/60 to-white p-6 lg:p-7">
        <div className="relative flex flex-col lg:flex-row gap-6 items-stretch">
          <div className="flex-1 min-w-0">
            <h2 id="achievements-heading" className="text-2xl font-bold text-slate-900">Achievements</h2>
            <p className="text-sm text-slate-600 mt-1.5 max-w-sm">Tracking engagement and progress toward documented goals, based on all-time valid measurements.</p>
            <div className="mt-4 flex gap-3 flex-wrap">
              <div className="bg-white/80 rounded-xl px-4 py-3 shadow-sm border border-violet-100/60">
                <div className="text-[11px] font-semibold text-violet-700 uppercase tracking-wide">Completed</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5 tabular-nums">{summary!.completed}</div>
                <div className="text-xs text-slate-500">of {summary!.total} core achievements</div>
              </div>
              <div className="bg-white/80 rounded-xl px-4 py-3 shadow-sm border border-violet-100/60">
                <div className="text-[11px] font-semibold text-violet-700 uppercase tracking-wide">Total Points</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5 tabular-nums">{summary!.points}</div>
                <div className="text-xs text-slate-500">Earned across all achievements</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center flex-shrink-0 py-2">
            <div className="relative w-32 h-32 lg:w-36 lg:h-36 rounded-full bg-gradient-to-br from-violet-200/70 via-violet-100 to-white flex items-center justify-center shadow-inner">
              <div className="absolute inset-2 rounded-full border border-violet-200/60" aria-hidden />
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M8 21h8M12 17v4M6 4h12v2a6 6 0 01-12 0V4z" stroke="#7C3AED" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="#EDE9FE" />
                <path d="M6 6H4a2 2 0 002 4M18 6h2a2 2 0 01-2 4" stroke="#7C3AED" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.4" fill="#7C3AED" opacity="0.85" />
              </svg>
            </div>
          </div>

          <div className="w-full lg:w-72 flex-shrink-0 flex flex-col justify-center gap-4">
            <div>
              <div className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Overall Progress</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-slate-900 tabular-nums">{summary!.completed} / {summary!.total}</span>
                <span className="text-xs text-slate-500">achievements completed</span>
              </div>
              <div className="mt-2 w-full bg-violet-100/70 h-2.5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(summary!.completionPercent)} aria-valuemin={0} aria-valuemax={100} aria-label="Overall achievement progress">
                <div className="h-2.5 rounded-full bg-violet-600 transition-all duration-150" style={{ width: `${summary!.completionPercent}%` }} />
              </div>
              <div className="text-xs text-slate-500 text-right mt-1 font-medium">{Math.round(summary!.completionPercent)}%</div>
            </div>

            {closestToUnlock ? (
              <div className="rounded-xl bg-white/80 border border-violet-100/60 p-3.5">
                <div className="text-[11px] font-semibold text-violet-700 uppercase tracking-wide">Next Unlock</div>
                <div className="font-bold text-slate-900 mt-0.5">{closestToUnlock.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{closestToUnlock.description}</div>
                {closestToUnlock.progress && (
                  <div className="text-xs text-slate-600 font-semibold mt-1.5 tabular-nums">{closestToUnlock.progress.current} / {closestToUnlock.progress.target}{closestToUnlock.progress.unit === '%' ? '%' : ''}</div>
                )}
                <button onClick={() => setSelected(closestToUnlock)} className="mt-2 text-xs font-semibold text-violet-700 hover:underline">View Details →</button>
              </div>
            ) : (
              <div className="rounded-xl bg-white/80 border border-violet-100/60 p-3.5">
                <div className="text-[11px] font-semibold text-violet-700 uppercase tracking-wide">Next Unlock</div>
                <div className="text-sm text-slate-600 mt-1">All eligible achievements are complete.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[17px] font-semibold text-slate-900">Your Achievements</h3>
        <div className="flex items-center gap-2.5 flex-wrap">
          <label className="text-xs text-slate-500" htmlFor="achv-category">Category</label>
          <select id="achv-category" value={category} onChange={(e) => setCategory(e.target.value as 'all' | AchievementCategory)} className="weight-trend-control border border-slate-200 rounded-lg px-2.5 text-xs">
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="text-xs text-slate-500" htmlFor="achv-sort">Sort</label>
          <select id="achv-sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="weight-trend-control border border-slate-200 rounded-lg px-2.5 text-xs">
            <option value="most-recent">Most Recent</option>
            <option value="closest-to-unlock">Closest to Unlock</option>
            <option value="completed-first">Completed First</option>
            <option value="points">Points</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {filtered.map((a) => (
          <AchievementCard key={a.id} a={a} onOpen={() => setSelected(a)} />
        ))}
      </div>

      {/* Banner */}
      <div className="weight-trend-surface bg-violet-50/70 border-violet-100 p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M20 12v9H4v-9M2 7h20v5H2V7zm10 0v14M12 7a2.5 2.5 0 010-5C13.5 2 15 4 12 7zm0 0a2.5 2.5 0 000-5C10.5 2 9 4 12 7z" /></svg>
          </div>
          <div>
            <div className="font-semibold text-slate-900">New achievements coming soon!</div>
            <div className="text-sm text-slate-600">We&apos;re continuing to expand the achievement catalog.</div>
          </div>
        </div>
        <button onClick={() => setCatalogOpen(true)} className="px-4 py-2 border border-violet-200 rounded-lg text-violet-700 bg-white text-sm font-semibold hover:bg-violet-50 flex-shrink-0">View All Achievements →</button>
      </div>

      {selected && (
        <AchievementDetailsDrawer
          achievement={selected}
          onClose={() => setSelected(null)}
          onSetGoal={() => { setSelected(null); onSetGoal(); }}
          onViewMeasurements={() => { setSelected(null); router.replace(`${pathname}?tab=log&achievement=${encodeURIComponent(selected.id)}`, { scroll: false }); }}
        />
      )}

      {catalogOpen && (
        <FullAchievementCatalogDrawer
          achievements={list}
          onClose={() => setCatalogOpen(false)}
          onSelect={(a) => { setCatalogOpen(false); setSelected(a); }}
        />
      )}
    </section>
  );
}
