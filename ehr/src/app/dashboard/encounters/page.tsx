import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { mockVisits } from '@/cardiology/services/api.mock';
import EncounterCard from '@/components/EncounterCard';

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

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visits.map((enc: any) => (
          <EncounterCard key={enc.id} encounter={enc} />
        ))}
      </div>
    </div>
  );
}
