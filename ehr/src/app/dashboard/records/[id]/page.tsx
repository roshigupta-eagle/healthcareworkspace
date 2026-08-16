import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPatientById } from '../mockPatients';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import { AIHealthSummaryCard } from '@/components/patient-overview/AIHealthSummaryCard';
import { VitalsTrendCard } from '@/components/patient-overview/VitalsTrendCard';
import { ClinicalTimeline } from '@/components/patient-overview/ClinicalTimeline';
import { CurrentHealthConcernsCard } from '@/components/patient-overview/CurrentHealthConcernsCard';
import { UpcomingTasksCard } from '@/components/patient-overview/UpcomingTasksCard';
import { UpcomingAppointmentCard } from '@/components/patient-overview/UpcomingAppointmentCard';
import { KeyConditionsCard } from '@/components/patient-overview/KeyConditionsCard';
import { RecentResultsCard } from '@/components/patient-overview/RecentResultsCard';
import { RecentClinicalNotesCard } from '@/components/patient-overview/RecentClinicalNotesCard';
import { CurrentMedicationsCard } from '@/components/patient-overview/CurrentMedicationsCard';
import { MedicalHistorySection } from '@/components/patient-overview/MedicalHistorySection';
import { RecentChartActivityCard } from '@/components/patient-overview/RecentChartActivityCard';
import { CareGapsCard } from '@/components/patient-overview/CareGapsCard';
import { CareTeamCard } from '@/components/patient-overview/CareTeamCard';

export default async function PatientDetailPage({ params, searchParams }: { params: any; searchParams?: any }) {
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
  // Support dev override via ?asUser=USER_ID (only outside production)
  if (!session && resolvedSearchParams && resolvedSearchParams.asUser && process.env.NODE_ENV !== 'production') {
    const override = Array.isArray(resolvedSearchParams.asUser) ? resolvedSearchParams.asUser[0] : resolvedSearchParams.asUser;
    if (override) {
      session = { user: { id: override, name: override } };
    }
  }
  if (!session) redirect('/login');

  const patient = getPatientById(String(id));
  if (!patient) {
    redirect('/dashboard/records');
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
      <nav className="mb-4 text-sm text-neutral-600" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          <li><Link href="/dashboard/records" className="text-teal-600 hover:underline">← Back to Patient Records</Link></li>
          <li className="text-neutral-400">/</li>
          <li className="font-medium text-gray-800">{patient.name}</li>
          <li className="text-neutral-400">/</li>
          <li className="text-neutral-600">Overview</li>
        </ol>
      </nav>

      {/* 1. Patient identity and safety banner */}
      <PatientProfileHeader patient={patient} />

      {/* 2. AI Health Summary + Vitals Trend */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6">
          <AIHealthSummaryCard patient={patient} />
        </div>
        <div className="lg:col-span-6">
          <VitalsTrendCard patient={patient} />
        </div>
      </div>

      {/* 3. Clinical Timeline */}
      <div className="mt-6">
        <ClinicalTimeline patient={patient} />
      </div>

      {/* 4. Current Health Concerns, Upcoming Tasks, Upcoming Appointment */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5">
          <CurrentHealthConcernsCard patient={patient} />
        </div>
        <div className="lg:col-span-3">
          <UpcomingTasksCard patient={patient} />
        </div>
        <div className="lg:col-span-4">
          <UpcomingAppointmentCard patient={patient} />
        </div>
      </div>

      {/* 5. Key Conditions, Recent Results, Recent Clinical Notes, Current Medications */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4">
          <KeyConditionsCard patient={patient} />
        </div>
        <div className="lg:col-span-4">
          <RecentResultsCard patient={patient} />
        </div>
        <div className="lg:col-span-4">
          <RecentClinicalNotesCard patient={patient} />
        </div>
        <div className="lg:col-span-12">
          <CurrentMedicationsCard patient={patient} />
        </div>
      </div>

      {/* 6. Medical History */}
      <div className="mt-6">
        <MedicalHistorySection patient={patient} />
      </div>

      {/* 7. Recent Chart Activity, Care Gaps and Follow-up, Care Team */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4">
          <RecentChartActivityCard patient={patient} />
        </div>
        <div className="lg:col-span-4">
          <CareGapsCard patient={patient} />
        </div>
        <div className="lg:col-span-4">
          <CareTeamCard patient={patient} />
        </div>
      </div>
    </div>
  );
}
