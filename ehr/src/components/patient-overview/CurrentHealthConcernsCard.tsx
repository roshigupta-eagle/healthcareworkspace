import { OverviewCard, FooterLink, EmptyState } from './OverviewCard';
import { ShieldAlertIcon } from './icons';

function normalize(concern: any) {
  if (typeof concern === 'string') return { title: concern, status: 'Active' };
  return concern;
}

export function CurrentHealthConcernsCard({ patient }: { patient: any }) {
  const concerns = (patient.currentConcerns || []).map(normalize);
  return (
    <OverviewCard
      id="current-health-concerns"
      title="Current Health Concerns"
      icon={<ShieldAlertIcon className="w-5 h-5" />}
      footer={<FooterLink href={`/dashboard/records/${patient.id}/concerns`} label="View All Concerns" />}
    >
      {concerns.length === 0 ? (
        <EmptyState message="No active health concerns are currently documented." />
      ) : (
        <ul className="space-y-3">
          {concerns.map((c: any, i: number) => (
            <li key={i} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">{c.title}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    c.status === 'Resolved' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {c.status || 'Active'}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {c.lastReviewed ? `Last reviewed ${c.lastReviewed}` : c.context || 'Reported intermittently'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}
