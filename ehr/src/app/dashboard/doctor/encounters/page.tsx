import { fetchDashboard } from '@/cardiology/services/api.mock';
import DoctorEncountersClient from './DoctorEncountersClient';

export default async function EncountersPage() {
  const dashboard = await fetchDashboard();
  return (
    <div className="max-w-7xl mx-auto p-6">
      <DoctorEncountersClient initialDashboard={dashboard} />
    </div>
  );
}
