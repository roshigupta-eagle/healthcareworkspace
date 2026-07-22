import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getPatientById, getMockPatients } from '../../records/mockPatients';
import EncounterEditor from '@/components/EncounterEditor';

export default async function NewEncounterPage({ searchParams }: { searchParams?: any }) {
  let session: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    session = await auth();
  } catch (e) {
    // allow dev preview
  }
  if (!session) {
    if (process.env.NODE_ENV === 'development') {
      session = { user: { name: 'Dev User' } };
    } else {
      redirect('/login');
    }
  }

  const params = await searchParams;
  const qRaw = params?.patientId;
  const patientId = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  const patient = patientId ? getPatientById(String(patientId)) : null;
  const patients = getMockPatients();

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="mb-4">
        <Link href="/dashboard/records" className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 -ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg><span>Back to Records</span></Link>
      </div>

      {patient ? (
        <div>
          <EncounterEditor patient={patient} />
        </div>
      ) : (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">New Encounter</h1>
          <p className="mt-2 text-sm text-gray-600">Select a patient to start an encounter, or pick a recent patient.</p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((p: any) => (
              <div key={p.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{p.name}</div>
                      <div className="mt-1 text-sm text-gray-500">{p.age} yrs • {p.gender} • MRN: {p.mrn}</div>
                      <div className="mt-3 text-sm text-gray-700 flex flex-wrap gap-2">
                        {(p.conditions || []).slice(0,3).map((c: string) => (
                          <span key={c} className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs">{c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 text-right">
                      <div>Last seen</div>
                      <div className="font-medium text-gray-900 mt-1">{p.lastVisit || '—'}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Link href={`/dashboard/records/${p.id}`} className="text-sm text-gray-500 hover:underline">View record</Link>

                  <Link href={`/dashboard/encounters/new?patientId=${p.id}`} className="inline-flex items-center gap-2 rounded-md bg-teal-700 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6M9 16h6M9 8h6M5 6h14v12H5z" />
                    </svg>
                    <span>Start Encounter</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

