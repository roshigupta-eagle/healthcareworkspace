import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { fetchDashboard } from '@/cardiology/services/api.mock';
import HealthRecordsListClient from '@/app/doctor/health-records/HealthRecordsListClient';

export default async function HealthRecordsPage({ searchParams }: { searchParams?: any }) {
  let session: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    session = await auth();
  } catch (e) {
    // ignore — auth may be unavailable in some dev setups
  }

  // Support dev override via ?asUser=USER_ID (only outside production)
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  if (!session && resolvedSearchParams && resolvedSearchParams.asUser && process.env.NODE_ENV !== 'production') {
    const override = Array.isArray(resolvedSearchParams.asUser) ? resolvedSearchParams.asUser[0] : resolvedSearchParams.asUser;
    // dev helper: set session if override provided
    if (override) session = { user: { id: override, name: override, role: override === 'user-admin-khan' ? 'ADMIN' : 'DOCTOR' } };
  }

  if (!session) redirect('/login');
  const role = session.user.role;
  if (role !== 'DOCTOR' && role !== 'ADMIN') redirect('/unauthorized');

  const dashboard = await fetchDashboard();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <HealthRecordsListClient initialDashboard={dashboard} isAdmin={role === 'ADMIN'} />
    </div>
  );
}
