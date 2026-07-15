"use client";

import React, { useEffect, useState } from 'react';
import { Card, Button, Badge } from '@/design-system';
import DataTable from '@/components/DataTable';
import BarChart from '@/components/charts/BarChart';
import { useRouter } from 'next/navigation';
import type { CardiovascularVisit } from '@/cardiology/types/fhir-domain';

type Props = { initialVisit: CardiovascularVisit };

export default function HealthRecordDetailClient({ initialVisit }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [visit, setVisit] = useState<CardiovascularVisit>(initialVisit);

  useEffect(() => setMounted(true), []);

  // Try to refresh visit data on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/cardiology/visits/${visit.id}`);
        if (res.ok) {
          const json = await res.json();
          if (mounted) setVisit(json);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [visit.id]);

  const meds = visit.carePlan?.medications || [];
  const medsData = meds.map((m, idx) => ({ id: idx, med: m }));

  const hr = visit.vitals?.heartRateBpm;
  const hrSeries = hr ? [Math.max(50, hr - 6), Math.max(50, hr - 2), hr, hr + 2, hr + 4] : [];

  return (
    <div className={`space-y-6 transition-opacity duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{visit.patientName}</h1>
          <p className="text-sm text-neutral-600">MRN: {visit.mrn} • DOB: {visit.patientDOB}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={visit.priority === 0 ? 'critical' : visit.priority === 25 ? 'warning' : 'info'}>
              {visit.priority === 0 ? 'Urgent' : visit.priority === 25 ? 'High' : visit.priority === 50 ? 'Normal' : 'Low'}
            </Badge>
            <div className="text-xs text-neutral-500">Last seen: {new Date(visit.stateEnteredAt || visit.arrivedAt || Date.now()).toLocaleString()}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <Button variant="secondary" size="sm" onClick={() => router.back()}>Back</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Clinical Summary</h3>
            <p className="text-sm text-neutral-600 mt-2">{visit.chiefComplaint || 'No chief complaint recorded.'}</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-gradient-to-r from-[#EFF6FF] to-white rounded-lg">
                <div className="text-xs text-neutral-500">Arrived</div>
                <div className="text-2xl font-bold text-neutral-900">{visit.arrivedAt ? new Date(visit.arrivedAt).toLocaleTimeString() : '—'}</div>
                <div className="text-xs text-neutral-500">{visit.arrivedAt ? new Date(visit.arrivedAt).toLocaleDateString() : '—'}</div>
              </div>
              <div className="p-3 bg-gradient-to-r from-[#FFFBEB] to-white rounded-lg">
                <div className="text-xs text-neutral-500">Priority</div>
                <div className="text-2xl font-bold text-primary-600">{String(visit.priority)}</div>
                <div className="text-xs text-neutral-500">current</div>
              </div>
              <div className="p-3 bg-gradient-to-r from-[#ECFCCB] to-white rounded-lg">
                <div className="text-xs text-neutral-500">Next Follow-up</div>
                <div className="text-2xl font-bold text-neutral-900">{visit.carePlan?.followUpAt ? new Date(visit.carePlan.followUpAt).toLocaleDateString() : '—'}</div>
              </div>
            </div>
          </Card>

          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Care Plan</h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-neutral-500">Symptoms</div>
                {visit.carePlan?.symptoms?.length ? (
                  <ul className="list-disc ml-5 mt-2 text-sm text-neutral-700">
                    {visit.carePlan!.symptoms!.map((s, idx) => <li key={idx}>{s}</li>)}
                  </ul>
                ) : (
                  <div className="text-sm text-neutral-500">No symptoms recorded</div>
                )}
              </div>
              <div>
                <div className="text-xs text-neutral-500">Diagnosis</div>
                <div className="mt-2 font-medium text-neutral-900">{visit.carePlan?.diagnosis || 'Not recorded'}</div>
                <div className="text-sm text-neutral-600 mt-2">Next steps: {visit.carePlan?.nextSteps || 'None recorded'}</div>
              </div>
            </div>
          </Card>

          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Medications</h3>
            {meds.length === 0 ? (
              <div className="text-sm text-neutral-500 mt-2">No medications recorded</div>
            ) : (
              <div className="mt-3">
                <DataTable
                  columns={[{ key: 'med', label: 'Medication' }]}
                  data={medsData}
                />
              </div>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Vitals (HR)</h3>
            {hrSeries.length ? (
              <div className="mt-3">
                <BarChart data={hrSeries} labels={["-4m","-3m","-2m","-1m","now"]} />
              </div>
            ) : (
              <div className="text-sm text-neutral-500">No vitals recorded</div>
            )}
          </Card>

          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Quick Info</h3>
            <div className="mt-3 text-sm text-neutral-600">
              <div>Patient ID: {visit.patientId}</div>
              <div className="mt-2">State: {visit.currentState}</div>
              <div className="mt-2">Arrived: {visit.arrivedAt ? new Date(visit.arrivedAt).toLocaleString() : '—'}</div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
