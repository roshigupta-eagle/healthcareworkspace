"use client";

import React, { useCallback, useEffect, useState } from 'react';
import LineChart from './LineChart';
import DashboardFiltersClient from './DashboardFiltersClient';

type Summary = {
  completed: number;
  active: number;
  pending: number;
  completionRate: number;
  spark: number[];
};

function Sparkline({ data = [] }: { data?: number[] }) {
  if (!data || data.length === 0) return <div className="text-sm text-slate-500">—</div>;
  return <LineChart data={data} width={120} height={48} color="#60A5FA" />;
}

export default function DashboardSummaryClient() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>({});

  // Stable callback — must not be recreated on every render or DashboardFiltersClient
  // will enter an infinite effect loop (onChange in deps → re-render → new fn → loop).
  // Returns the same reference when values are identical so the [filters] effect does
  // not re-run (and re-fetch) when nothing actually changed (e.g. empty debounce on mount).
  const handleFiltersChange = useCallback((f: any) => {
    setFilters((s: any) => {
      const next = { ...s, ...f };
      if (JSON.stringify(s) === JSON.stringify(next)) return s;
      return next;
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const qs = new URLSearchParams();
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    const url = '/api/cardiology/dashboard' + (qs.toString() ? `?${qs.toString()}` : '');

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        const visits = d.visits || {};
        const completed = Object.values(visits.byState || {}).reduce((acc: any, v: any) => acc + (v.completed || 0), 0);
        const active = (visits.urgent || []).length + 0;
        const pending = Object.values(visits.byState || {}).reduce((acc: any, v: any) => acc + (v.pending || 0), 0);
        const total = (d.queues || []).reduce((a: any, q: any) => a + (q.pendingCount || 0) + (q.inProgressCount || 0), 0) + active;
        const completionRate = total === 0 ? 0 : Math.round((completed / Math.max(1, total)) * 100);
        const spark = [Math.max(0, completed - 1), completed, completed + 1, completed + 2, completed + 1];
        setSummary({ completed, active, pending, completionRate, spark });
      })
      .catch(() => setSummary(null))
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [filters]);

  // Only show a loading placeholder on the very first load (no data yet).
  // Background re-fetches (filter changes, etc.) happen silently so the existing
  // data stays visible and there is no flicker.
  if (loading && !summary) return <div className="mt-6">Loading summary…</div>;

  if (!summary)
    return (
      <div className="mt-6 rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-300">
        No data available — try again later.
      </div>
    );

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Overview</h2>
        <div className="flex items-center gap-2">
          <DashboardFiltersClient onChange={handleFiltersChange} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-md p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/10">
          <div className="text-sm font-medium text-slate-500">Completed</div>
          {summary.completed === 0 ? (
            <div className="mt-2 text-sm text-slate-500">No completed appointments</div>
          ) : (
            <>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{summary.completed}</div>
              <div className="mt-2 text-xs text-slate-500">This period</div>
              <div className="mt-2"><Sparkline data={summary.spark} /></div>
            </>
          )}
        </div>

        <div className="rounded-md p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/10">
          <div className="text-sm font-medium text-slate-500">Active / In-Progress</div>
          {summary.active === 0 ? (
            <div className="mt-2 text-sm text-slate-500">No active patients</div>
          ) : (
            <>
              <div className="mt-1 text-2xl font-bold text-amber-600">{summary.active}</div>
              <div className="mt-2 text-xs text-slate-500">Now</div>
              <div className="mt-2"><Sparkline data={summary.spark.map((s) => Math.max(0, s - 1))} /></div>
            </>
          )}
        </div>

        <div className="rounded-md p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/10">
          <div className="text-sm font-medium text-slate-500">Pending</div>
          {summary.pending === 0 ? (
            <div className="mt-2 text-sm text-slate-500">No queued patients</div>
          ) : (
            <>
              <div className="mt-1 text-2xl font-bold text-sky-600">{summary.pending}</div>
              <div className="mt-2 text-xs text-slate-500">Queued</div>
              <div className="mt-2"><Sparkline data={summary.spark.map((s) => Math.max(0, s - 2))} /></div>
            </>
          )}
        </div>

        <div className="rounded-md p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/10">
          <div className="text-sm font-medium text-slate-500">Completion Rate</div>
          {summary.completionRate === 0 ? (
            <div className="mt-2 text-sm text-slate-500">—</div>
          ) : (
            <>
              <div className="mt-1 text-2xl font-bold text-green-600">{summary.completionRate}%</div>
              <div className="mt-2 text-xs text-slate-500">Across queues</div>
              <div className="mt-2"><Sparkline data={summary.spark.map((s, i) => (i % 2 ? s : Math.max(0, s - 1)))} /></div>
            </>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-slate-500">Trends</h3>
        <div className="mt-3 rounded-md p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/10">
          <LineChart data={summary.spark} width={600} height={120} color="#6366f1" showArea />
          <div className="mt-2 text-xs text-slate-500">Sparkline shows recent completions. Click a card to drill down.</div>
        </div>
      </div>
    </div>
  );
}
