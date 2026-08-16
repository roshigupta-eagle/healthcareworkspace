'use client';

import { useState, useEffect } from 'react';

export default function useAIClinicalSummary(patientId: string) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    fetch(`/api/patients/${patientId}/ai-summary`).then(async (r) => {
      if (!r.ok) {
        setError((await r.json()).error || 'failed');
        setLoading(false);
        return;
      }
      const j = await r.json();
      setData(j.data);
      setLoading(false);
    }).catch((e) => { setError(String(e)); setLoading(false); });
  }, [patientId]);

  return { data, loading, error, reload: () => { setLoading(true); fetch(`/api/patients/${patientId}/ai-summary`).then(async(r)=>{ if (!r.ok){ setError((await r.json()).error || 'failed'); setLoading(false); return;} const j=await r.json(); setData(j.data); setLoading(false);}).catch((e)=>{setError(String(e)); setLoading(false);}); } };
}
