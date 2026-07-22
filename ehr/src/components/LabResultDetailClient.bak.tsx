"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PatientBanner } from '@/design-system/clinical/PatientBanner';

export default function LabResultDetailClient({ patient, labId }: { patient: any; labId: string }) {
  const router = useRouter();
  const lab = (patient.labResults || []).find((l: any) => l.id === labId);
  if (!lab) return <div className="p-6 bg-white rounded">Lab result not found.</div>;

  const value = parseFloat(String(lab.result));
  let statusLabel = 'Normal';
  let statusClass = 'bg-emerald-50 text-emerald-700';
  if (lab.normalRange) {
    const lt = lab.normalRange.match(/<\s*([\d.]+)/);
    const gt = lab.normalRange.match(/>\s*([\d.]+)/);
    if (lt) {
      const thr = parseFloat(lt[1]);
      if (!Number.isNaN(value) && value > thr) { statusLabel = 'High'; statusClass = 'bg-red-50 text-red-700'; }
    } else if (gt) {
      const thr = parseFloat(gt[1]);
      if (!Number.isNaN(value) && value < thr) { statusLabel = 'Low'; statusClass = 'bg-amber-50 text-amber-700'; }
    }
  }

  // scale for mini chart
  let max = 5;
  const m = lab.normalRange && lab.normalRange.match(/<\s*([\d.]+)/);
  if (m) max = Math.max(parseFloat(m[1]) * 1.6, 5);
  if (lab.unit && lab.unit.toLowerCase().includes('ng')) max = Math.max(value * 4 || 5, 5);
  const pos = !Number.isNaN(value) ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  const isLipid = /lipid/i.test(lab.name || '');
  const components = isLipid ? [
    { test: 'Total Cholesterol', result: '4.2', unit: 'mmol/L', reference: '< 5.2', status: 'Normal' },
    { test: 'HDL Cholesterol', result: '1.3', unit: 'mmol/L', reference: '> 1.0', status: 'Normal' },
    { test: 'LDL Cholesterol', result: String(lab.result), unit: lab.unit || 'mmol/L', reference: lab.normalRange || '< 3.0', status: statusLabel },
    { test: 'Triglycerides', result: '1.2', unit: 'mmol/L', reference: '< 1.7', status: 'Normal' },
    { test: 'Non-HDL Cholesterol', result: '2.9', unit: 'mmol/L', reference: '< 4.2', status: 'Normal' },
  ] : [
    { test: lab.name, result: String(lab.result), unit: lab.unit || '', reference: lab.normalRange || '', status: statusLabel }
  ];

  const [shareStatus, setShareStatus] = React.useState('');

  async function handleDownload() {
    if (typeof window === 'undefined') return;
    // Prefer pixel-perfect HTML->PDF endpoint, fallback to programmatic PDF
    const htmlUrl = `/api/labs/${patient.id}/${lab.id}/pdf/html`;
    const programmaticUrl = `/api/labs/${patient.id}/${lab.id}/pdf`;
    try {
      let res = await fetch(htmlUrl);
      if (!res.ok) {
        res = await fetch(programmaticUrl);
      }
      if (!res.ok) {
        window.print();
        return;
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${(lab.name || 'lab').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      window.print();
    }
  }

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: `${lab.name} — ${patient.name}`, text: `Lab result for ${patient.name}`, url });
        setShareStatus('Shared');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareStatus('Link copied');
      } else {
        setShareStatus('Unable to share');
      }
      setTimeout(() => setShareStatus(''), 2000);
    } catch (err) {
      setShareStatus('Failed to share');
      setTimeout(() => setShareStatus(''), 2000);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
        const labs = patient.labResults || [];
        if (labs.length < 2) return;
        const idx = labs.findIndex((r: any) => r.id === lab.id);
        if (idx === -1) return;
        const next = e.key === 'ArrowDown' ? Math.min(labs.length - 1, idx + 1) : Math.max(0, idx - 1);
        if (next !== idx) {
          const nextId = labs[next].id;
          router.push(`/dashboard/records/${patient.id}/labs/${nextId}`);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [patient.labResults, lab.id, router]);

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4">
          <img src={patient.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name)}&background=E6FFFA&color=0F766E`} alt="patient" className="w-12 h-12 rounded-full" />
          <div>
            <div className="text-lg font-semibold text-gray-900">{patient.name}</div>
            <div className="text-xs text-gray-500">MRN: {patient.mrn} • DOB: {patient.dob || '—'}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-neutral-600">{lab.date}</div>
          <button onClick={handleDownload} aria-label="Download PDF" className="px-3 py-2 rounded-md bg-white border">Download PDF</button>
          <button onClick={handleShare} aria-label="Share results" className="px-3 py-2 rounded-md bg-white border">Share Results</button>
          {shareStatus && <div role="status" aria-live="polite" className="text-sm text-neutral-600 ml-2">{shareStatus}</div>}
        </div>
      </div>

      <div className="p-6">
        <PatientBanner
          mrn={patient.mrn}
          firstName={patient.name?.split(' ')[0]}
          lastName={patient.name?.split(' ').slice(1).join(' ')}
          dateOfBirth={patient.dob}
          age={patient.age}
          sex={patient.gender}
          allergies={patient.allergies || []}
          identifiers={patient.identifiers || [{ label: 'MRN', value: patient.mrn }]}
          verificationStatus={patient.verificationStatus || 'verified'}
        />

        <div className="mt-6 grid grid-cols-12 gap-6">
          <aside className="col-span-3 bg-neutral-50 rounded-lg p-3 overflow-auto" style={{ maxHeight: '60vh' }} aria-label="All lab results">
            <div className="text-sm font-semibold text-gray-900 mb-2">All Lab Results</div>
            <div className="space-y-2">
              {(patient.labResults || []).map((r: any) => (
                <Link key={r.id} href={`/dashboard/records/${patient.id}/labs/${r.id}`} role="link" tabIndex={0} aria-current={r.id === lab.id ? 'true' : undefined} className={`block p-3 rounded ${r.id === lab.id ? 'bg-white border-l-4 border-teal-400 shadow-sm' : 'hover:bg-white'}`}>
                  <div className="font-medium text-sm text-gray-900">{r.name}</div>
                  <div className="text-xs text-gray-500">{r.date} • {r.unit || ''}</div>
                </Link>
              ))}
            </div>
          </aside>

          <main className="col-span-6 bg-white rounded-lg shadow-inner">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500">{lab.name}</div>
                  <div className="mt-2 text-5xl font-extrabold text-gray-900">{lab.result} <span className="text-lg font-medium text-gray-600">{lab.unit || ''}</span></div>
                  <div className="mt-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${statusClass} ring-1 ring-inset ring-neutral-100`}>{statusLabel}</span>
                  </div>
                </div>

                <div className="w-64">
                  <div className="h-3 bg-neutral-100 rounded overflow-hidden">
                    <div style={{ width: `${pos}%` }} className="h-3 bg-teal-500 rounded" />
                  </div>
                  <div className="mt-2 text-xs text-gray-500 flex justify-between"><span>0</span><span>{Math.round(max)}</span></div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-sm font-semibold text-gray-800 mb-2">Test Components</div>
                <div className="border rounded-md overflow-hidden">
                  <div className="grid grid-cols-4 gap-2 bg-neutral-50 p-3 text-xs font-semibold text-neutral-700">
                    <div>Test</div>
                    <div>Result</div>
                    <div>Unit</div>
                    <div>Reference Range</div>
                  </div>
                  <div>
                    {components.map((c, i) => (
                      <div key={i} className={`grid grid-cols-4 gap-2 p-3 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'} text-sm items-center`}>
                        <div>{c.test}</div>
                        <div className={`font-medium ${c.status === 'Normal' ? 'text-neutral-900' : 'text-red-700'}`}>{c.result}</div>
                        <div className="text-sm text-neutral-600">{c.unit}</div>
                        <div className="text-sm text-neutral-600">{c.reference}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 text-sm text-neutral-700">
                  <div className="font-semibold">Interpretation</div>
                  <div className="mt-2">{lab.name} result {lab.result}{lab.unit ? ' ' + lab.unit : ''} {statusLabel === 'Normal' ? 'is within the reference range.' : statusLabel === 'High' ? 'is above the reference range — consider clinical correlation.' : ''}</div>
                  <div className="mt-3 text-sm text-neutral-600">Notes: {lab.notes || 'Continue with recommended care and discuss with clinician if concerned.'}</div>
                </div>
              </div>
            </div>
          </main>

          <aside className="col-span-3 bg-neutral-50 rounded-lg p-4">
            <div className="text-sm font-semibold text-neutral-900">Result Summary</div>
            <div className="mt-3 text-sm text-neutral-700 space-y-3">
              <div><strong>Ordered by:</strong> {lab.orderedBy || patient.lastAttendingDoctor || '—'}</div>
              <div><strong>Sample Collected:</strong> {lab.sampleCollected || lab.date || '—'}</div>
              <div><strong>Reported On:</strong> {lab.date}</div>
              <div><strong>Status:</strong> <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 rounded">Final</span></div>
              <div className="mt-3"><strong>Laboratory</strong><div className="text-xs text-neutral-600">{lab.labName || 'Maple Health Labs'}</div></div>
              <div className="mt-3"><strong>Accession #</strong><div className="text-xs text-neutral-600">{lab.accession || 'LAB' + (lab.id || '').toUpperCase()}</div></div>
            </div>
          </aside>
      </div>
    </div>
  );
}
