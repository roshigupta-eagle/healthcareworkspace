"use client";

import React, { useEffect, useState } from 'react';
import { Button, Card } from '@/design-system';
import { useRouter } from 'next/navigation';

type Props = { initialProcedure: any; initialVisit: any };

export default function OrderDetailClient({ initialProcedure, initialVisit }: Props) {
  const router = useRouter();
  const [procedure, setProcedure] = useState(initialProcedure);
  const [visit, setVisit] = useState(initialVisit);

  useEffect(() => {
    let mounted = true;
    const fetchLatest = async () => {
      try {
        const res = await fetch(`/api/cardiology/visits/${visit.id}`);
        if (res.ok) {
          const json = await res.json();
          if (mounted) setVisit(json);
          const p = (json.proceduresOrdered || []).find((x: any) => x.id === procedure.id);
          if (p && mounted) setProcedure(p);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchLatest();
    const id = setInterval(fetchLatest, 3000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [procedure.id, visit.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Order: {procedure.procedureType}</h1>
          <p className="text-sm text-neutral-600">For: {visit.patientName} • Visit: {visit.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push('/doctor')}>Back</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Procedure Details</h3>
            <div className="mt-3 text-sm text-neutral-600">
              <div>Ordered by: {procedure.orderedBy}</div>
              <div className="mt-2">Status: {procedure.status}</div>
              <div className="mt-2">Ordered at: {procedure.orderedAt}</div>
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Quick Actions</h3>
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
