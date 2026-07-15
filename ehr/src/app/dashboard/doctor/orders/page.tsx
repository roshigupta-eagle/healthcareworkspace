import { fetchDashboard } from '@/cardiology/services/api.mock';
import DoctorOrdersClient from './DoctorOrdersClient';

export default async function OrdersPage() {
  const dashboard = await fetchDashboard();
  return (
    <div className="max-w-7xl mx-auto p-6">
      <DoctorOrdersClient initialDashboard={dashboard} />
    </div>
  );
}
