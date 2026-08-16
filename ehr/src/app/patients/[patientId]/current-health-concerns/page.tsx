import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import ConcernSummaryCard from '@/components/ConcernSummaryCard';
import ConcernList from '@/components/ConcernList';
import ConcernTrendChart from '@/components/ConcernTrendChart';
import RelatedConditionsCard from '@/components/RelatedConditionsCard';
import RecentAssessmentsCard from '@/components/RecentAssessmentsCard';
import CarePlanGoalsCard from '@/components/CarePlanGoalsCard';
import FhirResourceSummary from '@/components/FhirResourceSummary';
import ConcernTimeline from '@/components/ConcernTimeline';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { mapCurrentConcernsToFHIR } from '@/lib/fhir/mappers';

function formatDate(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }); } catch { return iso; }
}

export default async function CurrentHealthConcernsPage({ params }: { params: any }) {
  const patientId = params?.patientId ?? (params && params.patientId);
  let session: any = null;
  try { session = await auth(); } catch { }
  if (!session) redirect('/login');

  const patient = getPatientById(String(patientId));
  if (!patient) redirect('/dashboard/records');

  const concerns = (patient.currentConcerns || []).map((c: any, i: number) => ({ id: `concern-${i}`, name: typeof c === 'string' ? c : c.name, status: c.status || 'active', firstNoted: c.firstNoted || null, lastUpdated: c.lastUpdated || null, severity: c.severity || null, source: c.source || null, context: c.context || null }));

  const fhirBundle = mapCurrentConcernsToFHIR(patient, concerns);

  return (
    <div className="bg-[#F6F9FB] min-h-screen py-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/records/${patient.id}`} className="text-sm text-teal-600 hover:underline">← Back to Patient</Link>
            <h1 className="text-2xl font-bold text-[#121A2D]">Current Health Concerns</h1>
            <p className="text-sm text-gray-600">Active health concerns identified from the chart, observations, and patient-reported problems.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 bg-white border rounded text-sm">Export PDF</button>
            <button className="px-3 py-2 bg-white border rounded text-sm">FHIR JSON</button>
            <button className="px-3 py-2 bg-white border rounded text-sm">Print</button>
            <button className="px-3 py-2 bg-white border rounded text-sm">Refresh</button>
            <button className="px-3 py-2 bg-white border rounded text-sm">Audit History</button>
          </div>
        </div>

        <PatientProfileHeader patient={patient} />

        {/* Summary metrics */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <ConcernSummaryCard title="Active concerns" value={(concerns || []).length} />
          <ConcernSummaryCard title="First noted" value={concerns[0]?.firstNoted ? formatDate(concerns[0].firstNoted) : '—'} />
          <ConcernSummaryCard title="Last reviewed" value={formatDate(patient.notes?.[0]?.date)} />
          <ConcernSummaryCard title="Latest BP" value={patient.labResults?.find((l: any) => l.name.toLowerCase().includes('blood pressure'))?.result || '—'} />
          <ConcernSummaryCard title="Data sources" value={(patient.documents || []).length + (patient.labResults || []).length} />
          <ConcernSummaryCard title="Related conditions" value={(patient.conditions || []).length} />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
              <h4 className="text-lg font-semibold">Your Current Health Concerns</h4>
              <div className="mt-4">
                <ConcernList patientId={patient.id} concerns={concerns} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
              <h4 className="text-lg font-semibold">Vitals & Trends</h4>
              <div className="mt-4">
                <ConcernTrendChart patientId={patient.id} concerns={concerns} history={(patient.labResults || []).slice(0,8).map((l:any)=> Number(l.result) || 0)} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
              <h4 className="text-lg font-semibold">Concern Timeline</h4>
              <div className="mt-4"><ConcernTimeline events={[...(patient.notes||[]), ...(patient.history||[])]} /></div>
            </div>
          </div>

          <div className="space-y-6">
            <RelatedConditionsCard conditions={patient.conditions || []} patientId={patient.id} />
            <RecentAssessmentsCard patient={patient} />
            <CarePlanGoalsCard goals={patient.goals || []} />
            <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
              <h5 className="text-sm font-semibold">FHIR Summary</h5>
              <div className="mt-3"><FhirResourceSummary bundle={fhirBundle} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
