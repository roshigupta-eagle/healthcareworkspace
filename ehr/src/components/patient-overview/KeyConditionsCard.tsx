import Link from 'next/link';
import { OverviewCard, FooterLink, EmptyState } from './OverviewCard';
import { HeartPulseIcon } from './icons';

export function KeyConditionsCard({ patient }: { patient: any }) {
  const conditions = patient.conditionDetails || (patient.conditions || []).map((c: string) => ({ name: c, status: 'Active' }));
  return (
    <OverviewCard
      id="key-conditions"
      title="Key Conditions"
      icon={<HeartPulseIcon className="w-5 h-5" />}
      footer={<FooterLink href={`/dashboard/records/${patient.id}/conditions`} label="View Condition Details" />}
    >
      {conditions.length === 0 ? (
        <EmptyState message="No active conditions are currently recorded." />
      ) : (
        <ul className="space-y-3">
          {conditions.map((c: any, i: number) => {
            const slug = encodeURIComponent(c.name.toLowerCase().replace(/\s+/g, '-'));
            return (
              <li key={i} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                <Link href={`/dashboard/records/${patient.id}/conditions/${slug}`} className="text-sm font-medium text-gray-900 hover:text-teal-700 hover:underline">
                  {c.name}
                </Link>
                <div className="text-xs text-gray-500 mt-0.5">
                  {c.status || 'Active'}
                  {c.lastReviewed ? ` • Last reviewed ${c.lastReviewed}` : ''}
                  {c.managedBy ? ` • Managed by ${c.managedBy}` : ''}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </OverviewCard>
  );
}
