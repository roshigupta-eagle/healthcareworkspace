"use client";

import { DocumentIcon } from './Icons';

export function NotesLoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading Doctor Notes">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[74px] rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_300px] gap-4">
        <div className="h-[420px] rounded-xl bg-slate-100 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="h-[420px] rounded-xl bg-slate-100 animate-pulse" />
      </div>
    </div>
  );
}

export function NoNotesEmptyState({ onAddNote }: { onAddNote: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm py-16 px-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <DocumentIcon size={22} />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">No doctor notes yet</h2>
      <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">Clinical documentation will appear here once a note is created.</p>
      <button type="button" onClick={onAddNote} className="mt-4 px-4 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700">
        + Add New Note
      </button>
    </div>
  );
}

export function NotesPageError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 py-14 px-6 text-center">
      <h2 className="text-lg font-semibold text-rose-800">We couldn&apos;t load Doctor Notes</h2>
      <p className="mt-1 text-sm text-rose-700">Please try again. Your patient context above is unaffected.</p>
      <button type="button" onClick={onRetry} className="mt-4 px-4 py-2 text-sm font-semibold rounded-md bg-rose-600 text-white hover:bg-rose-700">
        Try Again
      </button>
    </div>
  );
}
