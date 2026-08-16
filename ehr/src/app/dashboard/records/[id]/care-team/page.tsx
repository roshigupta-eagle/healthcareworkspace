import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';

export default async function CareTeamPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28">
      <div className="max-w-[1600px] mx-auto px-6">
        <PatientProfileHeader patient={patient} showActions={false} />

        <div className="mt-6">
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h1 className="text-xl font-semibold mb-4">Care Team</h1>

            {patient.careTeam && patient.careTeam.length > 0 ? (
              <ul className="space-y-3">
                {patient.careTeam.map((m: any) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold flex items-center justify-center">
                      {(m.initials || (m.name || '').split(' ').map((p: string) => p[0]).join('').slice(0, 2)).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{m.name}</div>
                      <div className="text-xs text-gray-500">{[m.specialty, m.role].filter(Boolean).join(' • ')}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No care team members are currently recorded for this patient.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
