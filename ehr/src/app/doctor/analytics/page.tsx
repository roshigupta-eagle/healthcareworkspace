import { fetchDashboard } from '@/cardiology/services/api.mock';
import DoctorAnalyticsClient from './DoctorAnalyticsClient';

export default async function AnalyticsPage() {
  const dashboard = await fetchDashboard();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-neutral-900">Detailed Analytics</h1>
      <p className="text-sm text-neutral-600 mt-1">Premium analytics — full charts, case timelines, and real-time counters.</p>

      <div className="mt-6">
        <DoctorAnalyticsClient initialDashboard={dashboard} />
      </div>
    </div>
  );
}
