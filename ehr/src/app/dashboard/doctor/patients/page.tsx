import { fetchDashboard } from '@/cardiology/services/api.mock';
import DoctorPatientsClient from './DoctorPatientsClient';

export default async function PatientsPage() {
  const dashboard = await fetchDashboard();
  return (
    <div className="max-w-7xl mx-auto p-6">
      <DoctorPatientsClient initialDashboard={dashboard} />
    </div>
  );
}
