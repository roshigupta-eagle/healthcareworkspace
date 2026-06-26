"use client";

import React, { useState, useEffect } from 'react';

type Props = {
  onSearch?: (q: string) => void;
};

export default function SearchBar({ onSearch }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<any>>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      const q = query.trim();
      onSearch?.(q);
      if (q.length > 1) {
        fetch(`/api/search?q=${encodeURIComponent(q)}`)
          .then((r) => r.json())
          .then((d) => setResults(d.results || []))
          .catch(() => setResults([]));
        setOpen(true);
      } else {
        setOpen(false);
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, onSearch]);

  return (
    <div className="relative">
      <input
        aria-label="Global search"
        placeholder="Search patients, appointments..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-64 md:w-80 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400"
      />
      {query && (
        <button
          onClick={() => { setQuery(''); setOpen(false); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300"
        >
          ✕
        </button>
      )}

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 z-50 rounded-md border border-gray-200 bg-white p-2 shadow-lg dark:bg-slate-800 dark:border-slate-700">
          {results.slice(0,6).map((r) => (
            <a key={r.id} href={r.href} className="block px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700">
              <div className="text-sm font-medium text-slate-900 dark:text-white">{r.title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-300">{r.subtitle}</div>
            </a>
          ))}
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-300 px-2">{results.length} results</div>
        </div>
      )}
    </div>
  );
}
