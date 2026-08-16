'use client';

import { useMemo, useState } from 'react';
import { OverviewCard, FooterLink } from './OverviewCard';
import { HistoryIcon } from './icons';

type TimelineEvent = {
  id: string;
  date: string;
  type: 'encounter' | 'note' | 'result' | 'medication' | 'document' | 'appointment';
  title: string;
  provider?: string;
  status?: string;
  description?: string;
};

const FILTERS: { key: string; label: string; types: TimelineEvent['type'][] }[] = [
  { key: 'all', label: 'All', types: [] },
  { key: 'encounters', label: 'Encounters', types: ['encounter', 'appointment'] },
  { key: 'notes', label: 'Notes', types: ['note'] },
  { key: 'results', label: 'Results', types: ['result'] },
  { key: 'medications', label: 'Medications', types: ['medication'] },
  { key: 'documents', label: 'Documents', types: ['document'] },
];

function buildEvents(patient: any): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  (patient.upcoming || []).forEach((a: any) =>
    events.push({ id: `appt-${a.id}`, date: a.date, type: 'appointment', title: a.type, provider: a.doctor, status: a.status || 'Scheduled' })
  );
  (patient.notes || []).forEach((n: any) =>
    events.push({ id: `note-${n.id}`, date: n.date, type: 'note', title: 'Progress Note', provider: n.author, description: n.snippet, status: n.status || 'Signed' })
  );
  (patient.labResults || []).forEach((l: any) =>
    events.push({ id: `lab-${l.id}`, date: l.date, type: 'result', title: l.name, description: `${l.result}${l.unit ? ' ' + l.unit : ''}`, status: l.status || 'Final' })
  );
  (patient.history || []).forEach((h: any) =>
    events.push({ id: `hist-${h.id}`, date: h.date, type: 'encounter', title: h.reason, provider: h.provider, status: h.status || 'Completed' })
  );
  (patient.medications || []).forEach((m: any, i: number) => {
    if (m.startDate) events.push({ id: `med-${i}`, date: m.startDate, type: 'medication', title: `${m.name} started`, description: `${m.dose || ''} ${m.freq || ''}`.trim(), status: 'Active' });
  });
  (patient.documents || []).forEach((d: any) =>
    events.push({ id: `doc-${d.id}`, date: d.date, type: 'document', title: d.name, status: d.status || 'Final' })
  );
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function ClinicalTimeline({ patient }: { patient: any }) {
  const [active, setActive] = useState('all');
  const events = useMemo(() => buildEvents(patient), [patient]);
  const filterDef = FILTERS.find((f) => f.key === active) || FILTERS[0];
  const filtered = filterDef.types.length ? events.filter((e) => filterDef.types.includes(e.type)) : events;
  const now = Date.now();

  return (
    <OverviewCard
      id="clinical-timeline"
      title="Clinical Timeline"
      subtitle="Recent and upcoming clinical events"
      icon={<HistoryIcon className="w-5 h-5" />}
      footer={<FooterLink href={`/dashboard/records/${patient.id}/timeline`} label="View Full Timeline" />}
      className="col-span-full"
    >
      <div role="tablist" aria-label="Filter timeline events" className="flex flex-wrap gap-2 mb-4 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={active === f.key}
            onClick={() => setActive(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
              active === f.key ? 'bg-teal-700 border-teal-700 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p role="status" className="text-sm text-gray-500 py-4">
          No timeline events match this filter.
        </p>
      ) : (
        <ol className="relative border-l-2 border-gray-100 pl-5 space-y-4 max-h-[420px] overflow-y-auto">
          {filtered.map((e) => {
            const isFuture = new Date(e.date).getTime() > now;
            return (
              <li key={e.id} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                    isFuture ? 'bg-sky-500' : ['Completed', 'Final', 'Signed'].includes(e.status || '') ? 'bg-teal-600' : 'bg-gray-400'
                  }`}
                />
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-500">
                      {new Date(e.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    {e.status && (
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isFuture ? 'bg-sky-100 text-sky-800' : 'bg-gray-200 text-gray-700'}`}>
                        {isFuture ? 'Upcoming' : e.status}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-900 mt-1">{e.title}</div>
                  {(e.provider || e.description) && (
                    <div className="text-xs text-gray-500 mt-0.5">{[e.provider, e.description].filter(Boolean).join(' • ')}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </OverviewCard>
  );
}
