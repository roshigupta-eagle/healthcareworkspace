"use client";

import React, { useMemo, useState } from 'react';
import { Card, Button } from '@/design-system';
import DataTable from '@/components/DataTable';
import DoughnutChart from '@/components/charts/DoughnutChart';
import { useRouter } from 'next/navigation';
import type { CardiologyDashboard } from '@/cardiology/types/fhir-domain';
import { VisitPriority } from '@/cardiology/types/fhir-domain';

type Props = { initialDashboard: CardiologyDashboard; isAdmin?: boolean };

export default function HealthRecordsListClient({ initialDashboard, isAdmin = false }: Props) {
  const router = useRouter();
  const visits = useMemo(() => {
    const urgent = initialDashboard?.visits?.urgent || [];
    const recent = initialDashboard?.visits?.recentDischarges || [];
    const map = new Map<string, any>();
    [...urgent, ...recent].forEach((v) => map.set(v.id, v));
    const arr = Array.from(map.values());
    // sort by priority (lower numeric = more urgent)
    arr.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
    return arr;
  }, [initialDashboard]);

  const tableData = visits.map((v: any) => ({
    id: v.id,
    name: v.patientName || v.patientId || v.id,
    state: v.currentState || '—',
    priorityLabel: v.priority === VisitPriority.URGENT ? 'Urgent' : v.priority === VisitPriority.HIGH ? 'High' : v.priority === VisitPriority.NORMAL ? 'Normal' : 'Low',
    diagnosis: v.carePlan?.diagnosis || '—',
    meds: v.carePlan?.medications?.length || 0,
    followUpAt: v.carePlan?.followUpAt ? new Date(v.carePlan.followUpAt).toLocaleDateString() : '—',
  }));

  const byPriority = initialDashboard?.visits?.byPriority || {};
  const chartData = [
    byPriority[VisitPriority.URGENT] || 0,
    byPriority[VisitPriority.HIGH] || 0,
    byPriority[VisitPriority.NORMAL] || 0,
    byPriority[VisitPriority.LOW] || 0,
  ];

  const [showMeds, setShowMeds] = useState(true);

  const columns = [
    { key: 'name', label: 'Patient' },
    { key: 'state', label: 'State' },
    { key: 'priorityLabel', label: 'Priority' },
    { key: 'diagnosis', label: 'Diagnosis' },
    showMeds ? { key: 'meds', label: 'Medications' } : null,
    { key: 'followUpAt', label: 'Follow-up' },
    {
      key: 'actions',
      label: 'Actions',
      render: (r: any) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="xs" onClick={() => router.push(`/doctor/health-records/${r.id}`)}>View</Button>
        </div>
      ),
    },
  ].filter(Boolean) as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Health Records</h1>
          <p className="text-sm text-neutral-600">Overview of patient records — sorted by urgency.</p>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Card variant="outlined" className="p-2">
              <div className="flex items-center gap-3">
                <div className="text-sm">Admin</div>
                <div className="text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={showMeds} onChange={(e) => setShowMeds(e.target.checked)} />
                    <span className="text-xs text-neutral-600">Show medications</span>
                  </label>
                </div>
              </div>
            </Card>
          )}
          <Card variant="outlined" className="p-3 rounded-lg">
            <div className="flex items-center gap-3">
              <img src={`https://ui-avatars.com/api/?name=Dr+Chen&background=2563EB&color=fff&size=64`} alt="Dr" className="rounded-full w-12 h-12" />
              <div>
                <div className="font-semibold text-neutral-900">Dr. Alice Chen</div>
                <div className="text-sm text-neutral-500">Cardiology</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card variant="outlined" className="p-4 lg:col-span-1">
          <h3 className="font-semibold mb-2">By Priority</h3>
          <div className="flex items-center justify-center">
            <DoughnutChart data={chartData} labels={["Urgent","High","Normal","Low"]} size={160} innerRadius={36} />
          </div>
        </Card>

        <Card variant="outlined" className="p-4 lg:col-span-3">
          <h3 className="font-semibold mb-3">Patient Records</h3>
          <DataTable columns={columns as any} data={tableData} />
        </Card>
      </div>
    </div>
  );
}
