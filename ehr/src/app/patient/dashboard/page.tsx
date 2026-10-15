import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { fhirSearch } from '@/lib/fhir-client';
import { logAuditEvent } from '@/lib/audit';
import Link from 'next/link';
import { PatientPortalShell } from '../PatientPortalShell';
import { signOutOfPatientPortal } from '../actions';

const PREVIEW_PATIENT_FHIR_ID = 'patient-001';

async function getPatientData(patientFhirId: string, agentId: string) {
  const [conditions, meds, appts] = await Promise.allSettled([
    fhirSearch('Condition', { patient: patientFhirId, 'clinical-status': 'active' }),
    fhirSearch('MedicationRequest', { patient: patientFhirId, status: 'active' }),
    fhirSearch('Appointment', { patient: patientFhirId, status: 'booked' }),
  ]);
  await logAuditEvent({ agentId, entityType: 'Patient', entityId: patientFhirId, action: 'R', outcome: 'success', description: 'Patient viewed own dashboard' });
  return {
    conditions: conditions.status === 'fulfilled' ? conditions.value : [],
    medications: meds.status === 'fulfilled' ? meds.value : [],
    appointments: appts.status === 'fulfilled' ? appts.value : [],
  };
}

export default async function PatientDashboard({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const rawAsUser = params.asUser;
  const asUser = Array.isArray(rawAsUser) ? rawAsUser[0] : rawAsUser;
  const preview = process.env.NODE_ENV !== 'production' && asUser === PREVIEW_PATIENT_FHIR_ID;
  const session = await auth().catch(() => null);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user && !preview) redirect('/login');
  if (session?.user && role !== 'PATIENT') redirect('/unauthorized');

  const patientFhirId = preview ? PREVIEW_PATIENT_FHIR_ID : ((session?.user as { fhirId?: string; id?: string } | undefined)?.fhirId ?? session?.user?.id ?? '');
  const agentId = preview ? 'preview-patient-001' : session!.user!.id!;
  const patientName = preview ? 'Preview Patient' : (session?.user?.name ?? 'Patient');
  const data = patientFhirId ? await getPatientData(patientFhirId, agentId) : { conditions: [], medications: [], appointments: [] };

  const cards = [
    { title: 'Active Conditions', count: data.conditions.length, href: '/patient/records', color: 'border-blue-400', icon: '🩺' },
    { title: 'Current Medications', count: data.medications.length, href: '/patient/records', color: 'border-purple-400', icon: '💊' },
    { title: 'Upcoming Appointments', count: data.appointments.length, href: '/scheduling', color: 'border-green-400', icon: '📅' },
  ];

  return (
    <PatientPortalShell patientName={patientName} signOutAction={signOutOfPatientPortal}>
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-neutral-800'>Welcome back, {patientName.split(' ')[0]}</h1>
          <p className='text-neutral-500 text-sm mt-1'>Your health summary as of {new Date().toLocaleDateString('en-CA')}</p>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          {cards.map((c) => (
            <Link key={c.title} href={c.href} className={'bg-white rounded-xl border-l-4 ' + c.color + ' shadow-sm p-5 hover:shadow-md transition-shadow'}>
              <div className='flex items-center gap-3'>
                <span className='text-3xl'>{c.icon}</span>
                <div>
                  <p className='text-2xl font-bold text-neutral-800'>{c.count}</p>
                  <p className='text-xs text-neutral-500'>{c.title}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className='bg-white rounded-xl border border-neutral-200 p-5'>
          <h2 className='font-semibold text-neutral-700 mb-3'>Quick Actions</h2>
          <div className='flex flex-wrap gap-3'>
            <Link href='/patient/appointments' className='px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700'>View Appointments</Link>
            <Link href='/patient/records' className='px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 text-sm hover:bg-neutral-50'>View Health Records</Link>
          </div>
        </div>
      </div>
    </PatientPortalShell>
  );
}
