"use client";

import React, { useEffect, useState } from 'react';
import { getAppointmentsToday } from '@/lib/mock/dashboardService';
import WidgetLoadingSkeleton from './WidgetLoadingSkeleton';
import WidgetEmptyState from './WidgetEmptyState';

export default function TodayAppointmentsCard() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[] | null>(null);
  const [checkingIn, setCheckingIn] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    getAppointmentsToday().then((list) => mounted && setItems(list)).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <WidgetLoadingSkeleton />;
  if (!items || items.length === 0) return <WidgetEmptyState title="No appointments scheduled" message="There are no appointments for the selected date." />;

  return (
    <section className="p-4 bg-white border rounded">
      <h3 className="text-sm font-medium text-slate-900">Today’s Appointments</h3>
      <ul className="mt-3 divide-y">
        {items.map((a) => (
          <li key={a.id} className="py-2 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {a.patientName}</div>
              <div className="text-xs text-gray-500">{a.type} • {a.room}</div>
            </div>
            <div className="flex items-center gap-2">
              <a href={`/doctor/appointments`} className="text-sm text-blue-600">Open</a>
              <button
                className="text-sm px-2 py-1 border rounded disabled:opacity-60"
                onClick={async () => {
                  if (checkingIn[a.id]) return;
                  setCheckingIn((s) => ({ ...s, [a.id]: true }));
                  try {
                    const res = await fetch('/api/appointments/checkin', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ appointmentId: a.id }),
                    });
                    if (!res.ok) throw new Error((await res.json()).error || 'checkin failed');
                    setItems((prev) => prev?.map((x) => (x.id === a.id ? { ...x, status: 'Arrived' } : x)) ?? null);
                  } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('checkin error', e);
                    alert('Failed to check in appointment');
                  } finally {
                    setCheckingIn((s) => ({ ...s, [a.id]: false }));
                  }
                }}
                disabled={!!checkingIn[a.id] || a.status === 'Arrived'}
              >
                {checkingIn[a.id] ? 'Checking in…' : a.status === 'Arrived' ? 'Arrived' : 'Check In'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
