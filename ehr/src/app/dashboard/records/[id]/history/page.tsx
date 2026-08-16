import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';

export default async function HistoryPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  const history = patient.history || [];

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28">
      <div className="max-w-[1600px] mx-auto px-6">
        <PatientProfileHeader patient={patient} showActions={false} />

        <div className="mt-6">
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h1 className="text-xl font-semibold mb-4">Visit History</h1>

            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No visit history recorded.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((h: any) => (
                  <li key={h.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{h.reason || 'Visit'}</div>
                      <div className="text-xs text-gray-500">{h.date} • {h.provider}</div>
                    </div>
                    <div className="text-xs text-gray-500">{h.status || ''}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
