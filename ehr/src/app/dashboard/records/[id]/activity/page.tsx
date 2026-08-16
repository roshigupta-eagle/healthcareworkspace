import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';

export default async function ActivityPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  const activity = patient.chartActivity || [];

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28">
      <div className="max-w-[1600px] mx-auto px-6">
        <PatientProfileHeader patient={patient} showActions={false} />

        <div className="mt-6">
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h1 className="text-xl font-semibold mb-4">Chart Activity</h1>

            {activity.length === 0 ? (
              <p className="text-sm text-gray-500">No recent chart activity recorded.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((a: any) => (
                  <li key={a.id} className="text-sm">
                    <div className="font-medium text-gray-900">{a.action}</div>
                    <div className="text-xs text-gray-500">{a.user} • {a.date} {a.resourceType ? `• ${a.resourceType}` : ''}</div>
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
