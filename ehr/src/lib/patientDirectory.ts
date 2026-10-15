import { getMockPatients, getPatientById, type Patient } from '@/app/dashboard/records/mockPatients';
import { getSchedulingPatientDirectory, type SchedulingAppointment, type SchedulingPatient, type SchedulingSnapshot } from '@/lib/schedulingData';

export type CanonicalPatient = {
  id: string;
  name: string;
  mrn: string;
  birthDate: string;
  gender?: string;
  status: 'Active' | 'Inactive' | 'Unknown';
};

export type PatientDirectorySource = {
  state: 'ready' | 'unavailable';
  label: string;
  error?: string;
};

export type PatientDirectorySnapshot = {
  patients: CanonicalPatient[];
  source: PatientDirectorySource;
};

function status(value?: string): CanonicalPatient['status'] {
  if (value === 'Active') return 'Active';
  if (value === 'Inactive') return 'Inactive';
  return 'Unknown';
}

function fromLocal(patient: Patient): CanonicalPatient {
  return { id: patient.id, name: patient.name, mrn: patient.mrn, birthDate: patient.dob, gender: patient.gender, status: status(patient.status) };
}

function fromScheduling(patient: SchedulingPatient): CanonicalPatient | null {
  if (!patient.mrn || !patient.birthDate) return null;
  return { id: patient.id, name: patient.name, mrn: patient.mrn, birthDate: patient.birthDate, status: status(patient.status) };
}

export function getLocalPatientDirectory(): PatientDirectorySnapshot {
  return { patients: getMockPatients().map(fromLocal), source: { state: 'ready', label: 'Roshi Health Records patient directory' } };
}

export function getLocalPatient(patientId: string) {
  const patient = getPatientById(patientId);
  return patient ? fromLocal(patient) : null;
}

export async function getCanonicalPatientDirectory(options: { preview?: boolean } = {}): Promise<PatientDirectorySnapshot> {
  if (options.preview || process.env.NODE_ENV !== 'production') return getLocalPatientDirectory();
  const scheduling = await getSchedulingPatientDirectory();
  if (scheduling.source.state === 'ready') {
    const patients = scheduling.patients.map(fromScheduling).filter((patient): patient is CanonicalPatient => Boolean(patient));
    return { patients, source: { state: 'ready', label: scheduling.source.source } };
  }
  return { patients: [], source: { state: 'unavailable', label: scheduling.source.source, error: scheduling.source.error } };
}

export function scopeSchedulingSnapshot(snapshot: SchedulingSnapshot, directory: PatientDirectorySnapshot, enabled: boolean): SchedulingSnapshot {
  if (!enabled) return snapshot;
  const patientIds = new Set(directory.patients.map((patient) => patient.id));
  const appointments = snapshot.appointments.filter((appointment: SchedulingAppointment) => Boolean(appointment.patientId && patientIds.has(appointment.patientId)));
  return { ...snapshot, patients: directory.patients, appointments };
}
