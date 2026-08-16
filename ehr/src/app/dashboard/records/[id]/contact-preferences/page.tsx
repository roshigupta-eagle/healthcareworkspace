import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import { getPatientById } from '../../mockPatients';
import ContactSummaryCard from '@/components/contact-preferences/ContactSummaryCard';
import ContactMethodsTable from '@/components/contact-preferences/ContactMethodsTable';
import CommunicationPreferencesCard from '@/components/contact-preferences/CommunicationPreferencesCard';
import ConsentCard from '@/components/contact-preferences/ConsentCard';
import VerificationHistoryTimeline from '@/components/contact-preferences/VerificationHistoryTimeline';
import FhirResourceInfoCard from '@/components/contact-preferences/FhirResourceInfoCard';

export default async function ContactPreferencesPage({ params, searchParams }: { params: any; searchParams?: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? (params && params.id);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  let session: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    session = await auth();
  } catch (e) {
    // allow dev preview
  }

  if (!session && resolvedSearchParams && resolvedSearchParams.asUser && process.env.NODE_ENV !== 'production') {
    const override = Array.isArray(resolvedSearchParams.asUser) ? resolvedSearchParams.asUser[0] : resolvedSearchParams.asUser;
    if (override) session = { user: { id: override, name: override } };
  }

  if (!session) redirect('/login');

  const patient = getPatientById(String(id));
  if (!patient) redirect('/dashboard/records');

  // Build contact methods from patient record
  const methods: Array<any> = [];
  if (patient.contact?.phone) {
    methods.push({ id: 'phone-1', system: 'phone', value: patient.contact.phone, use: 'mobile', purpose: 'Appointment reminders', verified: true, lastUpdated: patient.dataUpdatedAt || patient.lastVisit });
  }
  if (patient.contact?.email) {
    methods.push({ id: 'email-1', system: 'email', value: patient.contact.email, use: 'personal', purpose: 'Portal messages', verified: true, lastUpdated: patient.dataUpdatedAt || patient.lastVisit });
  }
  if (patient.contact?.address) {
    methods.push({ id: 'address-1', system: 'postal', value: patient.contact.address, use: 'home', purpose: 'Mailing', verified: false, lastUpdated: patient.dataUpdatedAt });
  }

  const preferences = {
    preferredMethod: patient.preferredContactMethod ?? 'phone',
    bestTime: '',
    okToLeaveVoicemail: true,
    okToSMS: true,
    emailAllowed: true,
    marketingAllowed: false,
    language: patient.preferredLanguage ?? 'English',
    interpreterRequired: false,
    doNotContact: false,
  };

  const consent = {
    id: 'consent-1',
    status: 'active',
    date: patient.dataUpdatedAt ?? undefined,
    source: 'Patient Registration',
    sharedWith: [],
    notes: '',
    expiresAt: undefined,
  };

  const verificationHistory = [
    { id: 'v1', timestamp: patient.dataUpdatedAt ?? new Date().toISOString(), event: 'Contact details confirmed', actor: 'Front Desk', method: 'manual', result: 'success' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      <nav className="mb-4 text-sm text-neutral-600" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          <li><Link href="/dashboard/records" className="text-teal-600 hover:underline">← Back to Patient Records</Link></li>
          <li className="text-neutral-400">/</li>
          <li className="font-medium text-gray-800">{patient.name}</li>
          <li className="text-neutral-400">/</li>
          <li className="text-neutral-600">Contact Preferences</li>
        </ol>
      </nav>

      <PatientProfileHeader patient={patient} />

      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        <main className="flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ContactSummaryCard
              title="Primary Phone"
              items={[{ label: 'Number', value: patient.contact?.phone ?? '—' }, { label: 'Type', value: 'Mobile' }, { label: 'Verified', value: patient.contact?.phone ? 'Yes' : 'No' }]}
            />

            <ContactSummaryCard
              title="Primary Email"
              items={[{ label: 'Address', value: patient.contact?.email ?? '—' }, { label: 'Type', value: 'Personal' }, { label: 'Verified', value: patient.contact?.email ? 'Yes' : 'No' }]}
            />

            <ContactSummaryCard
              title="Mailing Address"
              items={[{ label: 'Address', value: patient.contact?.address ?? '—' }, { label: 'Type', value: 'Home' }]}
            />
          </div>

          <div className="bg-white rounded-2xl p-4 border shadow-sm">
            <h2 className="text-lg font-semibold">Contact Methods</h2>
            <p className="text-sm text-gray-600 mt-1">All contact methods on file for this patient.</p>
            <ContactMethodsTable methods={methods} />
          </div>

          <div className="bg-white rounded-2xl p-4 border shadow-sm">
            <h2 className="text-lg font-semibold">Verification History</h2>
            <VerificationHistoryTimeline events={verificationHistory} />
          </div>
        </main>

        <aside className="w-full lg:w-96 space-y-6">
          <CommunicationPreferencesCard preferences={preferences} />
          <ConsentCard consent={consent} />
          <FhirResourceInfoCard resource={{ resourceType: 'Patient', id: patient.id, fhirVersion: '4.0.1', lastUpdated: patient.dataUpdatedAt }} />
        </aside>
      </div>
    </div>
  );
}
