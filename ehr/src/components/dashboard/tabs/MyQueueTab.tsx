"use client";

import React, { useEffect, useState } from 'react';
import { getMyQueueItems } from '@/lib/mock/dashboardService';
import WidgetLoadingSkeleton from '../WidgetLoadingSkeleton';
import WidgetEmptyState from '../WidgetEmptyState';

export default function MyQueueTab() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    getMyQueueItems()
      .then((list) => mounted && setItems(list))
      .catch((e) => mounted && setError((e as Error).message || 'Failed'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <WidgetLoadingSkeleton />;
  if (error) return <div className="p-4 text-red-700">Could not load queue</div>;
  if (!items || items.length === 0) return <WidgetEmptyState title="You are caught up" message="New assigned tasks, results, and documentation items will appear here." />;

  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.id} className="p-3 border rounded flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{it.patientName}</div>
            <div className="text-xs text-gray-500">{it.type} • Priority: {it.priority}</div>
          </div>
          <div className="flex items-center gap-2">
            <a href={`/dashboard/records/${it.patientId}`} className="text-sm text-blue-600">Open</a>
            <button
              className="text-sm px-2 py-1 border rounded disabled:opacity-60"
              onClick={async () => {
                if (completing[it.id]) return;
                setCompleting((s) => ({ ...s, [it.id]: true }));
                try {
                  const res = await fetch('/api/queue/complete', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ itemId: it.id }),
                  });
                  if (!res.ok) throw new Error((await res.json()).error || 'complete failed');
                  // update locally
                  setItems((prev) => prev?.map((x) => (x.id === it.id ? { ...x, status: 'COMPLETED' } : x)) ?? null);
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.error('complete error', e);
                  alert('Failed to complete item');
                } finally {
                  setCompleting((s) => ({ ...s, [it.id]: false }));
                }
              }}
              disabled={!!completing[it.id] || it.status === 'COMPLETED'}
            >
              {completing[it.id] ? 'Completing…' : it.status === 'COMPLETED' ? 'Completed' : 'Complete'}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
