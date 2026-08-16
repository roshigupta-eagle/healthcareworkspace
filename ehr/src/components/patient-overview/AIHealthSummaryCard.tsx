import { OverviewCard, FooterLink, EmptyState } from './OverviewCard';
import { SparkleIcon } from './icons';

type SummaryItem = { label: string; title: string; detail: string; tone?: 'default' | 'amber' | 'red' };

function buildSummaryItems(patient: any): SummaryItem[] {
  const items: SummaryItem[] = [];

  const lab = patient.labResults?.[0];
  if (lab) {
    items.push({
      label: 'Latest Lab',
      title: `${lab.name} — ${lab.result}${lab.unit ? ' ' + lab.unit : ''}`,
      detail: `${lab.date} • ${lab.status || 'Final'}`,
      tone: lab.interpretation === 'Critical' ? 'red' : lab.interpretation === 'Review Needed' ? 'amber' : 'default',
    });
  }

  const appt = patient.upcoming?.[0];
  if (appt) {
    items.push({
      label: 'Next Appointment',
      title: `${appt.type} with ${appt.doctor}`,
      detail: new Date(appt.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    });
  }

  const med = patient.medications?.[0];
  if (med) {
    items.push({
      label: 'Medication Update',
      title: `${med.name}${med.dose ? ' ' + med.dose : ''} reviewed`,
      detail: med.reviewedDate || (med.refill ? `Refill ${med.refill}` : '—'),
    });
  }

  const note = patient.notes?.[0];
  if (note) {
    items.push({
      label: 'Recent Note',
      title: note.snippet,
      detail: `${note.author} • ${note.date}`,
    });
  }

  const concernRaw = patient.currentConcerns?.[0];
  if (concernRaw) {
    const concern = typeof concernRaw === 'string' ? { title: concernRaw } : concernRaw;
    items.push({
      label: 'Current Concern',
      title: concern.title,
      detail: concern.lastReviewed ? `Active • Last reviewed ${concern.lastReviewed}` : 'Active — under review',
      tone: 'amber',
    });
  }

  const careGap = patient.careGaps?.find((g: any) => g.status === 'Overdue' || g.status === 'Due Soon');
  if (careGap) {
    items.push({
      label: 'Care Gap',
      title: careGap.item,
      detail: `${careGap.status} • Due ${careGap.dueDate}`,
      tone: careGap.status === 'Overdue' ? 'red' : 'amber',
    });
  }

  return items.slice(0, 6);
}

const toneClasses: Record<string, string> = {
  default: 'border-gray-100 bg-gray-50',
  amber: 'border-amber-200 bg-amber-50',
  red: 'border-red-200 bg-red-50',
};

export function AIHealthSummaryCard({ patient }: { patient: any }) {
  const items = buildSummaryItems(patient);
  return (
    <OverviewCard
      id="ai-health-summary"
      title="AI Health Summary"
      subtitle="Important recent information from the patient chart"
      icon={<SparkleIcon className="w-5 h-5" />}
      footer={<FooterLink href={`/dashboard/records/${patient.id}/ai-clinical-summary`} label="View Full Clinical Summary" />}
    >
      {items.length === 0 ? (
        <EmptyState message="No recent summary information is available." />
      ) : (
        <ul className="space-y-2.5">
          {items.map((item, i) => (
            <li key={i} className={`rounded-lg border px-3 py-2 ${toneClasses[item.tone || 'default']}`}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{item.label}</div>
              <div className="text-sm font-medium text-gray-900 mt-0.5 line-clamp-2">{item.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{item.detail}</div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-gray-400">
        AI-generated summary for clinician review — not a confirmed diagnosis.
      </p>
    </OverviewCard>
  );
}
