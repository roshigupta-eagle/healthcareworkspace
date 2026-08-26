import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { resolveDataPath } from '@/lib/dataPath';
import type { Patient } from '@/app/dashboard/records/mockPatients';

const PATIENTS_FILE = resolveDataPath('patient-records.json');

type PatientRecordFile = { items?: unknown[] };

export type CreatePatientInput = {
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  birthDate: string;
  gender: string;
  mrn: string;
  phone?: string;
  email?: string;
  preferredLanguage?: string;
  preferredContactMethod?: string;
  primaryPhysician?: string;
  organization?: string;
  insuranceProvider?: string;
  insurancePlan?: string;
};

function isPatient(value: unknown): value is Patient {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<Patient>;
  return typeof record.id === 'string' && typeof record.name === 'string' && typeof record.dob === 'string' && typeof record.mrn === 'string';
}

function readFileSync(): Patient[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(PATIENTS_FILE, 'utf8')) as PatientRecordFile;
    return Array.isArray(parsed.items) ? parsed.items.filter(isPatient) : [];
  } catch {
    return [];
  }
}

async function readFile(): Promise<Patient[]> {
  try {
    const parsed = JSON.parse(await fsPromises.readFile(PATIENTS_FILE, 'utf8')) as PatientRecordFile;
    return Array.isArray(parsed.items) ? parsed.items.filter(isPatient) : [];
  } catch {
    return [];
  }
}

async function writeFile(items: Patient[]) {
  await fsPromises.mkdir(path.dirname(PATIENTS_FILE), { recursive: true });
  const temporaryPath = `${PATIENTS_FILE}.${process.pid}.tmp`;
  await fsPromises.writeFile(temporaryPath, JSON.stringify({ items }, null, 2), 'utf8');
  await fsPromises.rename(temporaryPath, PATIENTS_FILE);
}

function normalized(value?: string) {
  return (value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizedPhone(value?: string) {
  return (value || '').replace(/\D/g, '');
}

export function readPersistedPatientsSync() {
  return readFileSync();
}

export function findPotentialDuplicates(patients: readonly Patient[], input: CreatePatientInput) {
  const fullName = `${input.firstName} ${input.lastName}`;
  const name = normalized(fullName);
  const birthDate = input.birthDate.trim();
  const mrn = normalized(input.mrn);
  const phone = normalizedPhone(input.phone);
  const email = normalized(input.email);
  return patients.filter((patient) => {
    const sameMrn = Boolean(mrn && normalized(patient.mrn) === mrn);
    const sameNameAndBirthDate = normalized(patient.name) === name && patient.dob === birthDate;
    const samePhone = Boolean(phone && normalizedPhone(patient.contact?.phone) === phone);
    const sameEmail = Boolean(email && normalized(patient.contact?.email) === email);
    return sameMrn || sameNameAndBirthDate || samePhone || sameEmail;
  });
}

export async function createPatientRecord(input: CreatePatientInput, actorName: string): Promise<Patient> {
  const items = await readFile();
  const preferredName = input.preferredName?.trim() || undefined;
  const patient: Patient = {
    id: `patient-${randomUUID()}`,
    name: `${input.firstName.trim()} ${input.lastName.trim()}`,
    dob: input.birthDate.trim(),
    mrn: input.mrn.trim(),
    gender: input.gender.trim(),
    status: 'Active',
    preferredName,
    preferredLanguage: input.preferredLanguage?.trim() || 'English',
    preferredContactMethod: input.preferredContactMethod?.trim() || undefined,
    contact: { phone: input.phone?.trim() || undefined, email: input.email?.trim() || undefined },
    insurance: { provider: input.insuranceProvider?.trim() || undefined, plan: input.insurancePlan?.trim() || undefined },
    lastAttendingDoctor: input.primaryPhysician?.trim() || actorName,
    organization: input.organization?.trim() || undefined,
    conditions: [],
    medications: [],
    upcoming: [],
    notes: [],
    history: [],
    tests: [],
    documents: [],
    labResults: [],
    clinicalTasks: [],
    careGaps: [],
    careTeam: [],
    chartActivity: [],
    allergies: [],
    dataUpdatedAt: new Date().toISOString(),
  };
  await writeFile([...items, patient]);
  return patient;
}

export function patientRecordDataPath() {
  return PATIENTS_FILE;
}
