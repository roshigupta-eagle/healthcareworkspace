"use client";

import React, { useEffect, useState } from 'react';
import { getUrgentAlerts } from '@/lib/mock/dashboardService';
import { UrgentAlert } from '@/types/dashboard';
import WidgetLoadingSkeleton from './WidgetLoadingSkeleton';
import WidgetEmptyState from './WidgetEmptyState';

export default function UrgentAlertsCard() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<UrgentAlert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ackLoading, setAckLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    getUrgentAlerts()
      .then((list) => mounted && setAlerts(list))
      .catch((e) => mounted && setError((e as Error).message || 'Failed to load'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  async function handleAcknowledge(alertId: string) {
    if (!alerts) return;
    // confirm quick dialog (placeholder for accessible dialog)
    const ok = window.confirm('Acknowledge this alert? You will be recorded as the acknowledging clinician.');
    if (!ok) return;

    setAckLoading((s) => ({ ...s, [alertId]: true }));
    try {
      const res = await fetch('/api/alerts/acknowledge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: alertId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'ack failed');
      // optimistic update — mark as acknowledged locally
      setAlerts((prev) => prev?.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)) ?? null);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('ack error', e);
      alert('Failed to acknowledge alert.');
    } finally {
      setAckLoading((s) => ({ ...s, [alertId]: false }));
    }
  }

  if (loading) return <WidgetLoadingSkeleton />;
  if (error) return <div className="p-4 bg-red-50 text-red-700">We could not load urgent alerts.</div>;
  if (!alerts || alerts.length === 0) return <WidgetEmptyState title="No urgent alerts" message="There are no unacknowledged urgent clinical alerts at this time." />;

  return (
    <section aria-labelledby="urgent-alerts-heading" className="p-4 bg-white border rounded">
      <div className="flex items-center justify-between">
        <h2 id="urgent-alerts-heading" className="text-lg font-semibold text-slate-900">Urgent Alerts</h2>
        <div className="flex items-center gap-2">
          <a href="/dashboard/alerts" className="text-sm text-blue-600 hover:underline">View all</a>
        </div>
      </div>

      <ul className="mt-3 space-y-3">
        {alerts.map((a) => (
          <li key={a.id} className="p-3 border rounded hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900">{a.patientName} • {a.reason}</div>
                <div className="text-xs text-gray-500">{a.mrn ?? ''} — {a.age ? `${a.age} yrs` : '—'} • {new Date(a.createdAt).toLocaleTimeString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/dashboard/records/${a.patientId}`} className="text-sm text-blue-600 hover:underline">Open Patient</a>
                <button
                  className="px-2 py-1 text-sm bg-amber-50 border rounded disabled:opacity-60"
                  aria-label={`Acknowledge alert ${a.id}`}
                  onClick={() => handleAcknowledge(a.id)}
                  disabled={!!ackLoading[a.id] || !!a.acknowledged}
                >
                  {ackLoading[a.id] ? 'Acknowledging…' : a.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
