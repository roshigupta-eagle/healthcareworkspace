import { describe, expect, it } from 'vitest';
import { buildSeedEvents } from '../lib/timeline/seedFromPatient';
import type { Patient } from '../app/dashboard/records/mockPatients';

const patient: Patient = {
  id: 'patient-test',
  name: 'Test Patient',
  dob: '1980-01-01',
  mrn: 'MRN-1',
  upcoming: [{ id: 'appt-1', date: '2099-07-18T10:30:00.000Z', doctor: 'Dr. Lee', type: 'Follow-up', status: 'Scheduled' }],
  history: [{ id: 'enc-1', date: '2026-05-15', provider: 'Dr. Lee', reason: 'Annual review', status: 'Completed' }],
  notes: [{ id: 'note-1', date: '2026-05-15', author: 'Dr. Lee', snippet: 'Reviewed plan', status: 'Signed' }],
  documents: [{ id: 'doc-1', name: 'Discharge Summary', date: '2026-06-02', url: '/docs/discharge.pdf' }],
};

describe('clinical timeline projection', () => {
  it('keeps future appointments as appointments and resolves exact source links', () => {
    const events = buildSeedEvents(patient.id, patient);
    const appointment = events.find((event) => event.resourceId === 'appt-1');
    const note = events.find((event) => event.resourceId === 'note-1');
    const document = events.find((event) => event.resourceId === 'doc-1');

    expect(appointment?.eventType).toBe('appointment');
    expect(appointment?.status).toBe('Scheduled');
    expect(appointment?.recordHref).toContain('/appointments/appt-1');
    expect(note?.recordHref).toContain('/doctor-notes?noteId=note-1');
    expect(document?.recordHref).toContain('/documents?documentId=doc-1');
  });
});