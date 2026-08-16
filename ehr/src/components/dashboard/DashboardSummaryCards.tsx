"use client";

import React, { useEffect, useState } from 'react';
import { getDashboardSummary } from '@/lib/mock/dashboardService';
import { DashboardSummary } from '@/types/dashboard';
import WidgetLoadingSkeleton from './WidgetLoadingSkeleton';
import WidgetEmptyState from './WidgetEmptyState';

function Card({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="p-4 bg-white border rounded shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
    </div>
  );
}

export default function DashboardSummaryCards() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getDashboardSummary()
      .then((s) => {
        if (!mounted) return;
        setSummary(s);
      })
      .catch((e) => setError((e as Error).message || 'Failed to load'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <WidgetLoadingSkeleton />;
  if (error) return <div className="p-4 bg-red-50 text-red-700">Could not load summary</div>;
  if (!summary) return <WidgetEmptyState title="No summary" message="No dashboard data available." />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card title="Patients Today" value={summary.patientsToday.total} subtitle={`${summary.patientsToday.checkedIn} checked in • ${summary.patientsToday.seen} seen`} />
      <Card title="Waiting Now" value={summary.waitingNow.count} subtitle={`Longest ${summary.waitingNow.longestWaitingMinutes ?? 0}m`} />
      <Card title="Urgent Alerts" value={summary.urgentAlerts.total} subtitle={`${summary.urgentAlerts.unacknowledged} unacknowledged`} />
    </div>
  );
}
