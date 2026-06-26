import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { fetchVisitDetail } from '@/cardiology/services/api.mock';
import Link from 'next/link';

export default async function VisitDetailPage({ params }: { params: { visitId: string } }) {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;
  if (role !== 'DOCTOR' && role !== 'ADMIN') redirect('/unauthorized');

  // `params` may be a Promise in Next.js; unwrap before destructuring
  const { visitId } = await params;
  const visit = await fetchVisitDetail(visitId);
  if (!visit) return notFound();

  return (
    <main className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sky-600">Encounter: {visit.patientName || visit.patientId}</h1>
          <p className="text-sm text-gray-600">MRN: {visit.mrn || '—'} • Priority: {visit.priority || '—'}</p>
        </div>
        <div className="space-x-2">
          <Link href="/dashboard/encounters" className="text-sm text-sky-600 hover:underline">Back to list</Link>
        </div>
      </div>

      <section className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold">Visit details</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Arrived</p>
            <p className="font-medium">{visit.arrivedAt ? new Date(visit.arrivedAt).toLocaleString() : '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Current state</p>
            <p className="font-medium">{visit.currentState || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Chief complaint</p>
            <p className="font-medium">{visit.chiefComplaint || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Assigned physician</p>
            <p className="font-medium">{visit.assignedPhysicianName || '—'}</p>
          </div>
        </div>
      </section>

      {visit.vitals && (
        <section className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-md font-semibold">Latest vitals</h3>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">BP</p>
              <p className="font-medium">{visit.vitals.bpSystolic}/{visit.vitals.bpDiastolic} mmHg</p>
            </div>
            <div>
              <p className="text-gray-500">HR</p>
              <p className="font-medium">{visit.vitals.heartRateBpm} bpm</p>
            </div>
            <div>
              <p className="text-gray-500">SpO2</p>
              <p className="font-medium">{visit.vitals.oxygenSaturationPercent}%</p>
            </div>
            <div>
              <p className="text-gray-500">Temp</p>
              <p className="font-medium">{visit.vitals.temperatureC} °C</p>
            </div>
          </div>
        </section>
      )}

      {visit.notes && (
        <section className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-md font-semibold">Notes</h3>
          <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{visit.notes}</p>
        </section>
      )}
    </main>
  );
}
