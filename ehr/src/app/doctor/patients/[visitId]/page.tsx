import PatientDetailClient from '@/app/doctor/patients/PatientDetailClient';
import { fetchVisitDetail, fetchDashboard } from '@/cardiology/services/api.mock';

export default async function PatientPage({ params }: { params: { visitId: string } }) {
  const { visitId } = params;
  const visit = await fetchVisitDetail(visitId);
  if (!visit) return <div className="p-6">Patient visit not found.</div>;
  const dashboard = await fetchDashboard();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PatientDetailClient initialVisit={visit} initialDashboard={dashboard} />
    </div>
  );
}
