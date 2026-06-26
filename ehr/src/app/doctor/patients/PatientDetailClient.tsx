"use client";

import React, { useEffect, useState } from 'react';
import LineChart from '@/components/LineChart';
import { Button, Card } from '@/design-system';
import { useRouter } from 'next/navigation';
import type { CardiovascularVisit, CardiologyDashboard } from '@/cardiology/types/fhir-domain';
import { CardiovascularVisitState } from '@/cardiology/types/fhir-domain';

type Props = { initialVisit: CardiovascularVisit; initialDashboard: CardiologyDashboard };

export default function PatientDetailClient({ initialVisit, initialDashboard }: Props) {
  const router = useRouter();
  const [visit, setVisit] = useState<CardiovascularVisit>(initialVisit);
  const [dashboard, setDashboard] = useState<CardiologyDashboard>(initialDashboard);

  const lastVisitJsonRef = React.useRef('');
  const lastDashJsonRef = React.useRef('');

  useEffect(() => {
    let mounted = true;
    const fetchLatest = async () => {
      try {
        const [vRes, dRes] = await Promise.all([
          fetch(`/api/cardiology/visits/${visit.id}`),
          fetch('/api/cardiology/dashboard'),
        ]);
        if (vRes.ok) {
          const json = await vRes.json();
          if (mounted) {
            const s = JSON.stringify(json);
            if (lastVisitJsonRef.current !== s) {
              lastVisitJsonRef.current = s;
              setVisit(json);
            }
          }
        }
        if (dRes.ok) {
          const json = await dRes.json();
          if (mounted) {
            const s = JSON.stringify(json);
            if (lastDashJsonRef.current !== s) {
              lastDashJsonRef.current = s;
              setDashboard(json);
            }
          }
        }
      } catch (_) {
        // ignore
      }
    };
    fetchLatest();
    // Poll every 30s instead of 3s — reduces flicker from unnecessary re-renders
    const id = setInterval(fetchLatest, 30000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [visit.id]);

  const visitsByState = dashboard?.visits?.byState || {};
  const totalVisits = Object.values(visitsByState).reduce((a: any, b: any) => a + b, 0) || 0;
  const completedStates: CardiovascularVisitState[] = [
    CardiovascularVisitState.PROCEDURE_COMPLETE,
    CardiovascularVisitState.CONSULTATION_COMPLETE,
    CardiovascularVisitState.CHECKOUT_COMPLETE,
    CardiovascularVisitState.DISCHARGED,
  ];
  const completedCount = completedStates.reduce((sum, s) => sum + (visitsByState[s] || 0), 0 as number);
  const pct = totalVisits > 0 ? Math.round((completedCount / totalVisits) * 100) : 0;

  const trendData = (dashboard?.queues || []).slice(0, 6).map((q: any) => (q.pendingCount || 0) + (q.inProgressCount || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Patient: {visit.patientName}</h1>
          <p className="text-sm text-neutral-600">MRN: {visit.mrn} • DOB: {visit.patientDOB}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img
              alt={visit.assignedPhysicianName || 'Doctor'}
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(visit.assignedPhysicianName || 'Doctor')}&background=0D9488&color=fff&size=128`}
              className="h-12 w-12 rounded-full ring-2 ring-primary-200"
            />
            <div className="text-sm">
              <div className="font-medium text-neutral-900">{visit.assignedPhysicianName || 'Unassigned'}</div>
              <div className="text-xs text-neutral-500">Attending</div>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => router.push('/doctor')}>Back</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Visit Summary</h3>
            <p className="text-sm text-neutral-600 mt-2">{visit.chiefComplaint || 'No chief complaint recorded.'}</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-neutral-500">Completion Rate</div>
                <div className="text-2xl font-bold text-neutral-900">{pct}%</div>
                <div className="text-xs text-neutral-500">{completedCount} / {totalVisits} seen</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">Seen</div>
                <div className="text-2xl font-bold text-amber-600">{completedCount}</div>
                <div className="text-xs text-neutral-500">patients</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">Not Checked</div>
                <div className="text-2xl font-bold text-primary-600">{Math.max(0, totalVisits - completedCount)}</div>
                <div className="text-xs text-neutral-500">patients</div>
              </div>
            </div>
          </Card>

          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Trend</h3>
            <div className="mt-3">
              <LineChart data={trendData.length ? trendData : [0,0,0,0]} width={800} height={140} showArea color="#06b6d4" />
              <div className="mt-2 text-sm text-neutral-500">Queue trend (pending + in-progress)</div>
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Quick Info</h3>
            <div className="mt-3 text-sm text-neutral-600">
              <div>Patient ID: {visit.patientId}</div>
              <div className="mt-2">State: {visit.currentState}</div>
              <div className="mt-2">Priority: {String(visit.priority)}</div>
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
    </div>
  );
}
