"use client";

import React, { useEffect, useState } from 'react';
import { Button, Card } from '@/design-system';
import { useRouter } from 'next/navigation';
import LineChart from '@/components/LineChart';

type Props = { initialProcedure: any; initialVisit: any };

function ProgressRing({ size = 72, stroke = 8, progress = 0, color = '#7c3aed' }: { size?: number; stroke?: number; progress: number; color?: string; }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (progress / 100) * circumference;
  const offset = circumference - dash;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle r={radius} cx={0} cy={0} stroke="#eef2ff" strokeWidth={stroke} fill="transparent" />
        <circle
          r={radius}
          cx={0}
          cy={0}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          fill="transparent"
          transform="rotate(-90)"
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(.2,.9,.2,1)' }}
        />
        <text x={0} y={4} textAnchor="middle" fontSize={Math.max(12, size * 0.22)} fill="#0f172a" style={{ fontWeight: 700 }}>{Math.round(progress)}%</text>
      </g>
    </svg>
  );
}

export default function OrderDetailClient({ initialProcedure, initialVisit }: Props) {
  const router = useRouter();
  const [procedure, setProcedure] = useState(initialProcedure);
  const [visit, setVisit] = useState(initialVisit);
  const [dashboard, setDashboard] = useState<any | null>(null);
  const lastDashJson = React.useRef('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [vRes, dRes] = await Promise.all([
          fetch(`/api/cardiology/visits/${visit.id}`),
          fetch('/api/cardiology/dashboard'),
        ]);
        if (vRes.ok) {
          const json = await vRes.json();
          if (mounted) setVisit(json);
          const p = (json.proceduresOrdered || []).find((x: any) => x.id === procedure.id);
          if (p && mounted) setProcedure(p);
        }
        if (dRes.ok) {
          const json = await dRes.json();
          const s = JSON.stringify(json);
          if (mounted && lastDashJson.current !== s) {
            lastDashJson.current = s;
            setDashboard(json);
          }
        }
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => { mounted = false; };
  }, [procedure.id, visit.id]);

  const visitsByState = dashboard?.visits?.byState || {};
  const totalVisits = Object.values(visitsByState).reduce((a: any, b: any) => a + b, 0) || 0;
  const completedStates = [
    'PROCEDURE_COMPLETE',
    'CONSULTATION_COMPLETE',
    'CHECKOUT_COMPLETE',
    'DISCHARGED',
  ];
  const completedCount = completedStates.reduce((sum: number, s: string) => sum + (visitsByState[s] || 0), 0 as number);
  const completionPct = totalVisits > 0 ? Math.round((completedCount / totalVisits) * 100) : 0;
  const trendData = (dashboard?.queues || []).slice(0, 6).map((q: any) => (q.pendingCount || 0) + (q.inProgressCount || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Order: {procedure.procedureType}</h1>
          <p className="text-sm text-neutral-600">For: {visit.patientName} • Visit: {visit.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-neutral-500">Completion</div>
            <div className="text-lg font-bold text-neutral-900">{completionPct}%</div>
            <div className="text-xs text-neutral-500">{completedCount} / {totalVisits} seen</div>
          </div>
          <img
            alt={visit.assignedPhysicianName || 'Doctor'}
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(visit.assignedPhysicianName || 'Doctor')}&background=0D9488&color=fff&size=128`}
            className="h-12 w-12 rounded-full ring-2 ring-primary-200"
          />
          <Button variant="secondary" size="sm" onClick={() => router.push('/doctor')}>Back</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card variant="outlined" className="p-4 bg-white backdrop-blur-sm">
            <h3 className="font-semibold text-neutral-900">Procedure Details</h3>
            <div className="mt-3 text-sm text-neutral-600">
              <div>Ordered by: {procedure.orderedBy}</div>
              <div className="mt-2">Status: {procedure.status}</div>
              <div className="mt-2">Ordered at: {procedure.orderedAt}</div>
              {procedure.notes && <div className="mt-2">Notes: {procedure.notes}</div>}
            </div>
          </Card>

          <Card variant="outlined" className="p-4 bg-white backdrop-blur-sm">
            <h3 className="font-semibold text-neutral-900">Trend</h3>
            <div className="mt-3">
              <LineChart data={trendData.length ? trendData : [0,0,0,0]} width={800} height={140} showArea color="#06b6d4" />
              <div className="mt-2 text-sm text-neutral-500">Queue trend (pending + in-progress)</div>
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card variant="outlined" className="p-4 text-center">
            <h3 className="font-semibold text-neutral-900">Quick Stats</h3>
            <div className="mt-4">
              <div className="flex items-center justify-center gap-4">
                <div className="w-24 h-24">
                  <ProgressRing size={80} stroke={8} progress={completionPct} color="#7c3aed" />
                </div>
              </div>
              <div className="mt-3 text-sm text-neutral-600">{completedCount} patients seen</div>
              <div className="text-sm text-neutral-600">{Math.max(0, totalVisits - completedCount)} not checked</div>
            </div>
          </Card>

          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Actions</h3>
            <div className="mt-3 space-y-2">
              <Button variant="primary" size="sm">Mark In Progress</Button>
              <Button variant="ghost" size="sm">Mark Complete</Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
