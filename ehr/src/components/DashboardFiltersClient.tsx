"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function DashboardFiltersClient({ onChange }: { onChange?: (filters: any) => void }) {
  const [query, setQuery] = useState('');
  // Use a ref for onChange to avoid it being a useEffect dependency.
  // If onChange were in the dep array, a new inline function on every parent render
  // would trigger the effect on every render, creating an infinite re-render loop.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  useEffect(() => {
    const t = setTimeout(() => {
      onChangeRef.current?.({ q: query });
    }, 400);
    return () => clearTimeout(t);
  }, [query]); // intentionally omit onChange — use ref above

  return (
    <div className="flex items-center gap-2">
      <input
        id="dashboard-search"
        name="dashboard-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="rounded-md border px-2 py-1 text-sm bg-white dark:bg-slate-800"
      />

      <select
        id="dashboard-role-filter"
        name="dashboard-role-filter"
        className="rounded-md border px-2 py-1 text-sm bg-white dark:bg-slate-800"
        onChange={(e) => onChangeRef.current?.({ role: e.target.value })}
      >
        <option value="">All roles</option>
        <option value="PATIENT">Patient</option>
        <option value="DOCTOR">Doctor</option>
        <option value="NURSE">Nurse</option>
        <option value="ADMIN">Admin</option>
      </select>

      <select
        id="dashboard-status-filter"
        name="dashboard-status-filter"
        className="rounded-md border px-2 py-1 text-sm bg-white dark:bg-slate-800"
        onChange={(e) => onChangeRef.current?.({ status: e.target.value })}
      >
        <option value="">All status</option>
        <option value="PENDING">Pending</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="COMPLETED">Completed</option>
      </select>
    </div>
  );
}
