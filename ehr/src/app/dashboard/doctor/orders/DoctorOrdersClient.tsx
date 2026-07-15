"use client";

import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import LineChart from '@/components/LineChart';
import { Card, Button } from '@/design-system';

export default function DoctorOrdersClient({ initialDashboard }: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const queues = initialDashboard?.queues || [];
  const totalOrders = queues.reduce((a: any, q: any) => a + (q.pendingCount || 0) + (q.inProgressCount || 0), 0);
  const pending = queues.reduce((a: any, q: any) => a + (q.pendingCount || 0), 0);

  const weekly = [5,12,8,10,9,14,11];

  return (
    <div className={`space-y-6 transition-opacity duration-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Orders Analytics</h1>
          <p className="text-sm text-neutral-600">Orders, labs, and procedure workflows.</p>
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
        <StatCard title="Total Orders" value={<span className="font-bold text-2xl">{totalOrders}</span>} accent="border-primary-600" />
        <StatCard title="Pending" value={<span className="font-bold text-2xl">{pending}</span>} accent="border-amber-400" />
        <StatCard title="Completed" value={<span className="font-bold text-2xl">{Math.round(totalOrders*0.6)}</span>} accent="border-green-500" />
        <StatCard title="Urgent" value={<span className="font-bold text-2xl">{Math.round(totalOrders*0.1)}</span>} accent="border-red-500" />
      </div>

      <Card variant="outlined" className="p-4">
        <h3 className="font-semibold mb-2">Weekly Orders</h3>
        <LineChart data={weekly} width={700} height={140} showArea color="#8B5CF6" />
      </Card>

      <Card variant="outlined" className="p-4">
        <h3 className="font-semibold mb-2">Recent Orders</h3>
        <div className="text-sm text-neutral-500">(Table placeholder)</div>
      </Card>
    </div>
  );
}
