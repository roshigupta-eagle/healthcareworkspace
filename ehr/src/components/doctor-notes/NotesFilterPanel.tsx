"use client";

import { useState } from 'react';
import type { DoctorNoteStatus, DoctorNoteType } from '@/types/doctorNote';
import { NOTE_STATUS_LABELS, NOTE_TYPE_LABELS, NOTE_TYPE_ORDER, NOTE_TYPE_STYLES } from './constants';
import { SearchIcon, ChevronRightIcon } from './Icons';

export type NoteFilters = {
  search: string;
  type: 'all' | DoctorNoteType;
  provider: string;
  dateRange: '30d' | '90d' | '6m' | '1y' | 'all';
  status: 'all' | DoctorNoteStatus;
  followUp: 'all' | 'has' | 'none';
  mine: boolean;
  needsAction: boolean;
};

export const DEFAULT_FILTERS: NoteFilters = {
  search: '',
  type: 'all',
  provider: 'all',
  dateRange: 'all',
  status: 'all',
  followUp: 'all',
  mine: false,
  needsAction: false,
};

type SavedView = { id: string; label: string; apply: Partial<NoteFilters> };

const SAVED_VIEWS: SavedView[] = [
  { id: 'my-drafts', label: 'My Drafts', apply: { mine: true, status: 'draft' } },
  { id: 'recent-followups', label: 'Recent Follow-Ups', apply: { followUp: 'has', dateRange: '90d' } },
  { id: 'unsigned', label: 'Unsigned Notes', apply: { status: 'draft' } },
  { id: 'my-notes', label: 'My Notes', apply: { mine: true } },
];

type Props = {
  filters: NoteFilters;
  onChange: (next: NoteFilters) => void;
  providers: string[];
};

export default function NotesFilterPanel({ filters, onChange, providers }: Props) {
  const [savedViewsOpen, setSavedViewsOpen] = useState(false);

  function set<K extends keyof NoteFilters>(key: K, value: NoteFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function applyView(view: SavedView) {
    onChange({ ...DEFAULT_FILTERS, ...view.apply });
    setSavedViewsOpen(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sticky top-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
        <button type="button" onClick={() => onChange(DEFAULT_FILTERS)} className="text-xs font-medium text-teal-700 hover:text-teal-800">
          Clear
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="notes-search" className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
            Search
          </label>
          <div className="relative">
            <SearchIcon size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="notes-search"
              value={filters.search}
              onChange={(e) => set('search', e.target.value)}
              placeholder="Search Notes..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
            />
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Note Type</div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => set('type', 'all')}
              className={`px-2.5 py-1 text-xs rounded-full border transition ${filters.type === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
            >
              All
            </button>
            {NOTE_TYPE_ORDER.map((t) => {
              const style = NOTE_TYPE_STYLES[t];
              const active = filters.type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition ${active ? `${style.chip} ${style.text} ring-1 ring-inset ring-current` : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  {NOTE_TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="notes-provider" className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
            Provider
          </label>
          <select
            id="notes-provider"
            value={filters.provider}
            onChange={(e) => set('provider', e.target.value)}
            className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
          >
            <option value="all">All Providers</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="notes-date-range" className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
            Date Range
          </label>
          <select
            id="notes-date-range"
            value={filters.dateRange}
            onChange={(e) => set('dateRange', e.target.value as NoteFilters['dateRange'])}
            className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
          >
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last 1 Year</option>
            <option value="all">All Time</option>
          </select>
        </div>

        <div>
          <label htmlFor="notes-status" className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
            Documentation Status
          </label>
          <select
            id="notes-status"
            value={filters.status}
            onChange={(e) => set('status', e.target.value as NoteFilters['status'])}
            className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
          >
            <option value="all">All Statuses</option>
            {(Object.keys(NOTE_STATUS_LABELS) as DoctorNoteStatus[]).map((s) => (
              <option key={s} value={s}>
                {NOTE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="notes-followup" className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
            Follow-Up
          </label>
          <select
            id="notes-followup"
            value={filters.followUp}
            onChange={(e) => set('followUp', e.target.value as NoteFilters['followUp'])}
            className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
          >
            <option value="all">All Notes</option>
            <option value="has">Has Follow-Up</option>
            <option value="none">No Follow-Up</option>
          </select>
        </div>

        <div className="space-y-2 pt-1 border-t border-slate-100">
          <label className="flex items-center gap-2 text-sm text-slate-700 pt-3">
            <input type="checkbox" checked={filters.mine} onChange={(e) => set('mine', e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-400" />
            My Notes
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={filters.needsAction} onChange={(e) => set('needsAction', e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-400" />
            Needs My Action
          </label>
        </div>

        <div className="pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSavedViewsOpen((v) => !v)}
            aria-expanded={savedViewsOpen}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 pt-3"
          >
            Saved Views
            <ChevronRightIcon size={13} className={`transition-transform ${savedViewsOpen ? 'rotate-90' : ''}`} />
          </button>
          {savedViewsOpen && (
            <div className="mt-2 space-y-1">
              {SAVED_VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => applyView(v)}
                  className="w-full text-left text-xs px-2.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-50"
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
