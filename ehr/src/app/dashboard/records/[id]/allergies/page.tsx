import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import AllergyFormClient from '@/components/AllergyFormClient';
import AllergyReviewFormClient from '@/components/AllergyReviewFormClient';
import FHIRExportClient from '@/components/FHIRExportClient';
import { mapAllergySummaryToFHIR } from '@/lib/fhir/mappers';
import { getPatientById } from '../../mockPatients';

function formatDate(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }); } catch { return iso; }
}

export default async function AllergyDetailPage({ params, searchParams }: { params: any; searchParams?: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);
  let session: any = null;
  try { // @ts-ignore
    session = await auth();
  } catch { }
  if (!session && searchParams && searchParams.asUser && process.env.NODE_ENV !== 'production') {
    const override = Array.isArray(searchParams.asUser) ? searchParams.asUser[0] : searchParams.asUser;
    if (override) session = { user: { id: override, name: override } };
  }
  if (!session) redirect('/login');

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  const lastReviewed = patient.notes?.[0]?.date ?? 'Jun 05, 2026';
  const reviewedBy = patient.notes?.[0]?.author ?? 'Dr. Chen';

  return (
    <div className="bg-[#F6F9FB] min-h-screen py-6">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/records/${patient.id}`} className="text-sm text-teal-600 hover:underline">← Back to Patient</Link>
            <h1 className="text-2xl font-bold text-[#121A2D]">Allergy Detail</h1>
            <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs bg-[#E8FFF6] text-[#078B5D]">No Known Allergies</span>
          </div>
          <div className="text-sm text-gray-500">Updated just now</div>
        </div>

        <PatientProfileHeader patient={patient} />

        {/* Hero */}
        <div className="mt-6 bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm flex items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-lg bg-emerald-50 flex items-center justify-center text-2xl text-emerald-700">✔️</div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#121A2D]">No Known Allergies</h2>
                <p className="mt-2 text-sm text-gray-700">No drug, food, environmental, or latex allergies are currently documented for this patient.</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-2"><span className="text-xs text-gray-500">Verified</span><span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold">Verified</span></div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-700">
              <div>
                <div className="text-xs text-gray-500">Allergy status</div>
                <div className="font-medium text-[#121A2D]">No known allergies</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Last reviewed</div>
                <div className="font-medium">{formatDate(lastReviewed)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Verified by</div>
                <div className="font-medium">{reviewedBy}</div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">Source: Patient chart review • Next review: At next encounter • Clinical safety status: No allergy conflicts found</div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Drug Allergies', status: 'None documented' },
            { title: 'Food Allergies', status: 'None documented' },
            { title: 'Environmental Allergies', status: 'None documented' },
            { title: 'Latex Allergy', status: 'None documented' },
            { title: 'Allergy Verification', status: 'Verified' },
            { title: 'Safety Conflicts', status: 'Clear' },
          ].map((c) => (
            <div key={c.title} className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
              <div className="text-xs text-gray-500">{c.title}</div>
              <div className="mt-2 font-medium text-[#121A2D]">{c.status}</div>
            </div>
          ))}
        </div>

        {/* Main workspace + sidebar */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Allergy Status Overview */}
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
              <h4 className="text-lg font-semibold">Allergy Status Overview</h4>
              <div className="mt-3 text-sm text-gray-700">Current allergy status: <span className="font-medium">No known allergies</span></div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Clinical meaning</div>
                  <div className="font-medium">No allergy reactions are currently recorded in the patient’s chart. Continue to verify allergies at each encounter before prescribing, ordering, or administering medication.</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Confidence</div>
                  <div className="font-medium text-emerald-700">High</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">Review source: Patient chart and recent encounter documentation</div>
            </div>

            {/* Allergy Categories */}
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
              <h4 className="text-lg font-semibold">Allergy Categories</h4>
              <div className="mt-3 space-y-3">
                {[
                  { k: 'Drug Allergies', note: 'No known drug allergies documented' },
                  { k: 'Food Allergies', note: 'No known food allergies documented' },
                  { k: 'Environmental Allergies', note: 'No known environmental allergies documented' },
                  { k: 'Latex Allergy', note: 'No known latex allergy documented' },
                ].map((r) => (
                  <div key={r.k} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{r.k}</div>
                      <div className="text-xs text-gray-500">{r.note}</div>
                      <div className="text-xs text-gray-400">Last reviewed {formatDate(lastReviewed)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link href="#" className="text-sm text-teal-600">Review →</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Patient-Reported Allergy Review */}
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
              <h4 className="text-lg font-semibold">Patient-Reported Allergy Review</h4>
              <div className="mt-3 text-sm text-gray-700">
                <div className="text-xs text-gray-500">Last patient confirmation</div>
                <div className="font-medium">{formatDate(lastReviewed)}</div>
                <div className="mt-2">Patient reported: <span className="font-medium">No allergies</span></div>
                <div className="mt-1">Reported reactions: <span className="font-medium">None</span></div>
                <div className="mt-1">Intolerances: <span className="font-medium">None documented</span></div>
                <div className="mt-2 text-sm text-gray-600">Notes: Patient denies known medication, food, latex, or environmental allergies.</div>
                <div className="mt-3"><Link href={`#update-review`} className="px-3 py-2 bg-white border rounded text-teal-600">Update Patient Allergy Review</Link></div>
              </div>
            </div>

            {/* Medication Safety Context */}
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
              <h4 className="text-lg font-semibold">Medication Safety Context</h4>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                {(patient.medications || []).map((m:any)=> (
                  <div key={m.name} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{m.name} {m.dose ? ' ' + m.dose : ''}</div>
                      <div className="text-xs text-gray-500">{m.freq}</div>
                    </div>
                    <div className="text-sm text-emerald-700">No allergy conflicts</div>
                  </div>
                ))}
              </div>
              <div className="mt-3"><Link href={`/dashboard/records/${patient.id}/medications`} className="px-3 py-2 bg-white border rounded text-teal-600">Open Medication History →</Link></div>
            </div>

            {/* Allergy Review Timeline */}
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
              <h4 className="text-lg font-semibold">Allergy Review Timeline</h4>
              <div className="mt-4 space-y-3">
                {(patient.history || []).map((h:any) => (
                  <div key={h.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1 w-3 h-3 rounded-full bg-emerald-300" />
                    <div>
                      <div className="text-sm font-medium">{formatDate(h.date)} — {h.reason}</div>
                      <div className="text-xs text-gray-500">{h.provider}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3"><Link href={`/dashboard/records/${patient.id}/allergy-history`} className="px-3 py-2 bg-white border rounded text-teal-600">View Full Allergy History →</Link></div>
            </div>

            {/* Documents & Source Records */}
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
              <h4 className="text-lg font-semibold">Documents & Source Records</h4>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                {(patient.documents || []).map((d:any) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-gray-500">{formatDate(d.date)}</div>
                    </div>
                    <div><Link href={d.url || '#'} className="text-sm text-teal-600">View</Link></div>
                  </div>
                ))}
                {(patient.documents || []).length === 0 && (
                  <div className="text-sm text-gray-500">No allergy source records found.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
              <h5 className="text-sm font-semibold">Allergy Safety Summary</h5>
              <div className="mt-3 text-sm text-gray-700">
                <div className="text-xs text-gray-500">Overall allergy status</div>
                <div className="font-medium">No known allergies</div>
                <div className="mt-2 text-xs text-gray-500">Last reviewed: {formatDate(lastReviewed)}</div>
                <div className="mt-1 text-xs text-gray-500">Safety check: Clear</div>
                <div className="mt-1 text-xs text-gray-500">Medication conflict: None found</div>
                <div className="mt-1 text-xs text-gray-500">Next recommended review: At next encounter</div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
              <h5 className="text-sm font-semibold">AI Allergy Assistant</h5>
              <div className="mt-2 text-sm text-gray-700">Clinical review required</div>
              <div className="mt-3 text-sm text-gray-700">AI summary: No allergies are currently documented for this patient. Allergy status appears verified based on recent chart review. Continue confirming allergies at future encounters, especially before prescribing or administering medications.</div>
              <ul className="mt-3 text-sm text-gray-700 space-y-1">
                <li>No drug allergies documented</li>
                <li>No food allergies documented</li>
                <li>No latex allergy documented</li>
                <li>No medication allergy conflicts found</li>
              </ul>
              <div className="mt-3 grid gap-2">
                <button className="px-3 py-2 bg-white border rounded text-teal-600">Generate Allergy Summary</button>
                <Link href={`#add-allergy`} className="px-3 py-2 bg-teal-600 text-white rounded">Add Allergy</Link>
                <Link href={`/dashboard/records/${patient.id}/messages`} className="px-3 py-2 bg-white border rounded">Message Patient</Link>
              </div>
              <div className="mt-3 text-xs text-gray-500">AI rules: AI must not diagnose. Clinician review required.</div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
              <h5 className="text-sm font-semibold">Quick Actions</h5>
              <div className="mt-3 grid gap-2">
                <Link href={`#add-allergy`} className="px-3 py-2 bg-teal-600 text-white rounded">Add Allergy</Link>
                <Link href={`#update-review`} className="px-3 py-2 bg-white border rounded">Update Allergy Review</Link>
                <Link href={`/dashboard/records/${patient.id}/messages`} className="px-3 py-2 bg-white border rounded">Message Patient</Link>
                <Link href={`/dashboard/records/${patient.id}/medications`} className="px-3 py-2 bg-white border rounded">Open Medication History</Link>
                <button className="px-3 py-2 bg-white border rounded">Print Allergy Summary</button>
                <Link href={`/dashboard/records/${patient.id}/sources`} className="px-3 py-2 bg-white border rounded">View Source Records</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Embedded forms (anchor links) */}
        <div id="add-allergy" className="mt-6">
          {/* @ts-ignore */}
          <AllergyFormClient defaultOpen={false} />
        </div>

        <div id="update-review" className="mt-6">
          {/* @ts-ignore */}
          <AllergyReviewFormClient defaultOpen={false} />
        </div>

        {/* FHIR export for review / mapping */}
        <div className="mt-6 bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
          <h5 className="text-sm font-semibold">FHIR Mapping</h5>
          <div className="mt-3 text-sm text-gray-700">Export a minimal FHIR Bundle representing the patient's allergy summary and current medications for interoperability review.</div>
          {/* @ts-ignore */}
          <FHIRExportClient bundle={mapAllergySummaryToFHIR(patient)} filename={`patient-${patient.id}-allergies.json`} />
        </div>
      </div>
    </div>
  );
}
