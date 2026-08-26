import { describe, expect, it } from 'vitest';
import { activityFromDocument, buildChartActivity } from '../lib/chartActivity';
import type { Patient } from '../app/dashboard/records/mockPatients';

const patient: Patient = {
  id: 'patient-test',
  name: 'Test Patient',
  dob: '1980-01-01',
  mrn: 'MRN-1',
  chartActivity: [
    { id: 'a-note', action: 'Updated the progress note.', user: 'Dr. Chen', date: '2026-06-05', resourceType: 'Note', sourceRecordId: 'note-1', sourceRecordDisplay: 'Progress note' },
    { id: 'a-result', action: 'Lipid panel result was reviewed.', user: 'Dr. Lee', date: '2026-06-01', resourceType: 'Result', sourceRecordId: 'result-1', sourceRecordDisplay: 'Lipid panel' },
    { id: 'a-appointment', action: 'Follow-up appointment was scheduled.', user: 'Front Desk', date: '2026-05-28', resourceType: 'Appointment', sourceRecordId: 'appointment-1' },
  ],
  history: [{ id: 'visit-1', date: '2026-05-15', provider: 'Dr. Lee', reason: 'Follow-up', status: 'Completed' }],
};

describe('buildChartActivity', () => {
  it('preserves real activity, calculates module counts, and resolves source links', () => {
    const model = buildChartActivity(patient.id, patient);

    expect(model.allItems).toHaveLength(3);
    expect(model.summary.documentChanges).toBe(0);
    expect(model.summary.latestActivity?.id).toBe('a-note');
    expect(model.allItems.find((event) => event.id === 'a-note')?.recordHref).toContain('/doctor-notes?noteId=note-1');
    expect(model.allItems.find((event) => event.id === 'a-result')?.recordHref).toContain('/labs/result-1');
    expect(model.filterOptions.actors).toEqual(['Dr. Chen', 'Dr. Lee', 'Front Desk']);
  });

  it('supports category, actor, date range, and since-last-visit filters', () => {
    expect(buildChartActivity(patient.id, patient, [], { category: 'note' }).items).toHaveLength(1);
    expect(buildChartActivity(patient.id, patient, [], { actor: 'Front Desk' }).items).toHaveLength(1);
    expect(buildChartActivity(patient.id, patient, [], { sinceLastVisit: true }).items).toHaveLength(3);
  });
});

describe('activityFromDocument', () => {
  it('creates a source-linked, idempotency-keyed document event', () => {
    const event = activityFromDocument('patient-test', { id: 'doc-1', title: 'Discharge Summary', type: 'Discharge Summary', source: 'imported', status: 'needs-review', uploadedAt: '2026-08-18', organization: 'External Hospital' }, 'Document uploaded', 'Clinician', true);

    expect(event.category).toBe('document');
    expect(event.sourceRecord?.id).toBe('doc-1');
    expect(event.recordHref).toContain('documents?documentId=doc-1');
    expect(event.isActionable).toBe(true);
    expect(event.correlationKey).toBe('document:doc-1:created');
  });
});