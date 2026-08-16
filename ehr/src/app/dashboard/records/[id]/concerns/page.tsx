import { redirect } from 'next/navigation';
import { getPatientById } from '../../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';

function normalize(concern: any) {
  if (typeof concern === 'string') return { title: concern, status: 'Active' };
  return concern;
}

export default async function ConcernsPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  const concerns = (patient.currentConcerns || []).map(normalize);

  return (
    <div className="min-h-screen bg-[#F6F9FB] py-8 pb-28">
      <div className="max-w-[1600px] mx-auto px-6">
        <PatientProfileHeader patient={patient} showActions={false} />

        <div className="mt-6">
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h1 className="text-xl font-semibold mb-4">Health Concerns</h1>

            {concerns.length === 0 ? (
              <p className="text-sm text-gray-500">No active health concerns are documented.</p>
            ) : (
              <ul className="space-y-3">
                {concerns.map((c: any, i: number) => (
                  <li key={i} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900">{c.title}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${c.status === 'Resolved' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-800'}`}>{c.status || 'Active'}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{c.lastReviewed ? `Last reviewed ${c.lastReviewed}` : c.context || 'Reported intermittently'}</div>
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
