"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LineChart from '@/components/LineChart';
import { Button, Card } from '@/design-system';

type Props = { initialDashboard: any };

export default function DoctorAnalyticsClient({ initialDashboard }: Props) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(initialDashboard);
  const [loading, setLoading] = useState(false);
  // Only show loading on the very first fetch — background polls are silent
  // so we don't flash a loading state every 30 seconds.
  const isFirstLoad = React.useRef(true);

  useEffect(() => {
    let mounted = true;
    const lastJsonRef = { current: '' };
    const fetchData = async () => {
      try {
        if (isFirstLoad.current) setLoading(true);
        const res = await fetch('/api/cardiology/dashboard');
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted) return;
        // Avoid re-rendering when data hasn't changed
        const s = JSON.stringify(json);
        if (lastJsonRef.current !== s) {
          lastJsonRef.current = s;
          setDashboard(json);
        }
      } catch (err) {
        // ignore
      } finally {
        if (mounted) {
          setLoading(false);
          isFirstLoad.current = false;
        }
      }
    };

    // initial fetch + 30s background refresh (was 3s — reduced to prevent visible flicker)
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const visitsByState = dashboard?.visits?.byState || {};
  const totalVisits = Object.values(visitsByState).reduce((a: any, b: any) => a + b, 0) || 0;
  const completedStates = [
    'PROCEDURE_COMPLETE',
    'CONSULTATION_COMPLETE',
    'CHECKOUT_COMPLETE',
    'DISCHARGED',
  ];
  const completedCount = completedStates.reduce((sum, s) => sum + (visitsByState[s] || 0), 0);

  // simple trend data derived from queues length (demo)
  const trendData = (dashboard?.queues || []).slice(0, 6).map((q: any, i: number) => (q.pendingCount || 0) + (q.inProgressCount || 0));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Analytics Portal</h2>
            <p className="text-sm text-neutral-600">Data-dense view for clinicians and operations.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push('/doctor')}>Back to Dashboard</Button>
          </div>
        </div>

        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold text-neutral-900">Case List — Full Details</h3>
          <div className="mt-3 space-y-2">
            {(dashboard?.recentEvents || []).slice(0, 8).map((ev: any) => (
              <div key={ev.id || Math.random()} className="border-b border-neutral-100 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900">{ev.subjectName || ev.eventType || 'Event'}</div>
                    <div className="text-xs text-neutral-600">{ev.detail || ''}</div>
                  </div>
                  <div className="text-xs text-neutral-500">{new Date(ev.createdAt || Date.now()).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
            {(!dashboard?.recentEvents || dashboard.recentEvents.length === 0) && (
              <div className="text-sm text-neutral-500">No recent cases to display.</div>
            )}
          </div>
        </Card>

        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold text-neutral-900">Operational Trends</h3>
          <div className="mt-3">
            <LineChart data={trendData.length ? trendData : [0,0,0,0,0]} width={700} height={150} showArea color="#6366f1" />
            <div className="mt-2 text-sm text-neutral-500">Queue trend (pending + in-progress) across top queues.</div>
          </div>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold text-neutral-900">Shift Progress</h3>
          <div className="mt-3 space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm text-neutral-600">
                <span>Evaluated Patients</span>
                <span className="font-semibold text-neutral-900">{completedCount} / {totalVisits}</span>
              </div>
              <div className="mt-2 h-3 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 transition-all"
                  style={{ width: `${totalVisits > 0 ? Math.min(100, Math.round((completedCount / Math.max(1, totalVisits)) * 100)) : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm text-neutral-600">
                <span>Pending</span>
                <span className="font-semibold text-neutral-900">{dashboard?.queues?.reduce((a:any,b:any)=>a+(b.pendingCount||0),0) || 0}</span>
              </div>
              <div className="mt-2 h-3 bg-neutral-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: '40%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm text-neutral-600">
                <span>In Progress</span>
                <span className="font-semibold text-neutral-900">{dashboard?.queues?.reduce((a:any,b:any)=>a+(b.inProgressCount||0),0) || 0}</span>
              </div>
              <div className="mt-2 h-3 bg-neutral-200 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500" style={{ width: '30%' }} />
              </div>
            </div>
          </div>
        </Card>

        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold text-neutral-900">Real-time Counter</h3>
          <div className="mt-4 text-center">
            <div className="text-4xl font-bold text-neutral-900">{completedCount}</div>
            <div className="text-sm text-neutral-600">evaluated patients</div>
          </div>
        </Card>
      </aside>
    </div>
  );
}
