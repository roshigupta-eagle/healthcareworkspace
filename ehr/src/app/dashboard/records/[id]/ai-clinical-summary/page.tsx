import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import { getPatientById } from '../../mockPatients';
import { getLatestSummary } from '@/lib/aiSummaryStore';
import AISummaryActions from '@/components/ai-summary/AISummaryActions';
import PrintSummaryButton from '@/components/ai-summary/PrintSummaryButton';

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default async function AIClinicalSummaryPage({ params, searchParams }: { params: any; searchParams?: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  let session: any = null;
  try {
    session = await auth();
  } catch (e) {
    // allow dev preview
  }
  if (!session && resolvedSearchParams && resolvedSearchParams.asUser && process.env.NODE_ENV !== 'production') {
    const override = Array.isArray(resolvedSearchParams.asUser) ? resolvedSearchParams.asUser[0] : resolvedSearchParams.asUser;
    if (override) session = { user: { id: override, name: override } };
  }
  if (!session) redirect('/login');

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  const simulate = resolvedSearchParams?.simulate;
  const isLoading = simulate === 'loading';
  const isError = simulate === 'error';
  const isEmpty = simulate === 'empty';

  // Load latest summary from store (server-side)
  const latestSummary = await getLatestSummary(String(id));

  const lastAnalyzed = latestSummary?.generatedAt ? formatDateTime(latestSummary.generatedAt) : '—';
  const aiModel = latestSummary?.model ?? 'Clinical v2.1';

  let confidence = 'Unknown';
  if (latestSummary?.findings && latestSummary.findings.length > 0) {
    const cs = latestSummary.findings.map((f:any)=>f.confidence || 'Unknown');
    if (cs.every((c:any)=>c==='High')) confidence = 'High';
    else if (cs.includes('High')) confidence = 'Moderate';
    else if (cs.includes('Moderate')) confidence = 'Moderate';
    else confidence = 'Limited';
  }

  const dataSources = ((patient.labResults?.length || 0) + (patient.notes?.length || 0) + (patient.tests?.length || 0) + (patient.medications?.length || 0) + (patient.upcoming?.length || 0) + (patient.documents?.length || 0));

  const riskScore = 2.4;
  const riskText = 'Low to Moderate';
  const riskDrivers = [...(patient.conditions || [])];
  if (!(patient.tests || []).some((t: any) => /a1c|hba1c/i.test(t.name || ''))) riskDrivers.push('A1C monitoring recommended');

  // Assemble recent events for timeline
  const events: Array<any> = [];
  (patient.notes || []).forEach((n: any) => events.push({ id: n.id, date: n.date, type: 'Note', title: n.snippet || n.type || 'Clinical note', subtitle: n.author }));
  (patient.labResults || []).forEach((l: any) => events.push({ id: l.id, date: l.date, type: 'Lab', title: l.name, subtitle: `${l.result} ${l.unit || ''}` }));
  (patient.upcoming || []).forEach((a: any) => events.push({ id: a.id, date: a.date, type: 'Appointment', title: a.type, subtitle: `${a.doctor} • ${a.status || ''}` }));
  (patient.tests || []).forEach((t: any) => events.push({ id: t.id, date: t.date, type: 'Test', title: t.name, subtitle: t.status || '' }));

  events.sort((a,b) => { const da = new Date(a.date).getTime(); const db = new Date(b.date).getTime(); return db - da; });

  // If simulating states render skeletons / error / empty
  if (isLoading) {
    return (
      <div className="bg-[#F6F9FB] min-h-screen py-6">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-16 bg-white rounded p-4 mb-4" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm"><div className="h-44 bg-gray-200 rounded" /></div>
              <div className="space-y-4"><div className="h-24 bg-gray-200 rounded" /><div className="h-24 bg-gray-200 rounded" /></div>
            </div>
            <div className="mt-6 bg-white rounded p-6"><div className="h-72 bg-gray-200 rounded" /></div>
            <div className="mt-6 text-base text-gray-500">Generating AI clinical summary...</div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-[#F6F9FB] min-h-screen py-6">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="bg-amber-50 border border-amber-200 rounded p-6">
            <h2 className="text-lg font-semibold text-amber-800">Could not generate AI clinical summary</h2>
            <p className="mt-2 text-base text-amber-700">There was a problem generating the AI summary. Please try again or check the patient context.</p>
            <div className="mt-4"><Link href={`/dashboard/records/${patient.id}/ai-clinical-summary?asUser=dev`} className="px-3 py-2 bg-white border rounded">Retry</Link></div>
          </div>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="bg-[#F6F9FB] min-h-screen py-6">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded p-6 shadow-sm text-center">
            <h3 className="text-lg font-semibold">AI clinical summary not available</h3>
            <p className="mt-2 text-base text-gray-600">No source records were found to generate a summary for this patient.</p>
            <div className="mt-4"><Link href={`/dashboard/records/${patient.id}`} className="px-3 py-2 bg-teal-600 text-white rounded">Back to patient</Link></div>
          </div>
        </div>
      </div>
    );
  }

  // Render redesigned page via a modular server component
  const ClinicalSummaryLayout = (await import('@/features/clinical-summary/ClinicalSummaryLayout.server')).default;
  return (
    <ClinicalSummaryLayout
      patient={patient}
      latestSummary={latestSummary}
      events={events}
      lastAnalyzed={lastAnalyzed}
      aiModel={aiModel}
      confidence={confidence}
      dataSources={dataSources}
      riskScore={riskScore}
      riskDrivers={riskDrivers}
    />
  );
}
