"use client";

import React, { useEffect, useState } from 'react';
import { Card, Button, Badge } from '@/design-system';
import LineChart from '@/components/LineChart';
import DoughnutChart from '@/components/charts/DoughnutChart';
import { useRouter } from 'next/navigation';
import type { CardiovascularVisit, CardiologyDashboard } from '@/cardiology/types/fhir-domain';

type Props = { initialVisit: CardiovascularVisit; initialDashboard: CardiologyDashboard };

export default function UrgentPatientDetailClient({ initialVisit, initialDashboard }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [visit, setVisit] = useState<CardiovascularVisit>(initialVisit);
  const [dashboard, setDashboard] = useState<CardiologyDashboard>(initialDashboard);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const vRes = await fetch(`/api/cardiology/visits/${visit.id}`);
        const dRes = await fetch('/api/cardiology/dashboard');
        if (vRes.ok) {
          const json = await vRes.json();
          if (mounted) setVisit(json);
        }
        if (dRes.ok) {
          const json = await dRes.json();
          if (mounted) setDashboard(json);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [visit.id]);

  const lastVisitTime = visit.dischargedAt || visit.arrivedAt || visit.stateEnteredAt || 'Unknown';
  const symptoms = visit.carePlan?.symptoms || [];
  const diagnosis = visit.carePlan?.diagnosis || 'Not recorded';
  const procedures = visit.proceduresOrdered || [];

  const seenCount = Object.values(dashboard?.visits?.byState || {}).reduce((a: any, b: any) => a + b, 0) || 0;
  const completedStates = [
    'PROCEDURE_COMPLETE',
    'CONSULTATION_COMPLETE',
    'CHECKOUT_COMPLETE',
    'DISCHARGED',
  ];
  const completed = completedStates.reduce((s: any, st: any) => s + (dashboard?.visits?.byState?.[st] || 0), 0);
  const notSeen = Math.max(0, seenCount - completed);

  return (
    <div className={`space-y-6 transition-opacity duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{visit.patientName}</h1>
          <p className="text-sm text-neutral-600">MRN: {visit.mrn} • DOB: {visit.patientDOB}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="critical">Urgent</Badge>
            <div className="text-xs text-neutral-500">Last seen: {new Date(lastVisitTime).toLocaleString()}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img
              alt={visit.assignedPhysicianName || 'Doctor'}
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(visit.assignedPhysicianName || 'Doctor')}&background=EF4444&color=fff&size=128`}
              className="h-12 w-12 rounded-full ring-2 ring-primary-200"
            />
            <div className="text-sm">
              <div className="font-medium text-neutral-900">{visit.assignedPhysicianName || 'Unassigned'}</div>
              <div className="text-xs text-neutral-500">Attending</div>
            </div>
          </div>
          <div>
            <Button variant="secondary" size="sm" onClick={() => router.push('/doctor')}>Back</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card variant="outlined" className="p-4 bg-white shadow-sm">
            <h3 className="font-semibold text-neutral-900">Clinical Summary</h3>
            <p className="text-sm text-neutral-600 mt-2">{visit.chiefComplaint || 'No chief complaint recorded.'}</p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-gradient-to-r from-[#EFF6FF] to-white rounded-lg">
                <div className="text-xs text-neutral-500">Seen (est)</div>
                <div className="text-2xl font-bold text-neutral-900">{completed}</div>
                <div className="text-xs text-neutral-500">evaluations</div>
              </div>
              <div className="p-3 bg-gradient-to-r from-[#FFFBEB] to-white rounded-lg">
                <div className="text-xs text-neutral-500">Not Checked</div>
                <div className="text-2xl font-bold text-primary-600">{notSeen}</div>
                <div className="text-xs text-neutral-500">patients</div>
              </div>
              <div className="p-3 bg-gradient-to-r from-[#ECFCCB] to-white rounded-lg">
                <div className="text-xs text-neutral-500">Priority</div>
                <div className="text-2xl font-bold text-neutral-900">{String(visit.priority)}</div>
                <div className="text-xs text-neutral-500">current</div>
              </div>
            </div>
          </Card>

          <Card variant="outlined" className="p-4 bg-white shadow-sm">
            <h3 className="font-semibold text-neutral-900">Care Plan</h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-neutral-500">Symptoms</div>
                {symptoms.length ? (
                  <ul className="list-disc ml-5 mt-2 text-sm text-neutral-700">
                    {symptoms.map((s, idx) => <li key={idx}>{s}</li>)}
                  </ul>
                ) : (
                  <div className="text-sm text-neutral-500">No symptoms recorded</div>
                )}
              </div>
              <div>
                <div className="text-xs text-neutral-500">Diagnosis</div>
                <div className="mt-2 font-medium text-neutral-900">{diagnosis}</div>
                <div className="text-sm text-neutral-600 mt-2">Next steps: {visit.carePlan?.nextSteps || 'None recorded'}</div>
              </div>
            </div>
          </Card>

          <Card variant="outlined" className="p-4 bg-white shadow-sm">
            <h3 className="font-semibold text-neutral-900">Procedures & Orders</h3>
            {procedures.length === 0 ? (
              <div className="text-sm text-neutral-500 mt-2">No procedures ordered</div>
            ) : (
              <div className="mt-2 space-y-2">
                {procedures.map((p) => (
                  <div key={p.id} className="p-3 border rounded-md bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p.procedureType}</div>
                        <div className="text-xs text-neutral-500">Ordered by {p.orderedBy} • {new Date(p.orderedAt).toLocaleString()}</div>
                      </div>
                      <div className="text-sm text-neutral-600">{p.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card variant="outlined" className="p-4 bg-white shadow-sm">
            <h3 className="font-semibold text-neutral-900">Quick Info</h3>
            <div className="mt-3 text-sm text-neutral-600">
              <div>Patient ID: {visit.patientId}</div>
              <div className="mt-2">State: {visit.currentState}</div>
              <div className="mt-2">Arrived: {visit.arrivedAt ? new Date(visit.arrivedAt).toLocaleString() : '—'}</div>
              <div className="mt-2">Last State Entered: {visit.stateEnteredAt ? new Date(visit.stateEnteredAt).toLocaleString() : '—'}</div>
            </div>
          </Card>

          <Card variant="outlined" className="p-4 bg-white shadow-sm">
            <h3 className="font-semibold text-neutral-900">Vitals</h3>
            {visit.vitals ? (
              <div className="mt-3 text-sm text-neutral-700">
                <div>Temp: {visit.vitals.temperatureC ?? '—'} °C</div>
                <div>BP: {visit.vitals.bpSystolic ?? '—'}/{visit.vitals.bpDiastolic ?? '—'} mmHg</div>
                <div>HR: {visit.vitals.heartRateBpm ?? '—'} bpm</div>
                <div>SpO₂: {visit.vitals.oxygenSaturationPercent ?? '—'}%</div>
                <div className="text-xs text-neutral-500 mt-2">Recorded: {new Date(visit.vitals.recordedAt).toLocaleString()}</div>
              </div>
            ) : (
              <div className="text-sm text-neutral-500">No vitals recorded</div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
