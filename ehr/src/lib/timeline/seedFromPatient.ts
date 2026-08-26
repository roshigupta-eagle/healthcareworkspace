import type { ClinicalTimelineEvent } from '@/types/clinicalTimeline';
import type { Patient } from '@/app/dashboard/records/mockPatients';

/**
 * Derives baseline timeline events (appointments, encounters, results, medication
 * orders, referrals, procedures, notes) from a patient's mock chart record.
 * These are merged with persisted events (see `timelineStore`) so that actions
 * like scheduling or completing an appointment appear alongside the seeded history.
 */
export function buildSeedEvents(patientId: string, patient: Patient): ClinicalTimelineEvent[] {
  const events: ClinicalTimelineEvent[] = [];
  if (!patient) return events;

  (patient.upcoming || []).forEach((a) => {
    events.push({
      id: a.id,
      patientId,
      resourceType: 'Appointment',
      resourceId: a.id,
      eventType: 'appointment',
      title: `${a.type || 'Appointment'} with ${a.doctor || 'provider'}`,
      summary: [a.location, a.room ? `Room ${a.room}` : null, a.prep].filter(Boolean).join(' · ') || undefined,
      status: a.status || 'Scheduled',
      occurredAt: a.date,
      provider: a.doctor ? { name: a.doctor } : null,
      source: { system: 'EHR', display: 'Scheduling' },
      recordHref: `/dashboard/records/${patientId}/appointments/${encodeURIComponent(a.id)}`,
    });
  });

  (patient.history || []).forEach((h) => {
    events.push({
      id: h.id,
      patientId,
      resourceType: 'Encounter',
      resourceId: h.id,
      eventType: 'encounter',
      title: h.reason || 'Encounter',
      summary: h.provider ? `Seen by ${h.provider}` : undefined,
      status: h.status || 'Completed',
      occurredAt: h.date,
      provider: h.provider ? { name: h.provider } : null,
      source: { system: 'EHR', display: 'Encounters' },
      recordHref: `/dashboard/records/${patientId}/history?visit=${encodeURIComponent(h.id)}`,
    });
  });

  (patient.labResults || []).forEach((l) => {
    events.push({
      id: l.id,
      patientId,
      resourceType: 'Observation',
      resourceId: l.id,
      eventType: 'result',
      title: l.name || 'Lab Result',
      summary: [l.result ? `${l.result}${l.unit ? ' ' + l.unit : ''}` : null, l.normalRange ? `Normal range: ${l.normalRange}` : null, l.interpretation]
        .filter(Boolean)
        .join(' · ') || undefined,
      status: l.status || 'Final',
      occurredAt: l.date,
      severity: /abnormal|critical/i.test(l.interpretation || '') ? 'abnormal' : 'normal',
      source: { system: 'EHR', display: 'Lab Results' },
      recordHref: `/dashboard/records/${patientId}/labs/${l.id}`,
    });
  });

  (patient.medications || []).forEach((m, idx: number) => {
    const id = `med-${idx}-${(m.name || 'medication').toLowerCase().replace(/\s+/g, '-')}`;
    events.push({
      id,
      patientId,
      resourceType: 'MedicationRequest',
      resourceId: id,
      eventType: 'medication',
      title: `${m.name || 'Medication'}${m.dose ? ' ' + m.dose : ''}`,
      summary: [m.freq, m.route, m.indication].filter(Boolean).join(' · ') || undefined,
      status: m.status || 'Active',
      occurredAt: m.startDate,
      provider: m.prescriber ? { name: m.prescriber } : null,
      source: { system: 'EHR', display: 'Medications' },
      recordHref: `/dashboard/records/${patientId}/medications`,
    });
  });

  (patient.notes || []).forEach((n) => {
    events.push({
      id: n.id,
      patientId,
      resourceType: 'DocumentReference',
      resourceId: n.id,
      eventType: 'note',
      title: 'Clinical note',
      summary: n.snippet,
      status: n.status || 'Signed',
      occurredAt: n.date,
      provider: n.author ? { name: n.author } : null,
      source: { system: 'EHR', display: 'Notes' },
      recordHref: `/dashboard/records/${patientId}/doctor-notes?noteId=${encodeURIComponent(n.id)}`,
    });
  });

  (patient.tests || []).forEach((t) => {
    events.push({
      id: t.id,
      patientId,
      resourceType: 'ServiceRequest',
      resourceId: t.id,
      eventType: 'procedure',
      title: t.name || 'Procedure',
      summary: t.status ? `Status: ${t.status}` : undefined,
      status: t.status || 'Ordered',
      occurredAt: t.date,
      source: { system: 'EHR', display: 'Procedures & Tests' },
      recordHref: `/dashboard/records/${patientId}/upcoming-tests/${t.id}`,
    });
  });

  (patient.documents || []).forEach((d) => {
    const isReferral = /referral/i.test(d.name || '') || /referral/i.test(d.type || '');
    events.push({
      id: d.id,
      patientId,
      resourceType: 'DocumentReference',
      resourceId: d.id,
      eventType: isReferral ? 'referral' : 'document',
      title: d.name || (isReferral ? 'Referral' : 'Document'),
      summary: d.author ? `Prepared by ${d.author}` : undefined,
      status: d.status || 'Final',
      occurredAt: d.date,
      provider: d.author ? { name: d.author } : null,
      source: { system: 'EHR', display: 'Documents' },
      recordHref: `/dashboard/records/${patientId}/documents?documentId=${encodeURIComponent(d.id)}`,
    });
  });

  return events;
}
