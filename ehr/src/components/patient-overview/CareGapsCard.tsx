import { OverviewCard, FooterLink, EmptyState } from './OverviewCard';
import { ClipboardWarningIcon } from './icons';

const PRIORITY_CLASS: Record<string, string> = {
  High: 'bg-red-50 text-red-700',
  Medium: 'bg-amber-50 text-amber-700',
  Low: 'bg-gray-100 text-gray-700',
};

const STATUS_CLASS: Record<string, string> = {
  Overdue: 'bg-red-50 text-red-700',
  'Due Soon': 'bg-amber-50 text-amber-700',
  Planned: 'bg-gray-100 text-gray-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  Dismissed: 'bg-gray-100 text-gray-500',
};

export function CareGapsCard({ patient }: { patient: any }) {
  const gaps = patient.careGaps || [];
  return (
    <OverviewCard
      id="care-gaps"
      title="Care Gaps and Follow-up"
      icon={<ClipboardWarningIcon className="w-5 h-5" />}
      footer={<FooterLink href={`/dashboard/records/${patient.id}/care-gaps`} label="View All Care Gaps" />}
    >
      {gaps.length === 0 ? (
        <EmptyState message="No open care gaps are currently identified." />
      ) : (
        <ul className="space-y-2.5">
          {gaps.map((g: any) => (
            <li key={g.id} className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">{g.item}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[g.status] || 'bg-gray-100 text-gray-700'}`}>
                  {g.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Due {g.dueDate}
                {g.clinician ? ` • ${g.clinician}` : ''}
              </div>
              <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_CLASS[g.priority] || 'bg-gray-100 text-gray-700'}`}>
                Priority: {g.priority}
              </span>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}
