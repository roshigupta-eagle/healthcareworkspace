import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { logAuditEvent } from '@/lib/audit';
import { getPatientClinicalSnapshot } from '@/lib/patientPortalData';
import { PatientPortalShell } from '../PatientPortalShell';
import { signOutOfPatientPortal } from '../actions';

async function getRecords(fhirId: string, agentId: string) {
  const snapshot = await getPatientClinicalSnapshot(fhirId);
  const observations = (Object.entries(snapshot.vitals) as Array<[string, Array<{ date: string; value: number; unit: string }> | undefined]>).flatMap(([name, measurements]) => {
    const latest = measurements?.slice().sort((left, right) => Date.parse(right.date) - Date.parse(left.date))[0];
    return latest ? [{ name: name.replace(/([A-Z])/g, ' $1').trim(), value: `${latest.value} ${latest.unit}` }] : [];
  });
  await logAuditEvent({ agentId, entityType: 'Patient', entityId: fhirId, action: 'R', outcome: 'success', description: 'Patient viewed own health records' });
  return {
    conditions: snapshot.conditions,
    medications: snapshot.medications,
    observations,
    allergies: snapshot.allergies,
  };
}

function Section({ title, children, empty }: { title: string; children: React.ReactNode; empty: boolean }) {
  return (
    <div className='bg-white rounded-xl border border-neutral-200 overflow-hidden'>
      <div className='px-5 py-3 border-b border-neutral-100 font-semibold text-neutral-700'>{title}</div>
      <div className='px-5 py-3 text-sm'>{empty ? <p className='text-neutral-400'>None recorded</p> : children}</div>
    </div>
  );
}

export default async function PatientRecordsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fpatient%2Frecords');
  const user = session.user as { id?: string; name?: string; role?: string; fhirId?: string };
  if (user.role !== 'PATIENT') redirect('/unauthorized');

  const fhirId = user.fhirId ?? user.id ?? '';
  const agentId = user.id ?? '';
  const patientName = user.name ?? 'Patient';
  const data = fhirId ? await getRecords(fhirId, agentId) : { conditions: [], medications: [], observations: [], allergies: [] };

  return (
    <PatientPortalShell patientName={patientName} signOutAction={signOutOfPatientPortal}>
      <div className='space-y-5'>
        <h1 className='text-2xl font-bold text-neutral-800'>My Health Records</h1>
        <Section title={'Conditions (' + data.conditions.length + ')'} empty={data.conditions.length === 0}>
          <ul className='space-y-1'>
            {data.conditions.map((condition, i: number) => (
              <li key={i} className='text-neutral-700'>{condition}</li>
            ))}
          </ul>
        </Section>
        <Section title={'Medications (' + data.medications.length + ')'} empty={data.medications.length === 0}>
          <ul className='space-y-1'>
            {data.medications.map((medication, i: number) => {
              return <li key={i} className='text-neutral-700'>{medication.name} <span className='text-neutral-400'>— {medication.status ?? 'Active'}</span></li>;
            })}
          </ul>
        </Section>
        <Section title={'Allergies (' + data.allergies.length + ')'} empty={data.allergies.length === 0}>
          {data.allergies.map((allergy, i: number) => (
            <div key={i} className='text-red-700 font-medium'>{allergy}</div>
          ))}
        </Section>
        <Section title={'Recent Vitals (' + data.observations.length + ')'} empty={data.observations.length === 0}>
          <div className='grid grid-cols-2 gap-2'>
            {data.observations.slice(0, 8).map((observation, i: number) => {
              const name = observation.name;
              const value = observation.value;
              return (
                <div key={i} className='rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2'>
                  <p className='text-xs text-neutral-400'>{name}</p>
                  <p className='font-semibold text-neutral-800'>{value}</p>
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    </PatientPortalShell>
  );
}
