import { OverviewCard, FooterLink, EmptyState } from './OverviewCard';
import { UsersIcon } from './icons';

export function CareTeamCard({ patient }: { patient: any }) {
  const team = patient.careTeam || (patient.lastAttendingDoctor ? [{ id: 'primary', name: patient.lastAttendingDoctor, role: 'Primary Physician' }] : []);
  return (
    <OverviewCard
      id="care-team"
      title="Care Team"
      icon={<UsersIcon className="w-5 h-5" />}
      footer={<FooterLink href={`/dashboard/records/${patient.id}/care-team`} label="View Care Team" />}
    >
      {team.length === 0 ? (
        <EmptyState message="No care team members are currently recorded." />
      ) : (
        <ul className="space-y-3">
          {team.map((m: any) => (
            <li key={m.id} className="flex items-center gap-3">
              <span className="flex-shrink-0 w-9 h-9 rounded-full bg-teal-100 text-teal-800 text-xs font-semibold flex items-center justify-center">
                {(m.initials || m.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2)).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{m.name}</div>
                <div className="text-xs text-gray-500 truncate">{[m.specialty, m.role].filter(Boolean).join(' • ')}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}
