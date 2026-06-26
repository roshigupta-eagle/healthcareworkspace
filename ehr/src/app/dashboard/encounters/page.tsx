import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { mockVisits } from '@/cardiology/services/api.mock';

export default async function EncountersPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const role = session.user.role;
  if (role !== 'DOCTOR' && role !== 'ADMIN') redirect('/unauthorized');

  // Use in-memory mock visits directly on the server to avoid relative fetch parsing issues
  const visits = Array.isArray(mockVisits) ? mockVisits : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sky-600">Encounters</h1>
          <p className="mt-1 text-sm text-gray-600">Recent clinical encounters and visit notes.</p>
        </div>
        <div>
          <Link href="/dashboard/encounters/new" className="inline-flex items-center gap-2 rounded-md bg-sky-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-sky-500">New Encounter</Link>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {visits.map((enc: any) => (
          <div key={enc.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{enc.arrivedAt ? new Date(enc.arrivedAt).toLocaleString() : ''} • {enc.chiefComplaint || ''}</p>
              <p className="mt-1 font-medium text-gray-900">{enc.patientName || enc.patient || 'Unknown'}</p>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${enc.currentState === 'DISCHARGED' || enc.currentState === 'CLOSED' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-800'}`}>
                {enc.currentState || enc.status || 'Open'}
              </span>
              <div className="mt-3">
                <Link href={`/dashboard/encounters/${enc.id}`} className="text-sky-600 hover:underline text-sm">View</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
