'use client';

import React, { useEffect, useState } from 'react';

export default function AllergyListClient({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/allergies?patientId=${encodeURIComponent(patientId)}`);
      const json = await res.json();
      setItems(json.items || []);
      setSummary(json.summary || null);
    } catch (e) {
      setItems([]);
      setSummary(null);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [patientId]);

  if (loading) return <div className="text-sm text-gray-500">Loading allergies…</div>;
  if (!items || items.length === 0) return <div className="text-sm text-gray-500">No active allergy records found.</div>;

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="bg-gray-50 p-3 rounded-md flex items-center justify-between border">
          <div>
            <div className="font-medium text-[#0F1724]">{a.substance?.display || 'Unknown'}</div>
            <div className="text-xs text-gray-500">{(a.reactions || []).map((r:any)=>r.manifestation).join(', ') || 'No reactions recorded'}</div>
          </div>
          <div className="text-sm text-gray-600">{a.criticality ? a.criticality : a.clinicalStatus}</div>
        </div>
      ))}
    </div>
  );
}
