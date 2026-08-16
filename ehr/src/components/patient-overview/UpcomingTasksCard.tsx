import { OverviewCard, FooterLink, EmptyState } from './OverviewCard';
import { ClipboardCheckIcon } from './icons';

const PRIORITY_CLASS: Record<string, string> = {
  High: 'bg-red-50 text-red-700',
  Normal: 'bg-gray-100 text-gray-700',
  Low: 'bg-gray-100 text-gray-700',
};

const STATUS_CLASS: Record<string, string> = {
  Overdue: 'bg-red-50 text-red-700',
  'In Progress': 'bg-sky-50 text-sky-700',
  Planned: 'bg-gray-100 text-gray-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-gray-100 text-gray-500',
};

export function UpcomingTasksCard({ patient }: { patient: any }) {
  const tasks =
    patient.clinicalTasks ||
    (patient.tests || []).map((t: any) => ({ id: t.id, title: t.name, dueDate: t.date, priority: 'Normal', status: t.status || 'Planned' }));

  return (
    <OverviewCard
      id="upcoming-tasks"
      title="Upcoming Tasks"
      icon={<ClipboardCheckIcon className="w-5 h-5" />}
      footer={<FooterLink href={`/dashboard/records/${patient.id}/tasks`} label="View All Tasks" />}
    >
      {tasks.length === 0 ? (
        <EmptyState message="No upcoming clinical tasks." />
      ) : (
        <ul className="space-y-2.5">
          {tasks.slice(0, 5).map((t: any) => (
            <li key={t.id} className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">{t.title}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[t.status] || 'bg-gray-100 text-gray-700'}`}>
                  {t.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Due {t.dueDate}
                {t.assignedTo ? ` • ${t.assignedTo}` : ''}
              </div>
              {t.priority && t.priority !== 'Normal' && (
                <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_CLASS[t.priority] || 'bg-gray-100 text-gray-700'}`}>
                  Priority: {t.priority}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}
