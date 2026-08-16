import React from 'react';
import Link from 'next/link';
import AISummaryActions from '@/components/ai-summary/AISummaryActions';
import PrintSummaryButton from '@/components/ai-summary/PrintSummaryButton';
import PatientProfileHeader from '@/components/PatientProfileHeader';

type Props = {
  patient: any;
  latestSummary: any;
  events: any[];
  lastAnalyzed?: string;
  aiModel?: string;
  confidence?: string;
  dataSources?: number;
  riskScore?: number;
  riskDrivers?: string[];
};

export default function ClinicalSummaryLayout({ patient, latestSummary, events, lastAnalyzed, aiModel, confidence, dataSources, riskScore, riskDrivers }: Props) {
  const lastAnalyzedText = lastAnalyzed ?? (latestSummary?.generatedAt ? new Date(latestSummary.generatedAt).toLocaleString() : '—');
  const modelText = aiModel ?? latestSummary?.model ?? 'Clinical v2.1';
  const confidenceText = confidence ?? 'Unknown';
  const dataSourcesCount = dataSources ?? ((patient.labResults?.length || 0) + (patient.notes?.length || 0) + (patient.tests?.length || 0) + (patient.medications?.length || 0) + (patient.upcoming?.length || 0) + (patient.documents?.length || 0));
  const drivers = riskDrivers ?? (patient.conditions || []).slice(0, 6).map((c: any) => (typeof c === 'string' ? c : c.name || ''));

  return (
    <div className="bg-[#F6F9FB] min-h-screen py-6">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/records/${patient.id}`} className="inline-flex items-center text-sm text-teal-600 hover:underline gap-2" aria-label={`Back to ${patient.name}`}>&larr; Back to Patient</Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-[#0F172A]">AI Clinical Summary</h1>
              <div className="mt-1 text-sm text-slate-600">AI generated • {modelText} • Data through: <span className="font-medium text-slate-800">{lastAnalyzedText}</span></div>
            </div>
            <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs bg-[#E8FFF6] text-[#078B5D]">AI generated</span>
          </div>

          <div className="flex items-center gap-3">
            <AISummaryActions patientId={patient.id} versionId={latestSummary?.versionId} />
          </div>
        </div>

        <PatientProfileHeader patient={patient} />

        {/* Sticky section navigation */}
        <div className="sticky top-24 z-20 mt-4 bg-transparent">
          <nav className="flex gap-3 items-center text-sm" aria-label="Section navigation">
            {['Overview','Trends','Labs','Conditions','Medications','Notes','Care Gaps','Evidence'].map((s) => (
              <a key={s} href={`#${s.toLowerCase().replace(/\s+/g,'-')}`} className="px-3 py-1 rounded text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200">{s}</a>
            ))}
          </nav>
        </div>

        {/* Main layout: 8 / 4 */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Needs Attention + AI Brief */}
            <section id="overview" aria-labelledby="overview-heading">
              <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <h2 id="overview-heading" className="text-2xl font-semibold text-[#0F172A]">Needs Attention</h2>
                    <p className="mt-2 text-sm text-slate-600">Clinically important items sorted by severity and time sensitivity.</p>

                    <ul className="mt-4 space-y-3">
                      {/* Render up to 5 attention items derived from summary/findings */}
                      {(latestSummary?.findings || []).slice(0,5).map((f:any) => (
                        <li key={f.id} className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium text-slate-900">{f.title || f.name || f.code || 'Attention item'}</div>
                            <div className="text-xs text-slate-500">{f.explanation || f.note || ''}</div>
                          </div>
                          <div className="text-xs text-slate-500">{f.observedAt ? new Date(f.observedAt).toLocaleDateString() : ''}</div>
                        </li>
                      ))}

                      {/* Fallback items if none */}
                      {(!(latestSummary?.findings || []).length) && (
                        <li className="text-sm text-slate-600">No urgent attention items detected. Verify data freshness and review sources.</li>
                      )}
                    </ul>
                  </div>

                  <div className="w-80">
                    <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-sm text-center">
                      <div className="text-xs text-slate-500">Overall Risk</div>
                      <div className="mt-3 text-2xl font-semibold text-slate-900">{riskScore ?? '—'}</div>
                      <div className="mt-2 text-xs text-slate-500">{confidenceText} confidence • {dataSourcesCount} sources</div>
                      <div className="mt-3 text-sm text-left">
                        <div className="font-medium">Key drivers</div>
                        <ul className="mt-2 text-sm text-slate-600 space-y-1">
                          {drivers.slice(0,4).map((d:any) => <li key={d} className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-[#10B8A6]" aria-hidden />{d}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
                <h3 className="text-xl font-semibold text-[#0F172A]">AI Clinical Brief</h3>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-700">What matters today</h4>
                    <p className="mt-2 text-sm text-slate-600">{latestSummary?.clinicalBrief?.whatMatters ?? latestSummary?.summaryText ?? 'No concise brief provided.'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-700">Recommended review</h4>
                    <ul className="mt-2 text-sm text-slate-600 list-disc pl-4">
                      {(latestSummary?.recommendedReview || []).slice(0,4).map((r:any,i:number) => <li key={i}>{r}</li>)}
                      {!(latestSummary?.recommendedReview || []).length && <li>No specific review recommendations.</li>}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button className="px-3 py-2 rounded bg-[#2563EB] text-white">Mark as Reviewed</button>
                  <button className="px-3 py-2 rounded border bg-white">Create Follow-up Task</button>
                  <PrintSummaryButton />
                </div>
                <div className="mt-3 text-xs text-slate-500">AI summary is evidence-backed; click evidence chips to view supporting records.</div>
              </div>
            </section>

            {/* Trends explorer */}
            <section id="trends" className="mt-6">
              <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-[#0F172A]">Clinical Trends Explorer</h4>
                  <div className="text-sm text-slate-600">30d • 3mo • 6mo • 1y</div>
                </div>
                <div className="mt-4">
                  {/* Placeholder lightweight SVG chart with accessible table alternative */}
                  <div role="img" aria-label="Trends placeholder chart" className="w-full h-56 bg-gradient-to-b from-white to-slate-50 rounded"></div>
                  <div className="mt-3">
                    <table className="w-full text-sm border-collapse" aria-label="Trends table">
                      <thead>
                        <tr className="text-left text-xs text-slate-500">
                          <th className="pb-2">Metric</th>
                          <th className="pb-2">Latest</th>
                          <th className="pb-2">Change</th>
                          <th className="pb-2">Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="pt-2">LDL</td><td className="pt-2">{patient.labResults?.[0]?.result ?? '—'} {patient.labResults?.[0]?.unit ?? ''}</td><td className="pt-2">Improving</td><td className="pt-2">Target &lt; 100 mg/dL</td></tr>
                        <tr><td className="pt-2">Weight</td><td className="pt-2">{patient.weight ?? '—'} kg</td><td className="pt-2">Stable</td><td className="pt-2">—</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-4"><Link href={`/dashboard/records/${patient.id}/trends`} className="inline-flex items-center px-4 py-2 rounded border border-gray-200 text-teal-600 hover:bg-gray-50">View Full Trends →</Link></div>
              </div>
            </section>

            {/* What changed recently */}
            <section id="changes" className="mt-6">
              <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
                <h4 className="text-lg font-semibold text-[#0F172A]">What Changed Recently</h4>
                <div className="mt-4 space-y-3">
                  {(events || []).slice(0,6).map((e:any) => (
                    <div key={e.id} className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium">{e.type}: {e.title}</div>
                        <div className="text-xs text-slate-500">{e.subtitle} • {e.date ? new Date(e.date).toLocaleDateString() : ''}</div>
                      </div>
                      <div className="text-sm text-teal-600"><Link href={e.type === 'Lab' ? `/dashboard/records/${patient.id}/labs` : `/dashboard/records/${patient.id}/notes`}>Open</Link></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Right rail */}
          <aside className="space-y-6">
            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm">
              <h5 className="text-sm font-semibold">Clinical Status Snapshot</h5>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="p-3 bg-slate-50 rounded">Labs<br/><span className="font-semibold text-slate-900">{(patient.labResults || []).length} results</span></div>
                <div className="p-3 bg-slate-50 rounded">Vitals<br/><span className="font-semibold text-slate-900">{patient.vitals?.bp ?? '—'}</span></div>
                <div className="p-3 bg-slate-50 rounded">Medications<br/><span className="font-semibold text-slate-900">{(patient.medications || []).length} active</span></div>
                <div className="p-3 bg-slate-50 rounded">Care Gaps<br/><span className="font-semibold text-slate-900">{Math.max(0, 1 - (patient.labResults || []).length)}</span></div>
              </div>
              <div className="mt-3"><Link href={`/dashboard/records/${patient.id}/labs`} className="text-sm text-teal-600">View Labs →</Link></div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm">
              <h5 className="text-sm font-semibold">AI Evidence</h5>
              <div className="mt-3 text-sm text-slate-600">
                <div>Sources analyzed: <strong className="text-slate-800">{dataSourcesCount}</strong></div>
                <div className="mt-2">Latest lab: <div className="font-medium">{patient.labResults?.[0]?.name ?? '—'}</div><div className="text-xs text-slate-500">{patient.labResults?.[0]?.date ? new Date(patient.labResults[0].date).toLocaleDateString() : '—'}</div></div>
              </div>
              <div className="mt-3"><Link href={`/dashboard/records/${patient.id}/sources`} className="px-3 py-2 rounded bg-white border text-teal-600">View source records →</Link></div>
            </div>

            <div className="bg-[#EFF8FF] rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
              <h5 className="text-sm font-semibold">Patient-Friendly Summary</h5>
              <div className="mt-2 text-sm text-slate-700">{latestSummary?.patientFriendlySummary ?? 'No patient summary available.'}</div>
              <div className="mt-3 grid gap-2">
                <Link href={`/dashboard/records/${patient.id}/compose-summary`} className="px-3 py-2 border rounded text-sm">Edit</Link>
                <Link href={`/dashboard/records/${patient.id}/messages`} className="px-3 py-2 bg-[#008B7A] text-white rounded text-sm">Message Patient</Link>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 border border-blue-100">This AI-generated summary supports clinical review and may contain incomplete or incorrect information. Verify important findings against the source record before making clinical decisions.</div>
          </aside>
        </div>
      </div>
    </div>
  );
}
