import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCanonicalPatientDirectory } from '@/lib/patientDirectory';
import ClinicalDirectoryClient from './ClinicalDirectoryClient';

export default async function PatientsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fdashboard%2Fpatients');
  const role = String(session.user.role || '').toUpperCase();
  if (!['DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER'].includes(role)) redirect('/unauthorized');
  const directory = await getCanonicalPatientDirectory();
  const patients = directory.patients;
  const source = { state: directory.source.state, source: directory.source.label, fallback: false, error: directory.source.error };
  return <ClinicalDirectoryClient patients={patients} source={source} />;
}
