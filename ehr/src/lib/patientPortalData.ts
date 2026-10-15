import { fhirSearch } from '@/lib/fhir-client';

type Resource = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Resource : undefined;
}

function label(value: unknown) {
  const source = record(value);
  if (!source) return undefined;
  const direct = text(source.text) ?? text(source.display);
  if (direct) return direct;
  const coding = Array.isArray(source.coding) ? record(source.coding[0]) : undefined;
  return text(coding?.display);
}

function date(value: unknown) {
  const source = text(value);
  return source ? new Date(source) : undefined;
}

function readableDate(value: unknown) {
  const parsed = date(value);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date not available';
}

export type PatientAppointment = { readonly id: string; readonly title: string; readonly start: string; readonly status: string; readonly location: string; readonly provider: string };
export type PatientResult = { readonly id: string; readonly title: string; readonly date: string; readonly status: string; readonly summary: string };
export type PatientVisit = { readonly id: string; readonly title: string; readonly date: string; readonly status: string; readonly location: string };
export type PatientDocument = { readonly id: string; readonly title: string; readonly date: string; readonly type: string; readonly status: string };
export type PatientCommunication = { readonly id: string; readonly title: string; readonly date: string; readonly status: string; readonly detail: string };

export async function getPatientAppointments(patientId: string): Promise<PatientAppointment[]> {
  const resources = await fhirSearch<Resource>('Appointment', { patient: patientId, _sort: 'date' });
  return resources.map((item, index) => {
    const participant = Array.isArray(item.participant) ? item.participant.map(record).find((entry) => text(record(entry?.actor)?.reference)?.startsWith('Practitioner/')) : undefined;
    const actor = record(participant?.actor);
    return { id: text(item.id) ?? String(index), title: label(item.serviceType) ?? label(item.appointmentType) ?? 'Appointment', start: readableDate(item.start), status: text(item.status) ?? 'unknown', location: label(item.location) ?? 'Location not available', provider: text(actor?.display) ?? 'Care team' };
  });
}

export async function getPatientResults(patientId: string): Promise<PatientResult[]> {
  const resources = await fhirSearch<Resource>('DiagnosticReport', { patient: patientId, _sort: '-date' });
  return resources.map((item, index) => ({ id: text(item.id) ?? String(index), title: label(item.code) ?? 'Clinical result', date: readableDate(item.issued ?? item.effectiveDateTime), status: text(item.status) ?? 'unknown', summary: text(item.conclusion) ?? 'Your care team has not added a patient-facing summary.' }));
}

export async function getPatientVisits(patientId: string): Promise<PatientVisit[]> {
  const resources = await fhirSearch<Resource>('Encounter', { patient: patientId, _sort: '-date' });
  return resources.map((item, index) => ({ id: text(item.id) ?? String(index), title: label(item.type) ?? text(item.serviceType) ?? 'Clinical visit', date: readableDate(record(item.period)?.start), status: text(item.status) ?? 'unknown', location: label(item.location) ?? 'Location not available' }));
}

export async function getPatientDocuments(patientId: string): Promise<PatientDocument[]> {
  const resources = await fhirSearch<Resource>('DocumentReference', { patient: patientId, _sort: '-date' });
  return resources.map((item, index) => ({ id: text(item.id) ?? String(index), title: text(item.description) ?? label(item.type) ?? 'Clinical document', date: readableDate(item.date), type: label(item.type) ?? 'Document', status: text(item.status) ?? 'unknown' }));
}

export async function getPatientCommunications(patientId: string): Promise<PatientCommunication[]> {
  const resources = await fhirSearch<Resource>('Communication', { subject: patientId, _sort: '-sent' });
  return resources.map((item, index) => ({ id: text(item.id) ?? String(index), title: label(item.topic) ?? 'Care team message', date: readableDate(item.sent), status: text(item.status) ?? 'unknown', detail: text(item.payload) ?? 'Open this message through the care team communication service when available.' }));
}
