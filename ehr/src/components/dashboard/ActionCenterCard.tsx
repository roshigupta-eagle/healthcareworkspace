"use client";

import React, { useEffect, useState } from 'react';
import { getActionCenterCounts } from '@/lib/mock/dashboardService';

export default function ActionCenterCard() {
  const [counts, setCounts] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    getActionCenterCounts().then((c) => mounted && setCounts(c));
    return () => { mounted = false; };
  }, []);

  if (!counts) return <div className="p-4 bg-white border rounded">Loading…</div>;

  const items = [
    { key: 'criticalResults', label: 'Critical results', href: '/dashboard/results?severity=critical' },
    { key: 'abnormalResults', label: 'Abnormal results', href: '/dashboard/results?severity=abnormal' },
    { key: 'unsignedNotes', label: 'Unsigned notes', href: '/dashboard/notes?status=unsigned' },
    { key: 'refills', label: 'Refill requests', href: '/dashboard/refills' },
    { key: 'ordersAwaitingSignature', label: 'Orders awaiting signature', href: '/dashboard/orders?status=signature-required' },
  ];

  return (
    <section className="p-4 bg-white border rounded">
      <h3 className="text-sm font-medium">Action Center</h3>
      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li key={it.key} className="flex items-center justify-between">
            <a href={it.href} className="text-sm text-slate-700">{it.label}</a>
            <span className="text-sm font-semibold text-sky-600">{counts[it.key] ?? 0}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
