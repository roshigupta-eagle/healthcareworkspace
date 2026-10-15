import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { logAuditEvent } from '@/lib/audit';
import { fhirSearch } from '@/lib/fhir-client';
import { PatientPortalShell } from '../PatientPortalShell';
import { signOutOfPatientPortal } from '../actions';

const PREVIEW_PATIENT_FHIR_ID = 'patient-001';

interface CodeableConceptLike {
  readonly text?: string;
  readonly coding?: ReadonlyArray<{ readonly display?: string }>;
}
interface ConditionRecord { readonly code?: CodeableConceptLike }
interface MedicationRequestRecord { readonly medicationCodeableConcept?: CodeableConceptLike; readonly status?: string }
interface AllergyIntoleranceRecord { readonly code?: CodeableConceptLike }
interface ObservationRecord { readonly code?: CodeableConceptLike; readonly valueQuantity?: { readonly value?: number; readonly unit?: string } }

async function getRecords(fhirId: string, agentId: string) {
  const [cond, meds, obs, allergy] = await Promise.allSettled([
    fhirSearch('Condition', { patient: fhirId }),
    fhirSearch('MedicationRequest', { patient: fhirId }),
    fhirSearch('Observation', { patient: fhirId, category: 'vital-signs', _sort: '-date', _count: '20' }),
    fhirSearch('AllergyIntolerance', { patient: fhirId }),
  ]);
  await logAuditEvent({ agentId, entityType: 'Patient', entityId: fhirId, action: 'R', outcome: 'success', description: 'Patient viewed own health records' });
  return {
    conditions: cond.status === 'fulfilled' ? cond.value : [],
    medications: meds.status === 'fulfilled' ? meds.value : [],
    observations: obs.status === 'fulfilled' ? obs.value : [],
    allergies: allergy.status === 'fulfilled' ? allergy.value : [],
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

export default async function PatientRecordsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const rawAsUser = params.asUser;
  const asUser = Array.isArray(rawAsUser) ? rawAsUser[0] : rawAsUser;
  const preview = process.env.NODE_ENV !== 'production' && asUser === PREVIEW_PATIENT_FHIR_ID;
  const session = await auth().catch(() => null);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user && !preview) redirect('/login');
  if (session?.user && role !== 'PATIENT') redirect('/unauthorized');

  const fhirId = preview ? PREVIEW_PATIENT_FHIR_ID : ((session?.user as { fhirId?: string; id?: string } | undefined)?.fhirId ?? session?.user?.id ?? '');
  const agentId = preview ? 'preview-patient-001' : session!.user!.id!;
  const patientName = preview ? 'Preview Patient' : (session?.user?.name ?? 'Patient');
  const data = fhirId ? await getRecords(fhirId, agentId) : { conditions: [], medications: [], observations: [], allergies: [] };

  return (
    <PatientPortalShell patientName={patientName} signOutAction={signOutOfPatientPortal}>
      <div className='space-y-5'>
        <h1 className='text-2xl font-bold text-neutral-800'>My Health Records</h1>
        <Section title={'Conditions (' + data.conditions.length + ')'} empty={data.conditions.length === 0}>
          <ul className='space-y-1'>
            {data.conditions.map((c: ConditionRecord, i: number) => (
              <li key={i} className='text-neutral-700'>{c.code?.text ?? c.code?.coding?.[0]?.display ?? 'Unknown'}</li>
            ))}
          </ul>
        </Section>
        <Section title={'Medications (' + data.medications.length + ')'} empty={data.medications.length === 0}>
          <ul className='space-y-1'>
            {data.medications.map((med: MedicationRequestRecord, i: number) => {
              const name = med.medicationCodeableConcept?.text ?? med.medicationCodeableConcept?.coding?.[0]?.display ?? 'Unknown';
              return <li key={i} className='text-neutral-700'>{name} <span className='text-neutral-400'>— {med.status}</span></li>;
            })}
          </ul>
        </Section>
        <Section title={'Allergies (' + data.allergies.length + ')'} empty={data.allergies.length === 0}>
          {data.allergies.map((a: AllergyIntoleranceRecord, i: number) => (
            <div key={i} className='text-red-700 font-medium'>{a.code?.text ?? a.code?.coding?.[0]?.display ?? 'Unknown allergen'}</div>
          ))}
        </Section>
        <Section title={'Recent Vitals (' + data.observations.length + ')'} empty={data.observations.length === 0}>
          <div className='grid grid-cols-2 gap-2'>
            {data.observations.slice(0, 8).map((obs: ObservationRecord, i: number) => {
              const name = obs.code?.text ?? obs.code?.coding?.[0]?.display;
              const value = obs.valueQuantity ? (obs.valueQuantity.value + ' ' + obs.valueQuantity.unit) : '—';
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
