import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import RiskScoreCard from '@/components/RiskScoreCard';
import RiskTrendChart from '@/components/RiskTrendChart';
import RiskFactorsCard from '@/components/RiskFactorsCard';
import RecommendationsCard from '@/components/RecommendationsCard';
import FHIRRiskExportClient from '@/components/FHIRRiskExportClient';
import { mapRiskProfileToFHIR } from '@/lib/fhir/mappers';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

function formatDate(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }); } catch { return iso; }
}

export default async function RiskProfilePage({ params, searchParams }: { params: any; searchParams?: any }) {
  const resolvedParams = await params;
  const patientId = resolvedParams?.patientId ?? (params && params.patientId);
  let session: any = null;
  try { session = await auth(); } catch { }
  if (!session) redirect('/login');

  const patient = getPatientById(String(patientId));
  if (!patient) redirect('/dashboard/records');

  // Example risk profile calculation (demo)
  const riskProfile = {
    score: 85,
    category: 'High Clinical Risk',
    contributors: [
      { factor: 'Type 2 Diabetes', weight: 24, impact: 'High' },
      { factor: 'Hypertension', weight: 18, impact: 'High' },
      { factor: 'CKD Stage III', weight: 15, impact: 'High' },
      { factor: 'Polypharmacy', weight: 12, impact: 'Moderate' },
      { factor: 'Recent ED Visits', weight: 9, impact: 'Moderate' },
    ],
    generatedAt: new Date().toISOString(),
    engineVersion: 'v3.2',
  };

  return (
    <div className="bg-[#F6F9FB] min-h-screen py-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/records/${patient.id}`} className="text-sm text-teal-600 hover:underline">← Back to Patient</Link>
            <h1 className="text-2xl font-bold text-[#121A2D]">Clinical Risk Profile</h1>
            <p className="text-sm text-gray-600">Comprehensive assessment of patient risk factors, predictive analytics, utilization trends, chronic disease burden, and recommended interventions.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 bg-white border rounded text-sm">Refresh Risk Assessment</button>
            <button className="px-3 py-2 bg-white border rounded text-sm">Export PDF</button>
            <button className="px-3 py-2 bg-white border rounded text-sm">FHIR JSON</button>
            <button className="px-3 py-2 bg-white border rounded text-sm">Print</button>
            <button className="px-3 py-2 bg-white border rounded text-sm">Audit History</button>
          </div>
        </div>

        <PatientProfileHeader patient={patient} />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-6 lg:col-span-1">
            <RiskScoreCard patient={patient} riskProfile={riskProfile} />
            <RiskFactorsCard contributors={riskProfile.contributors} patient={patient} />
            <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
              <h5 className="text-sm font-semibold">Chronic Conditions</h5>
              <div className="mt-3 text-sm text-gray-700">
                {(patient.conditions || []).map((c:any) => (
                  <div key={c} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium">{c}</div>
                      <div className="text-xs text-gray-500">SNOMED / ICD10</div>
                    </div>
                    <Link href={`/dashboard/conditions/${encodeURIComponent(c)}`} className="text-sm text-teal-600">Open</Link>
                  </div>
                ))}
                {(patient.conditions || []).length === 0 && <div className="text-sm text-gray-500">No chronic conditions recorded.</div>}
              </div>
            </div>
          </div>

          {/* CENTER COLUMN */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
              <h4 className="text-lg font-semibold">Risk Trend</h4>
              <div className="mt-4">
                <RiskTrendChart score={riskProfile.score} history={[78, 80, 76, 79, 81, 85]} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
              <h4 className="text-lg font-semibold">Predictive Risk Analytics</h4>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-[#F8FAFC] p-3 rounded">
                  <div className="text-xs text-gray-500">30-day readmission</div>
                  <div className="font-semibold text-[#0B5FFF]">42%</div>
                </div>
                <div className="bg-[#F8FAFC] p-3 rounded">
                  <div className="text-xs text-gray-500">Emergency Visit</div>
                  <div className="font-semibold text-[#0B5FFF]">31%</div>
                </div>
                <div className="bg-[#F8FAFC] p-3 rounded">
                  <div className="text-xs text-gray-500">Hospitalization</div>
                  <div className="font-semibold text-[#0B5FFF]">28%</div>
                </div>
                <div className="bg-[#F8FAFC] p-3 rounded">
                  <div className="text-xs text-gray-500">Sepsis</div>
                  <div className="font-semibold text-[#0B5FFF]">11%</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6 lg:col-span-1">
            <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
              <h5 className="text-sm font-semibold">Active Risk Factors</h5>
              <div className="mt-3 text-sm text-gray-700 space-y-2">
                <div className="flex items-center justify-between"><div>Multiple Chronic Diseases</div><div className="text-sm text-red-700 font-semibold">High</div></div>
                <div className="flex items-center justify-between"><div>Food Insecurity</div><div className="text-sm text-amber-700 font-semibold">Medium</div></div>
                <div className="flex items-center justify-between"><div>Medication Complexity</div><div className="text-sm text-red-700 font-semibold">High</div></div>
              </div>
            </div>

            <RecommendationsCard patient={patient} />

            <div className="bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
              <h5 className="text-sm font-semibold">Care Gaps</h5>
              <div className="mt-3 text-sm text-gray-700">
                <div className="flex items-center justify-between py-2 border-b"><div>HbA1c</div><div className="text-xs text-amber-700">Overdue</div></div>
                <div className="flex items-center justify-between py-2 border-b"><div>Eye Exam</div><div className="text-xs text-amber-700">Due Soon</div></div>
              </div>
            </div>
          </div>
        </div>

        {/* FHIR export / viewer */}
        <div className="mt-6 bg-white rounded-lg p-4 border border-[#DDE7F0] shadow-sm">
          <h5 className="text-sm font-semibold">FHIR Mapping</h5>
          <div className="mt-3 text-sm text-gray-700">Export a minimal FHIR Bundle representing the patient's risk profile for interoperability review.</div>
          {/* @ts-ignore */}
          <FHIRRiskExportClient bundle={mapRiskProfileToFHIR(patient, riskProfile)} filename={`patient-${patient.id}-risk.json`} />
        </div>
      </div>
    </div>
  );
}
