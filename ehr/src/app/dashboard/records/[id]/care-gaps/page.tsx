import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';

export default async function CareGapsPage({ params }: { params: any }) {
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
            <h1 className="text-xl font-semibold mb-4">Care Gaps</h1>

            <p className="text-sm text-gray-500">This view summarizes care gaps and preventive opportunities for the patient.</p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <div className="text-sm font-semibold text-amber-800">Overdue Labs</div>
                <div className="mt-2 text-lg font-bold text-amber-900">2</div>
                <div className="text-xs text-amber-800 mt-1">Including HbA1c and Lipid</div>
              </div>

              <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
                <div className="text-sm font-semibold text-teal-800">Vaccinations</div>
                <div className="mt-2 text-lg font-bold text-teal-900">0</div>
                <div className="text-xs text-teal-800 mt-1">No immediate gaps</div>
              </div>

              <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-100">
                <div className="text-sm font-semibold text-cyan-800">Follow-ups</div>
                <div className="mt-2 text-lg font-bold text-cyan-900">1</div>
                <div className="text-xs text-cyan-800 mt-1">Under review</div>
              </div>
            </div>

          </section>
        </div>
      </div>
    </div>
  );
}
