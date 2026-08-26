"use client";

import { ActivityIcon } from './Icons';

export function ConcernsLoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading Health Concerns">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[70px] rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="h-8 w-64 rounded bg-slate-100 animate-pulse" />
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function NoConcernsEmptyState({ onAdd, onViewResolved }: { onAdd: () => void; onViewResolved: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm py-16 px-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <ActivityIcon size={22} />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">No current health concerns recorded</h2>
      <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">Current problems and symptoms will appear here when documented.</p>
      <div className="mt-4 flex justify-center gap-2">
        <button type="button" onClick={onAdd} className="px-4 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700">
          + Add Concern
        </button>
        <button type="button" onClick={onViewResolved} className="px-4 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
          View Resolved
        </button>
      </div>
    </div>
  );
}

export function FilterEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 py-10 text-center">
      <div className="text-sm font-medium text-slate-700">No concerns match these filters</div>
      <button type="button" onClick={onClear} className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800">
        Clear Filters
      </button>
    </div>
  );
}

export function ConcernsPageError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 py-14 px-6 text-center">
      <h2 className="text-lg font-semibold text-rose-800">We couldn&apos;t load health concerns</h2>
      <p className="mt-1 text-sm text-rose-700">Please try again. Your patient context above is unaffected.</p>
      <button type="button" onClick={onRetry} className="mt-4 px-4 py-2 text-sm font-semibold rounded-md bg-rose-600 text-white hover:bg-rose-700">
        Try Again
      </button>
    </div>
  );
}
