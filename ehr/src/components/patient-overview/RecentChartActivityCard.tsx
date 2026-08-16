import { OverviewCard, FooterLink, EmptyState } from './OverviewCard';
import { ActivityIcon } from './icons';

export function RecentChartActivityCard({ patient }: { patient: any }) {
  const activity = patient.chartActivity || [];
  return (
    <OverviewCard
      id="recent-chart-activity"
      title="Recent Chart Activity"
      icon={<ActivityIcon className="w-5 h-5 text-gray-400" />}
      footer={<FooterLink href={`/dashboard/records/${patient.id}/activity`} label="View All Activity" />}
    >
      {activity.length === 0 ? (
        <EmptyState message="No recent chart activity is available." />
      ) : (
        <ul className="space-y-2.5 text-sm text-gray-600">
          {activity.slice(0, 5).map((a: any) => (
            <li key={a.id} className="flex items-start justify-between gap-2 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
              <div className="min-w-0">
                <div className="text-gray-700">{a.action}</div>
                <div className="text-xs text-gray-400">
                  {a.user}
                  {a.resourceType ? ` • ${a.resourceType}` : ''}
                </div>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{a.date}</span>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}
