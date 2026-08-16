"use client";

import React, { useState, useRef } from 'react';
import FilterPopover from './FilterPopover';

type Filters = {
  priorities: any[];
  statuses: any[];
  assignedTo?: string | null;
};

type Props = {
  search?: string;
  onSearch?: (q: string) => void;
  onNew?: () => void;
  onFilterChange?: (f: Filters) => void;
  filters?: Filters;
};

export default function TopHeader({ search = '', onSearch, onNew, onFilterChange, filters }: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  return (
    <header className="w-full bg-transparent py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full max-w-2xl">
          <div className="relative w-full">
            <span className="absolute left-3 top-2.5 text-slate-400" aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="1.5"/><path d="M21 21l-4.35-4.35" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </span>
            <input
              aria-label="Search tasks"
              value={search}
              onChange={(e) => onSearch?.(e.target.value)}
              placeholder="Search patient, record, task..."
              className="w-full rounded-md border border-gray-200 bg-white px-10 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button ref={anchorRef} onClick={() => setFilterOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={filterOpen} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 4H2l7 8v6l6-4v-4l7-6z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="text-sm text-slate-700">Filters</span>
            </button>

            {filterOpen && (
              <div className="absolute right-0 mt-2">
                <FilterPopover value={filters ?? { priorities: [], statuses: [], assignedTo: undefined }} onChange={(v) => { onFilterChange?.(v); }} />
              </div>
            )}
          </div>

          <div>
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              <option>Sort: Due date</option>
              <option>Sort: Priority</option>
            </select>
          </div>

          <button onClick={onNew} className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-md shadow">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="text-sm font-semibold">New Task</span>
          </button>

          <div className="relative">
            <button className="p-2 rounded bg-white border border-gray-200" aria-label="Notifications">🔔</button>
            <span className="absolute -top-1 -right-1 text-xs bg-rose-600 text-white rounded-full px-1">3</span>
          </div>

          <div className="flex items-center gap-3 pl-3 border-l border-gray-100">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm text-slate-600">AP</div>
            <div className="text-sm text-slate-700">
              <div className="font-medium">Dr. A. Patel</div>
              <div className="text-xs text-slate-400">General Practitioner</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
