import { OverviewCard, FooterLink, EmptyState } from './OverviewCard';
import { PillIcon } from './icons';

export function CurrentMedicationsCard({ patient }: { patient: any }) {
  const medications = patient.medications || [];
  return (
    <OverviewCard
      id="current-medications"
      title="Current Medications"
      icon={<PillIcon className="w-5 h-5" />}
      footer={<FooterLink href={`/dashboard/records/${patient.id}/medications`} label="View Medication History" />}
      className="col-span-full"
    >
      {medications.length === 0 ? (
        <EmptyState message="No active medications are currently recorded." />
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th scope="col" className="py-2 px-1 font-medium">Medication</th>
                <th scope="col" className="py-2 px-1 font-medium">Dose</th>
                <th scope="col" className="py-2 px-1 font-medium">Frequency</th>
                <th scope="col" className="py-2 px-1 font-medium">Route</th>
                <th scope="col" className="py-2 px-1 font-medium">Prescriber</th>
                <th scope="col" className="py-2 px-1 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((m: any, i: number) => (
                <tr key={`${m.name}-${i}`} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 px-1 font-medium text-gray-900">{m.name}</td>
                  <td className="py-2 px-1 text-gray-700">{m.dose || '—'}</td>
                  <td className="py-2 px-1 text-gray-700">{m.freq || '—'}</td>
                  <td className="py-2 px-1 text-gray-700">{m.route || 'Oral'}</td>
                  <td className="py-2 px-1 text-gray-700">{m.prescriber || patient.lastAttendingDoctor || '—'}</td>
                  <td className="py-2 px-1">
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700">{m.status || 'Active'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OverviewCard>
  );
}
