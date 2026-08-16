import Link from 'next/link';
import { OverviewCard, FooterLink, EmptyState } from './OverviewCard';
import { TestTubeIcon } from './icons';

const INTERPRETATION_CLASS: Record<string, string> = {
  'Within Target': 'bg-emerald-50 text-emerald-700',
  Normal: 'bg-emerald-50 text-emerald-700',
  Abnormal: 'bg-amber-50 text-amber-700',
  'Review Needed': 'bg-amber-50 text-amber-700',
  Critical: 'bg-red-50 text-red-700',
};

export function RecentResultsCard({ patient }: { patient: any }) {
  const results = patient.labResults || [];
  return (
    <OverviewCard
      id="recent-results"
      title="Recent Results"
      icon={<TestTubeIcon className="w-5 h-5" />}
      footer={<FooterLink href={`/dashboard/records/labs?patient=${patient.id}`} label="View All Results" />}
    >
      {results.length === 0 ? (
        <EmptyState message="No recent laboratory results are available." />
      ) : (
        <ul className="space-y-3">
          {results.slice(0, 4).map((l: any) => (
            <li key={l.id} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
              <Link
                href={`/dashboard/records/labs?patient=${patient.id}&selected=${l.id}`}
                className="flex items-center justify-between gap-2 group"
              >
                <span className="text-sm font-medium text-gray-900 group-hover:text-teal-700 group-hover:underline">{l.name}</span>
                {!l.reviewed && (
                  <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" aria-label="Unreviewed result" title="Unreviewed" />
                )}
              </Link>
              <div className="text-sm text-gray-700 mt-0.5">
                {l.result} {l.unit || ''}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${INTERPRETATION_CLASS[l.interpretation] || 'bg-gray-100 text-gray-700'}`}>
                  {l.interpretation || 'Normal'}
                </span>
                <span className="text-xs text-gray-400">
                  {l.status || 'Final'} • {l.date}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}
