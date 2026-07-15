"use client";

import React, { useEffect, useState } from 'react';
import { Card, Button } from '@/design-system';
import LineChart from '@/components/LineChart';
import StatCard from '@/components/StatCard';

export default function DoctorEncountersClient({ initialDashboard }: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const visits = initialDashboard?.visits || {};
  const total = Object.values(visits.byState || {}).reduce((a: any, b: any) => a + b, 0) || 0;
  const completed = ['PROCEDURE_COMPLETE','CONSULTATION_COMPLETE','CHECKOUT_COMPLETE','DISCHARGED'].reduce((s: any, st: any) => s + (visits.byState?.[st] || 0), 0);

  const weekly = [10,12,8,14,16,13,11];

  return (
    <div className={`space-y-6 transition-opacity duration-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Encounters Analytics</h1>
          <p className="text-sm text-neutral-600">Overview of encounters and workflows.</p>
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
            <Button variant="secondary" size="sm" onClick={() => window.history.back()}>Back</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Encounters" value={<span className="font-bold text-2xl">{total}</span>} accent="border-primary-600" />
        <StatCard title="Completed" value={<span className="font-bold text-2xl">{completed}</span>} accent="border-green-500" />
        <StatCard title="Active" value={<span className="font-bold text-2xl">{Math.max(0, total - completed)}</span>} accent="border-amber-400" />
        <StatCard title="Cancelled" value={<span className="font-bold text-2xl">0</span>} accent="border-red-500" />
      </div>

      <Card variant="outlined" className="p-4">
        <h3 className="font-semibold mb-2">Weekly Encounter Trend</h3>
        <LineChart data={weekly} width={700} height={140} showArea color="#2563EB" />
      </Card>

      <Card variant="outlined" className="p-4">
        <h3 className="font-semibold mb-2">Recent Encounters</h3>
        <div className="text-sm text-neutral-500">(Table placeholder)</div>
      </Card>
    </div>
  );
}
