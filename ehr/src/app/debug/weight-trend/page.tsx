import WeightTrendClient from '@/components/WeightTrendClient';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

export default function DebugWeightTrendPage() {
  const patient = getPatientById('patient-001');
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h2 className="text-2xl font-semibold mb-4">Debug: Weight Trend (unauthenticated)</h2>
      <WeightTrendClient patient={patient} />
    </div>
  );
}
