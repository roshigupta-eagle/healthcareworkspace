import { OverviewCard, FooterLink, EmptyState } from './OverviewCard';
import { FileTextIcon } from './icons';

export function RecentClinicalNotesCard({ patient }: { patient: any }) {
  const notes = patient.notes || [];
  return (
    <OverviewCard
      id="recent-clinical-notes"
      title="Recent Clinical Notes"
      icon={<FileTextIcon className="w-5 h-5" />}
      footer={<FooterLink href={`/dashboard/records/${patient.id}/doctor-notes`} label="View All Notes" />}
    >
      {notes.length === 0 ? (
        <EmptyState message="No recent clinical notes are available." />
      ) : (
        <ul className="space-y-3">
          {notes.slice(0, 3).map((n: any) => (
            <li key={n.id} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
              <div className="text-sm font-medium text-gray-900">
                {n.author} <span className="text-xs font-normal text-gray-500">• {n.date}</span>
              </div>
              <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.snippet}</div>
              <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">{n.status || 'Signed'}</span>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}
