"use client";

import { useState } from 'react';
import Drawer from '@/components/doctor-notes/Drawer';
import type { SummaryFilter } from './SummaryStrip';

export type ConcernFilters = {
  search: string;
  provider: string;
  category: string;
  updatedSinceLastVisit: boolean;
  assignedToMe: boolean;
  hasFollowUp: 'all' | 'has' | 'none';
};

export const DEFAULT_CONCERN_FILTERS: ConcernFilters = {
  search: '',
  provider: 'all',
  category: 'all',
  updatedSinceLastVisit: false,
  assignedToMe: false,
  hasFollowUp: 'all',
};

const QUICK_FILTERS: Array<{ key: SummaryFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'monitoring', label: 'Monitoring' },
  { key: 'needs-review', label: 'Needs Review' },
  { key: 'resolved', label: 'Resolved' },
];

type Props = {
  quickFilter: SummaryFilter;
  onQuickFilterChange: (f: SummaryFilter) => void;
  filters: ConcernFilters;
  onFiltersChange: (f: ConcernFilters) => void;
  providers: string[];
};

export default function ConcernFilterBar({ quickFilter, onQuickFilterChange, filters, onFiltersChange, providers }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);

  function set<K extends keyof ConcernFilters>(key: K, value: ConcernFilters[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  const activeChips: Array<{ key: string; label: string; onRemove: () => void }> = [];
  if (quickFilter !== 'all') activeChips.push({ key: 'quick', label: QUICK_FILTERS.find((q) => q.key === quickFilter)?.label || quickFilter, onRemove: () => onQuickFilterChange('all') });
  if (filters.provider !== 'all') activeChips.push({ key: 'provider', label: filters.provider, onRemove: () => set('provider', 'all') });
  if (filters.category !== 'all') activeChips.push({ key: 'category', label: filters.category, onRemove: () => set('category', 'all') });
  if (filters.updatedSinceLastVisit) activeChips.push({ key: 'updated', label: 'Updated Since Last Visit', onRemove: () => set('updatedSinceLastVisit', false) });
  if (filters.assignedToMe) activeChips.push({ key: 'mine', label: 'Assigned to Me', onRemove: () => set('assignedToMe', false) });
  if (filters.hasFollowUp !== 'all') activeChips.push({ key: 'followup', label: filters.hasFollowUp === 'has' ? 'Has Follow-Up' : 'No Follow-Up', onRemove: () => set('hasFollowUp', 'all') });

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onQuickFilterChange(f.key)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full border transition ${quickFilter === f.key ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
          >
            {f.label}
          </button>
        ))}
        <button type="button" onClick={() => setMoreOpen(true)} className="px-2.5 py-1 text-xs font-medium rounded-full border border-slate-200 text-slate-600 hover:border-slate-300">
          More Filters
        </button>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <span key={chip.key} className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
              {chip.label}
              <button type="button" onClick={chip.onRemove} aria-label={`Remove ${chip.label} filter`} className="hover:text-teal-900">
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => {
              onQuickFilterChange('all');
              onFiltersChange(DEFAULT_CONCERN_FILTERS);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            Clear All
          </button>
        </div>
      )}

      {moreOpen && (
        <Drawer title="More Filters" onClose={() => setMoreOpen(false)} width="md">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Search Concerns</label>
              <input
                value={filters.search}
                onChange={(e) => set('search', e.target.value)}
                placeholder="Search Concerns..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Provider</label>
              <select value={filters.provider} onChange={(e) => set('provider', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200">
                <option value="all">All Providers</option>
                {providers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Category</label>
              <select value={filters.category} onChange={(e) => set('category', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200">
                <option value="all">All Categories</option>
                <option value="Health concern">Health concern</option>
                <option value="Problem">Problem</option>
                <option value="Symptom">Symptom</option>
                <option value="Diagnosis">Diagnosis</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Follow-Up</label>
              <select value={filters.hasFollowUp} onChange={(e) => set('hasFollowUp', e.target.value as ConcernFilters['hasFollowUp'])} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200">
                <option value="all">All concerns</option>
                <option value="has">Has Follow-Up</option>
                <option value="none">No Follow-Up</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={filters.updatedSinceLastVisit} onChange={(e) => set('updatedSinceLastVisit', e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-400" />
              Updated Since Last Visit
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={filters.assignedToMe} onChange={(e) => set('assignedToMe', e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-400" />
              Assigned to Me
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onFiltersChange(DEFAULT_CONCERN_FILTERS);
                }}
                className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Clear Filters
              </button>
              <button type="button" onClick={() => setMoreOpen(false)} className="px-4 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700">
                Apply Filters
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
