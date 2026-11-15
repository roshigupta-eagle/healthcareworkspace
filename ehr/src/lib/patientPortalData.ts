import { getPatientById, type Patient } from '@/app/dashboard/records/mockPatients';
import { listConditions } from '@/lib/conditionsStore';
import { listMedications } from '@/lib/medicationsStore';

function readableDate(value: string | undefined) {
  if (!value) return 'Date not available';
  const parsed = new Date(value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
}

function canonicalPatient(patientId: string): Patient | undefined {
  return getPatientById(patientId);
}

export type PatientAppointment = { readonly id: string; readonly title: string; readonly start: string; readonly status: string; readonly location: string; readonly provider: string };
export type PatientResult = { readonly id: string; readonly title: string; readonly date: string; readonly status: string; readonly summary: string };
export type PatientVisit = { readonly id: string; readonly title: string; readonly date: string; readonly status: string; readonly location: string };
export type PatientDocument = { readonly id: string; readonly title: string; readonly date: string; readonly type: string; readonly status: string };
export type PatientCommunication = { readonly id: string; readonly title: string; readonly date: string; readonly status: string; readonly detail: string };

export async function getPatientClinicalSnapshot(patientId: string) {
  const patient = canonicalPatient(patientId);
  if (!patient) return { patient, conditions: [], medications: [], allergies: [], vitals: {} };
  const [storedConditions, storedMedications] = await Promise.all([
    listConditions(patientId),
    listMedications(patientId),
  ]);
  const conditions = [...storedConditions.filter((item) => item.clinicalStatus !== 'entered-in-error').map((item) => item.name), ...(patient.conditions ?? [])].filter((item, index, values) => values.indexOf(item) === index);
  const medicationNames = new Set(storedMedications.map((item) => item.name));
  const medications = [
    ...storedMedications.map((item) => ({ name: item.name, dose: item.dose, freq: item.frequency, status: item.status })),
    ...(patient.medications ?? []).filter((item) => !medicationNames.has(item.name)),
  ];
  return {
    patient,
    conditions,
    medications,
    allergies: patient.allergies ?? [],
    vitals: patient.vitals ?? {},
  };
}

export async function getPatientAppointments(patientId: string): Promise<PatientAppointment[]> {
  const patient = canonicalPatient(patientId);
  return [...(patient?.upcoming ?? [])]
    .sort((left, right) => Date.parse(left.date) - Date.parse(right.date))
    .map((item) => ({ id: item.id, title: item.type || 'Appointment', start: readableDate(item.date), status: item.status || 'Scheduled', location: item.location || 'Location not available', provider: item.doctor || 'Care team' }));
}

export async function getPatientResults(patientId: string): Promise<PatientResult[]> {
  const patient = canonicalPatient(patientId);
  return [...(patient?.labResults ?? [])]
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))
    .map((item) => ({ id: item.id, title: item.name, date: readableDate(item.date), status: item.status || 'Unknown', summary: `${item.result}${item.unit ? ` ${item.unit}` : ''}${item.interpretation ? ` · ${item.interpretation}` : ''}` }));
}

export async function getPatientVisits(patientId: string): Promise<PatientVisit[]> {
  const patient = canonicalPatient(patientId);
  const historical = (patient?.history ?? []).map((item) => ({ id: item.id, title: item.reason || 'Clinical visit', date: readableDate(item.date), status: item.status || 'Completed', location: 'Location not available' }));
  const completedAppointments = (patient?.upcoming ?? []).filter((item) => item.status?.toLowerCase() === 'completed').map((item) => ({ id: item.id, title: item.type || 'Clinical visit', date: readableDate(item.date), status: item.status || 'Completed', location: item.location || 'Location not available' }));
  return [...historical, ...completedAppointments].sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
}

export async function getPatientDocuments(patientId: string): Promise<PatientDocument[]> {
  const patient = canonicalPatient(patientId);
  return [...(patient?.documents ?? [])]
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))
    .map((item) => ({ id: item.id, title: item.name, date: readableDate(item.date), type: item.type || 'Document', status: item.status || 'Available' }));
}

export async function getPatientCommunications(patientId: string): Promise<PatientCommunication[]> {
  const patient = canonicalPatient(patientId);
  return [...(patient?.notes ?? [])]
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))
    .map((item) => ({ id: item.id, title: `Update from ${item.author}`, date: readableDate(item.date), status: item.status || 'Available', detail: item.snippet }));
}
