import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { fetchDashboard, getAllMockUsers } from '@/cardiology/services/api.mock';
import { CardiovascularDashboard } from '@/cardiology/components/CardiovascularDashboard';
import { PageHeader } from '@/design-system';

export default async function DoctorPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  let session: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    session = await auth();
  } catch (e) {
    // ignore — auth may be unavailable in some dev setups
  }

  // Support dev override via ?asUser=USER_ID (only outside production)
  if (!session && searchParams && searchParams.asUser && process.env.NODE_ENV !== 'production') {
    const override = Array.isArray(searchParams.asUser) ? searchParams.asUser[0] : searchParams.asUser;
    const all = getAllMockUsers();
    if (override && all[override]) {
      session = { user: { id: override, name: all[override].name, role: all[override].role } };
    }
  }

  if (!session) redirect('/login');
  const role = session.user.role;
  if (role !== 'DOCTOR' && role !== 'ADMIN') redirect('/unauthorized');

  const dashboard = await fetchDashboard();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <PageHeader title="Clinician Dashboard" subtitle="Real-time patient flow and your queue." />

      <div className="mt-4">
        {/* CardiovascularDashboard is a client component that will take over realtime polling */}
        <CardiovascularDashboard
          userId={session.user.id}
          userName={session.user.name}
          // types in the cardiology component accept CardiologyRole, which maps to the same strings
          userRole={role}
          dashboard={dashboard}
        />
      </div>
    </div>
  );
}
