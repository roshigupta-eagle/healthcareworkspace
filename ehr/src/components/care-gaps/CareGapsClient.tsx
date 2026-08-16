"use client";

import React, { useEffect, useMemo, useState } from 'react';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import SummaryCard from './SummaryCard';
import FilterBar from './FilterBar';
import CareGapsTable from './CareGapsTable';
import CareGapHelpBanner from './CareGapHelpBanner';
import { useRouter } from 'next/navigation';

export default function CareGapsClient({ patient }: { patient: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ critical: 0, overdue: 0, dueSoon: 0, recommended: 0 });
  const [active, setActive] = useState<string>('all');
  const [openGuidelines, setOpenGuidelines] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);

  const fetchData = async (status?: string) => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (status && status !== 'all') params.status = status === 'due-soon' ? 'due-soon' : status;
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`/api/patients/${patient.id}/care-gaps${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to load');
      const body = await res.json();
      setItems(body.items || []);
      setSummary(body.summary || {});
    } catch (e: any) {
      setError(e?.message || 'Unable to load care gaps');
    } finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(active); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function handleSelectFilter(key: string) {
    setActive(key);
    // push URL state
    try { const url = new URL(window.location.href); if (key === 'all') { url.searchParams.delete('status'); } else { url.searchParams.set('status', key); } window.history.pushState({}, '', url.toString()); } catch (e) {}
  }

  function handleOrder(item: any) {
    // prefill lab composer via localStorage draft for this patient
    try {
      const patientId = patient.id;
      const key = `labDraft:${patientId}`;
      const pre = { selected: [{ id: mapToLabTestId(item.title), name: item.title, code: mapToLabCode(item.title), specimen: 'Blood' }], reason: `Order from care gap ${item.id}`, orderDate: new Date().toISOString().slice(0,10) };
      localStorage.setItem(key, JSON.stringify(pre));
      // navigate to order composer
      router.push(`/dashboard/orders/labs/new?patientId=${patient.id}`);
    } catch (e) {
      alert('Failed to open order composer');
    }
  }

  function handleSchedule(item: any) {
    try {
      const draft = { patientName: patient.name, appointmentType: item.category || 'Follow-up', selectedSlot: null };
      localStorage.setItem('apptDraft', JSON.stringify(draft));
      router.push(`/dashboard/appointments/book?patientId=${patient.id}`);
    } catch (e) { alert('Failed to open scheduling'); }
  }

  function openDetail(it: any) { setDetail(it); }

  function closeDetail() { setDetail(null); }

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28">
      <div className="max-w-[1400px] mx-auto px-6">
        <PatientProfileHeader patient={patient} showActions={false} />

        <div className="mt-6">
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800">Care Gaps Overview</h2>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard title="Critical" count={summary.critical ?? 0} tone="critical" active={active==='critical'} onClick={() => handleSelectFilter('critical')} />
              <SummaryCard title="Overdue" count={summary.overdue ?? 0} tone="overdue" active={active==='overdue'} onClick={() => handleSelectFilter('overdue')} />
              <SummaryCard title="Due Soon" count={summary.dueSoon ?? 0} tone="dueSoon" active={active==='due-soon'} onClick={() => handleSelectFilter('due-soon')} />
              <SummaryCard title="Recommended" count={summary.recommended ?? 0} tone="recommended" active={active==='recommended'} onClick={() => handleSelectFilter('recommended')} />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="w-2/3">
                <FilterBar counts={{ total: (items||[]).length + 0, critical: summary.critical, overdue: summary.overdue, dueSoon: summary.dueSoon, recommended: summary.recommended }} active={active} onSelect={handleSelectFilter} onOpenAdvanced={() => alert('Open advanced filters')} />
              </div>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_,i)=> (<div key={i} className="h-12 bg-gray-100 rounded-md"/>))}
                </div>
              ) : error ? (
                <div className="p-4 text-sm text-red-600">We couldn't load care gaps — <button onClick={() => void fetchData(active)} className="underline">Try again</button></div>
              ) : (
                <CareGapsTable items={items} onOrder={handleOrder} onSchedule={handleSchedule} onOpen={openDetail} />
              )}
            </div>

            <CareGapHelpBanner onOpen={() => setOpenGuidelines(true)} />
          </section>
        </div>
      </div>

      {detail && (
        <div className="fixed right-6 top-20 w-[480px] z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{detail.title}</h3>
                <div className="text-sm text-gray-500">{detail.category} • {detail.status}</div>
              </div>
              <button onClick={closeDetail} className="text-gray-500">✕</button>
            </div>
            <div className="mt-3 text-sm text-gray-700">
              <div><strong>Due:</strong> {detail.dueDate}</div>
              <div className="mt-2"><strong>Last completed:</strong> {detail.lastCompletedDate || 'Never'}</div>
              <div className="mt-3"><strong>Recommended action:</strong> {detail.recommendedAction}</div>
              <div className="mt-3 text-sm text-gray-600">Clinical rule and measurement details are available in the guidance panel.</div>
            </div>
            <div className="mt-4 flex items-center gap-2 justify-end">
              <button onClick={() => { handleSchedule(detail); closeDetail(); }} className="px-3 py-1 rounded border border-teal-300 text-teal-700">Schedule</button>
              <button onClick={() => { handleOrder(detail); closeDetail(); }} className="px-3 py-1 rounded border border-teal-300 text-teal-700">Order</button>
            </div>
          </div>
        </div>
      )}

      {openGuidelines && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenGuidelines(false)} />
          <div className="relative w-[720px] bg-white rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Guidelines & Recommendations</h3>
            <div className="mt-3 text-sm text-gray-700">Clinical guidance content (linked to configured measures) would appear here.</div>
            <div className="mt-4 text-right"><button onClick={() => setOpenGuidelines(false)} className="px-3 py-1 rounded bg-teal-700 text-white">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function mapToLabTestId(title: string) {
  const t = title.toLowerCase();
  if (t.includes('hba1c') || t.includes('a1c') || t.includes('hba1c')) return 'hba1c';
  if (t.includes('lipid')) return 'lipid';
  return 'cmp';
}

function mapToLabCode(title: string) {
  const t = title.toLowerCase();
  if (t.includes('hba1c') || t.includes('a1c')) return 'A1C';
  if (t.includes('lipid')) return 'LIPID';
  return 'CMP';
}
