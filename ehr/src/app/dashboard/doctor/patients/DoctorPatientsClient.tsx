"use client";

import React, { useMemo, useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import CountUp from '@/components/dashboard/CountUp';
import LineChart from '@/components/LineChart';
import DoughnutChart from '@/components/charts/DoughnutChart';
import BarChart from '@/components/charts/BarChart';
import DataTable from '@/components/DataTable';
import { Card, Button } from '@/design-system';

export default function DoctorPatientsClient({ initialDashboard }: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const visits = initialDashboard?.visits || {};
  const total = Object.values(visits.byState || {}).reduce((a: any, b: any) => a + b, 0) || 0;
  const completedStates = [
    'PROCEDURE_COMPLETE',
    'CONSULTATION_COMPLETE',
    'CHECKOUT_COMPLETE',
    'DISCHARGED',
  ];
  const completed = completedStates.reduce((s: any, st: any) => s + (visits.byState?.[st] || 0), 0);
  const waiting = (visits.urgent || []).length;

  const weekly = useMemo(() => [12, 18, 22, 16, 24, 20, 15], []);
  const monthly = useMemo(() => [120, 140, 128, 150, 160, 170, 180, 190, 200, 210, 220, 230], []);

  const notSeen = Math.max(0, total - completed);
  const recentVisits = [...(visits.urgent || []), ...(visits.recentDischarges || [])];
  const tableData = recentVisits.map((v: any) => ({
    id: v.id,
    name: v.patientName || v.patientId || v.id,
    state: v.currentState || 'N/A',
    priority: v.priority || 'N/A',
    arrivedAt: v.arrivedAt || '—',
    seen: completedStates.includes(v.currentState),
  }));

  return (
    <div className={`space-y-6 transition-opacity duration-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Patients Analytics</h1>
          <p className="text-sm text-neutral-600">Overview of patient flow, wait times and outcomes.</p>
        </div>
        <div className="flex items-center gap-4">
          <Card variant="outlined" className="p-3 rounded-lg">
            <div className="flex items-center gap-3">
              <img src={`https://ui-avatars.com/api/?name=Dr+Chen&background=2563EB&color=fff&size=64`} alt="Dr" className="rounded-full w-12 h-12" />
              <div>
                <div className="font-semibold text-neutral-900">Dr. Alice Chen</div>
                <div className="text-sm text-neutral-500">Cardiologist • Cardiology</div>
                <div className="text-xs text-neutral-400">{new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </Card>
          <div>
            <Button variant="primary" size="sm" onClick={() => window.location.reload()}>Refresh</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Patients" value={<CountUp end={total} />} subtitle="Total registered" accent="border-primary-600" />
        <StatCard title="Patients Seen" value={<CountUp end={completed} />} subtitle="Evaluated today" accent="border-green-500" />
        <StatCard title="Patients Waiting" value={<CountUp end={waiting} />} subtitle="In waiting room" accent="border-amber-400" />
        <StatCard title="Completion" value={<CountUp end={total > 0 ? Math.round((completed/total)*100) : 0} />} subtitle="% complete" accent="border-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold mb-2">Weekly Trend</h3>
          <BarChart data={weekly} labels={["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]} />
        </Card>

        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold mb-2">Monthly Trend</h3>
          <LineChart data={monthly} width={700} height={140} showArea color="#2563EB" />
        </Card>

        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold mb-2">Patient Distribution</h3>
          <div className="mt-4 flex items-center justify-center">
            <DoughnutChart data={[completed, notSeen]} labels={["Seen","Not seen"]} size={160} innerRadius={44} />
          </div>
        </Card>
      </div>

      <Card variant="outlined" className="p-4">
        <h3 className="font-semibold mb-3">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-neutral-500">Average Appointment Time</div>
            <div className="font-semibold text-neutral-900">22m</div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Average Wait Time</div>
            <div className="font-semibold text-neutral-900">11m</div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Patient Satisfaction</div>
            <div className="font-semibold text-neutral-900">4.6 / 5</div>
          </div>
        </div>
      </Card>

      <Card variant="outlined" className="p-4">
        <h3 className="font-semibold mb-3">Recent Patients</h3>
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'state', label: 'State' },
            { key: 'priority', label: 'Priority' },
            { key: 'arrivedAt', label: 'Arrived' },
            { key: 'seen', label: 'Seen', render: (r: any) => (r.seen ? 'Yes' : 'No') },
          ]}
          data={tableData}
        />
      </Card>
    </div>
  );
}
