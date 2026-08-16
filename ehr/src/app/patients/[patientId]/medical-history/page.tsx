import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import HistorySectionLink from '@/components/HistorySectionLink';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { mapMedicalHistoryToFHIR } from '@/lib/fhir/mappers';
import FHIRViewer from '@/components/FHIRViewer';

function formatDate(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }); } catch { return iso; }
}

export default async function MedicalHistoryPage({ params, searchParams }: { params: any; searchParams?: any }) {
  const resolvedParams = await params;
  const patientId = resolvedParams?.patientId ?? (params && params.patientId);
  let session: any = null;
  try { session = await auth(); } catch { }
  if (!session) redirect('/login');

  const patient = getPatientById(String(patientId));
  if (!patient) redirect('/dashboard/records');

  const allergiesCount = (patient.allergies || []).length;
  const immunCount = (patient.immunizations || []).length;
  const encountersCount = (patient.history || []).length;
  const documentsCount = (patient.documents || []).length;

  const edDoc = (patient.documents || []).find((d:any) => d.type && d.type.toLowerCase().includes('discharge'));

  return (
    <div className="bg-[#F6F9FB] min-h-screen py-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/records/${patient.id}`} className="text-sm text-teal-600 hover:underline">← Back to Patient</Link>
            <h1 className="text-2xl font-bold text-[#121A2D]">Medical History</h1>
            <p className="text-sm text-gray-600">A centralized view of historical clinical context for {patient.name}</p>
          </div>
        </div>

        <PatientProfileHeader patient={patient} />

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
            <div className="text-xs text-gray-500">Active allergies</div>
            <div className="mt-1 font-semibold text-[#121A2D]">{allergiesCount}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
            <div className="text-xs text-gray-500">Immunizations</div>
            <div className="mt-1 font-semibold text-[#121A2D]">{immunCount}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
            <div className="text-xs text-gray-500">Recent encounters</div>
            <div className="mt-1 font-semibold text-[#121A2D]">{encountersCount}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
            <div className="text-xs text-gray-500">Documents</div>
            <div className="mt-1 font-semibold text-[#121A2D]">{documentsCount}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
            <div className="text-xs text-gray-500">Outstanding items</div>
            <div className="mt-1 font-semibold text-[#121A2D]">{patient.outstanding?.length || 0}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
            <div className="text-xs text-gray-500">Last ED visit</div>
            <div className="mt-1 font-semibold text-[#121A2D]">{(patient.history || []).find((h:any) => h.type === 'ED') ? formatDate(((patient.history || []).find((h:any) => h.type === 'ED') as any).date) : '—'}</div>
          </div>
        </div>

        {/* Hub */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
              <h4 className="text-lg font-semibold">Medical History</h4>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <HistorySectionLink href={`/patients/${patient.id}/allergies`} title="Allergies" subtitle="See allergy and safety alerts" count={allergiesCount}>
                  {(patient.allergies || []).slice(0,3).map((a:any,i:number) => <div key={i} className="text-sm text-gray-600">{a}</div>)}
                </HistorySectionLink>

                <HistorySectionLink href={`/patients/${patient.id}/immunizations`} title="Immunizations" subtitle="Review vaccine status and history" count={immunCount}>
                  {(patient.immunizations || []).slice(0,3).map((im:any,i:number) => <div key={i} className="text-sm text-gray-600">{im}</div>)}
                </HistorySectionLink>

                <HistorySectionLink href={`/patients/${patient.id}/encounters`} title="Visit History" subtitle="View previous encounters and hospital visits" count={encountersCount}>
                  {(patient.history || []).slice(0,3).map((h:any) => <div key={h.id} className="text-sm text-gray-600">{h.date} — {h.reason}</div>)}
                </HistorySectionLink>

                <HistorySectionLink href={`/patients/${patient.id}/documents`} title="Documents" subtitle="Browse chart documents and discharge summaries" count={documentsCount}>
                  {(patient.documents || []).slice(0,3).map((d:any) => <div key={d.id} className="text-sm text-gray-600">{d.name} • {d.date}</div>)}
                </HistorySectionLink>
              </div>

              {/* ED Discharge Summary highlight */}
              {edDoc && (
                <div className="mt-6 bg-amber-50 border-l-4 border-amber-200 p-4 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">ED Discharge Summary</div>
                      <div className="text-xs text-gray-500">{edDoc.name} • {formatDate(edDoc.date)}</div>
                      <div className="text-xs text-gray-500">Status: {edDoc.status || 'Final'}</div>
                    </div>
                    <div>
                      <Link href={`/patients/${patient.id}/documents/${edDoc.id}/viewer`} className="px-3 py-2 bg-white border rounded text-sm text-teal-600">Open Summary</Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed preview area */}
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
              <h4 className="text-lg font-semibold">Preview</h4>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium">Recent allergy reactions</h5>
                  {(patient.allergyDetails || []).length ? (
                    (patient.allergyDetails || []).slice(0,3).map((a:any) => (
                      <div key={a.id} className="mt-2 text-sm text-gray-700">{a.date} — {a.reaction} • {a.severity}</div>
                    ))
                  ) : (
                    <div className="mt-2 text-sm text-gray-500">No allergy reactions recorded.</div>
                  )}
                </div>

                <div>
                  <h5 className="text-sm font-medium">Recent encounters</h5>
                  {(patient.history || []).slice(0,3).map((h:any) => (
                    <div key={h.id} className="mt-2 text-sm text-gray-700">{h.date} — {h.reason} • {h.provider}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
              <h5 className="text-sm font-semibold">FHIR Data</h5>
              <div className="mt-3 text-sm text-gray-700">FHIR R4 mapping preview for the medical history bundle.</div>
              <div className="mt-3"><FHIRViewer data={mapMedicalHistoryToFHIR(patient)} /></div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
              <h5 className="text-sm font-semibold">Quick Actions</h5>
              <div className="mt-3 grid gap-2">
                <Link href={`/patients/${patient.id}/documents`} className="px-3 py-2 bg-white border rounded text-sm">Open Document Center</Link>
                <Link href={`/patients/${patient.id}/allergies`} className="px-3 py-2 bg-white border rounded text-sm">Open Allergies</Link>
                <Link href={`/patients/${patient.id}/immunizations`} className="px-3 py-2 bg-white border rounded text-sm">Open Immunizations</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
