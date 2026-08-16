import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';

export default async function ImmunizationsPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  const immunizations = patient.immunizations || [];

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28">
      <div className="max-w-[1600px] mx-auto px-6">
        <PatientProfileHeader patient={patient} showActions={false} />

        <div className="mt-6">
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h1 className="text-xl font-semibold mb-4">Immunizations</h1>

            {immunizations.length === 0 ? (
              <p className="text-sm text-gray-500">No immunizations recorded for this patient.</p>
            ) : (
              <ul className="space-y-3">
                {immunizations.map((v: any) => (
                  <li key={v.id || v.name} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{v.name}</div>
                      <div className="text-xs text-gray-500">{v.date || 'Date unknown'}</div>
                    </div>
                    <div className="text-xs text-gray-500">{v.status || ''}</div>
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
