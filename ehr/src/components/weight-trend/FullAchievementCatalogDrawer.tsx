"use client";

import React, { useMemo, useState } from 'react';
import type { WeightAchievement } from '@/lib/weightAchievements';

const CATEGORY_LABELS: Record<string, string> = { all: 'All Categories', tracking: 'Tracking', consistency: 'Consistency', goal: 'Goals', 'long-term': 'Long-Term' };
const STATUS_LABELS: Record<string, string> = { all: 'All', completed: 'Completed', 'in-progress': 'In Progress', 'not-started': 'Not Started' };
const RARITY_ORDER = ['legendary', 'epic', 'rare', 'common'];

export default function FullAchievementCatalogDrawer({
  achievements,
  onClose,
  onSelect,
}: {
  achievements: WeightAchievement[];
  onClose: () => void;
  onSelect: (a: WeightAchievement) => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [rarity, setRarity] = useState('all');
  const [sort, setSort] = useState('rarity');

  const filtered = useMemo(() => {
    let list = achievements.slice();
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
    }
    if (category !== 'all') list = list.filter((a) => a.category === category);
    if (status !== 'all') list = list.filter((a) => a.status === status);
    if (rarity !== 'all') list = list.filter((a) => a.rarity === rarity);
    if (sort === 'rarity') list = list.sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
    else if (sort === 'points') list = list.sort((a, b) => b.points - a.points);
    else if (sort === 'status') list = list.sort((a, b) => (a.status === 'completed' ? -1 : b.status === 'completed' ? 1 : 0));
    return list;
  }, [achievements, search, category, status, rarity, sort]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Full Achievement Catalog</h2>
            <p className="text-xs text-slate-500">{achievements.length} achievements documented</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-6 py-3">
          <input
            type="text"
            placeholder="Search achievements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-[220px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={rarity} onChange={(e) => setRarity(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
            <option value="all">All Rarities</option>
            {RARITY_ORDER.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
            <option value="rarity">Sort: Rarity</option>
            <option value="points">Sort: Points</option>
            <option value="status">Sort: Completed First</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-8">No achievements match these filters.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onSelect(a)}
                  className={`text-left rounded-xl border p-3.5 hover:border-violet-200 hover:bg-violet-50/30 transition-colors ${a.status === 'completed' ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-sm">{a.title}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">{a.rarity}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{a.description}</p>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className={a.status === 'completed' ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>{a.status === 'completed' ? '✓ Completed' : a.status === 'in-progress' ? 'In Progress' : 'Not Started'}</span>
                    <span className="font-semibold text-slate-700">+{a.points} pts</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4 flex items-center justify-end">
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  );
}
