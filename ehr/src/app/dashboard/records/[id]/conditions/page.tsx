import Link from 'next/link';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';

export default async function ConditionsOverviewPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);

  const patient = getPatientById(String(id));
  if (!patient) return (<div className="max-w-7xl mx-auto px-6 py-6">Patient not found</div>);

  const conditions = patient.conditions || [];
  const conditionCount = conditions.length;
  const topCondition = conditions[0] || 'No active conditions';

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 pb-32">
      <div className="mb-4">
        <Link href={`/dashboard/records/${patient.id}`} className="inline-flex items-center text-sm text-teal-600 hover:underline gap-2">← Back to Patient</Link>
      </div>

      <PatientProfileHeader patient={patient} />

      {/* Command center header */}
      <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-[#E6EEF2]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Conditions — Command Center</h1>
            <p className="mt-1 text-sm text-gray-600">Overview, clinical context, care gaps, and quick actions for active conditions.</p>

            <div className="mt-4 flex items-center gap-3">
              <div className="px-3 py-2 bg-[#F2FFFB] rounded text-sm"><strong className="text-teal-700">{conditionCount}</strong> active conditions</div>
              <div className="px-3 py-2 bg-[#EEF2FF] rounded text-sm">Top condition: <strong className="ml-1">{topCondition}</strong></div>
              <div className="px-3 py-2 bg-[#FFF4D4] rounded text-sm">Care gaps: <strong className="ml-1">{Math.max(0, 2 - (patient.labResults || []).length)}</strong></div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href={`/dashboard/records/${patient.id}/conditions/add`} className="px-4 py-2 bg-teal-600 text-white rounded-md">Add Condition</Link>
            <button className="px-4 py-2 border rounded-md text-teal-600">Import Problem List</button>
            <Link href={`/dashboard/records/${patient.id}/conditions/${encodeURIComponent(topCondition.toLowerCase().replace(/\s+/g, '-'))}`} className="px-4 py-2 bg-white border rounded-md text-sm text-teal-600">Open Top Condition</Link>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search & filters (visual) */}
          <div className="bg-white rounded-xl border border-[#DDE7F0] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input aria-label="Search conditions" placeholder="Search conditions, signs, symptoms..." className="px-3 py-2 border rounded w-80" />
                <select className="px-3 py-2 border rounded">
                  <option>All statuses</option>
                  <option>Active</option>
                  <option>Resolved</option>
                </select>
                <select className="px-3 py-2 border rounded">
                  <option>All providers</option>
                </select>
              </div>
              <div className="text-sm text-gray-500">Showing <strong className="text-gray-900">{conditionCount}</strong> conditions</div>
            </div>
          </div>

          {/* Conditions list (rich cards) */}
          <div className="space-y-4">
            {conditions.map((c: string) => {
              const slug = encodeURIComponent(c.toLowerCase().replace(/\s+/g, '-'));
              const lastUpdated = patient.notes?.find((n: any) => (n.snippet || '').toLowerCase().includes((c || '').toLowerCase()))?.date || patient.lastVisit || 'Unknown';
              const risk = c.toLowerCase().includes('diabetes') ? 'High' : 'Medium';
              return (
                <div key={c} className="bg-white rounded-xl border border-[#E6EEF2] p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-md bg-[#F6F9FB] flex items-center justify-center text-sm font-semibold text-[#121A2D]">{c.split(' ').slice(0,2).map(s=>s[0]).join('')}</div>
                    <div>
                      <div className="text-lg font-semibold text-[#121A2D]">{c}</div>
                      <div className="text-sm text-gray-500">Status: <strong>Active</strong> • Last updated: {lastUpdated}</div>
                      <div className="mt-2 text-sm text-gray-700">Summary: Key management items and recent trends shown. Tap Open to view full condition workspace.</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">Risk: <span className={`ml-2 inline-block px-2 py-1 rounded ${risk === 'High' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{risk}</span></div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <Link href={`/dashboard/records/${patient.id}/conditions/${slug}`} className="text-sm text-teal-600">Open</Link>
                        <button className="text-sm text-gray-600">Management Plan</button>
                        <button className="text-sm text-gray-600">Order Labs</button>
                      </div>
                      <div className="text-xs text-gray-500">Care team: {patient.lastAttendingDoctor || '—'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Condition comparison sample */}
          <div className="bg-white rounded-xl border border-[#DDE7F2] p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-[#121A2D]">Compare Conditions</h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {conditions.slice(0,2).map((c: string) => (
                <div key={`cmp-${c}`} className="p-3 rounded-lg bg-gray-50">
                  <div className="font-medium">{c}</div>
                  <div className="text-xs text-gray-500 mt-1">Last lab: {patient.labResults?.[0]?.name ?? '—'}</div>
                  <div className="mt-2 text-sm">Recent actions: Medication review, lifestyle counselling.</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT - Sidebar */}
        <aside className="space-y-4">
          <div className="bg-white rounded-xl border border-[#DDE7F0] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold text-[#121A2D]">AI Condition Overview</h5>
              <div className="text-xs text-gray-500">Demo</div>
            </div>
            <div className="mt-3 text-sm text-gray-700">Generate a short, clinician-focused summary for the patient's active conditions.</div>
            <div className="mt-3 flex gap-2">
              <Link href={`/dashboard/records/${patient.id}/ai-clinical-summary`} className="px-3 py-2 bg-[#F2EDFF] text-[#6046B6] rounded text-sm">Open AI Summary</Link>
              <button className="px-3 py-2 border rounded text-sm">Generate</button>
            </div>
            <div className="mt-2 text-xs text-gray-500">AI output must be reviewed by a clinician.</div>
          </div>

          <div className="bg-white rounded-xl border border-[#DDE7F0] p-4 shadow-sm">
            <h5 className="text-sm font-semibold text-[#121A2D]">Care Gaps</h5>
            <div className="mt-3 text-sm text-gray-700 space-y-2">
              <div className="flex justify-between"><div>Diabetes: HbA1c overdue</div><div className="text-rose-600 font-semibold">Overdue</div></div>
              <div className="flex justify-between"><div>Hypertension: Home BP logs</div><div className="text-amber-600 font-semibold">Pending</div></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#DDE7F0] p-4 shadow-sm">
            <h5 className="text-sm font-semibold text-[#121A2D]">Open Tasks</h5>
            <ul className="mt-3 text-sm space-y-2">
              <li>Schedule lipid panel — {patient.upcoming?.[0]?.date ?? '—'}</li>
              <li>Message patient re: BP log</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-[#DDE7F0] p-4 shadow-sm">
            <h5 className="text-sm font-semibold text-[#121A2D]">Quick Actions</h5>
            <div className="mt-3 grid gap-2">
              <button className="px-3 py-2 bg-teal-600 text-white rounded">Order Labs</button>
              <button className="px-3 py-2 border rounded">Create Care Plan</button>
              <button className="px-3 py-2 border rounded">Refer to Specialist</button>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom sticky action bar */}
      <div className="fixed left-0 right-0 bottom-0 bg-white border-t p-3 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">Ready — patient record: <strong>{patient.name}</strong></div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border rounded">Export</button>
            <button className="px-4 py-2 bg-teal-600 text-white rounded">Start Multidisciplinary Review</button>
          </div>
        </div>
      </div>
    </div>
  );
}
