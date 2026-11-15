import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { fetchDashboard } from '@/cardiology/services/api.mock';
import HealthRecordsListClient from '@/app/doctor/health-records/HealthRecordsListClient';

export default async function HealthRecordsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fdoctor%2Fhealth-records');
  const role = session.user.role;
  if (role !== 'DOCTOR') redirect('/unauthorized');

  const dashboard = await fetchDashboard();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <HealthRecordsListClient initialDashboard={dashboard} />
    </div>
  );
}
