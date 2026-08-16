import type { ReactNode } from 'react';
import Link from 'next/link';
import { ShieldAlertIcon, SyringeIcon, CalendarIcon, FileIcon } from './icons';

function MiniCard({
  icon,
  title,
  primary,
  secondary,
  href,
  label,
}: {
  icon: ReactNode;
  title: string;
  primary: string;
  secondary?: string;
  href: string;
  label: string;
}) {
  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg border border-gray-100 p-4">
      <div className="flex items-center gap-2 text-gray-700">
        <span aria-hidden="true">{icon}</span>
        <span className="text-sm font-semibold text-gray-900">{title}</span>
      </div>
      <div className="mt-2 text-sm text-gray-800 flex-1">{primary}</div>
      {secondary && <div className="text-xs text-gray-500 mt-1">{secondary}</div>}
      <Link href={href} className="mt-3 text-sm font-medium text-teal-700 hover:underline">
        {label}
      </Link>
    </div>
  );
}

export function MedicalHistorySection({ patient }: { patient: any }) {
  const allergies: string[] = patient.allergies || [];
  const immunizations = patient.immunizations || [];
  const lastVisit = patient.history?.[0];
  const doc = patient.documents?.[0];

  return (
    <section aria-labelledby="medical-history-heading" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
      <h2 id="medical-history-heading" className="text-lg font-semibold text-gray-900 mb-4">
        Medical History
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniCard
          icon={<ShieldAlertIcon className="w-4 h-4" />}
          title="Allergies"
          primary={allergies.length ? allergies.join(', ') : 'No known allergies'}
          secondary={patient.allergyReviewedDate ? `Last reviewed ${patient.allergyReviewedDate}` : undefined}
          href={`/dashboard/records/${patient.id}/allergies`}
          label="View Allergies →"
        />
        <MiniCard
          icon={<SyringeIcon className="w-4 h-4" />}
          title="Immunizations"
          primary={immunizations.length ? immunizations.map((i: any) => i.name).join(', ') : 'No immunizations recorded'}
          secondary={immunizations[0]?.nextReview ? `Next review ${immunizations[0].nextReview}` : undefined}
          href={`/dashboard/records/${patient.id}/immunizations`}
          label="View Immunizations →"
        />
        <MiniCard
          icon={<CalendarIcon className="w-4 h-4" />}
          title="Visit History"
          primary={lastVisit ? lastVisit.reason : 'No visit history recorded'}
          secondary={lastVisit ? `${lastVisit.date} • ${lastVisit.provider} • ${lastVisit.status || 'Completed'}` : undefined}
          href={`/dashboard/records/${patient.id}/history`}
          label="View Visit History →"
        />
        <MiniCard
          icon={<FileIcon className="w-4 h-4" />}
          title="Documents"
          primary={doc ? doc.name : 'No documents available'}
          secondary={doc ? `${doc.date} • ${doc.status || 'Final'}` : undefined}
          href={`/dashboard/records/${patient.id}/documents`}
          label="View Documents →"
        />
      </div>
    </section>
  );
}
