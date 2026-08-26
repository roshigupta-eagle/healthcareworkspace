import { getDoctorWorkSnapshot } from '@/lib/doctorWorkStore';
import DoctorMessagesClient from '@/components/doctor-workspace/DoctorMessagesClient';
import { getCommunicationPageData } from '../communicationPageData';
import { CommunicationModuleNav } from '../CommunicationWorkspace';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CommunicationMessagesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const { actor } = await getCommunicationPageData(params, { channel: 'message' });
  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId;
  return <div className="communication-messages-route"><CommunicationModuleNav active="messages" /><DoctorMessagesClient initialData={await getDoctorWorkSnapshot(actor.id, actor.name, actor.role)} patientIdFilter={patientId} openNew={params.new === '1'} /></div>;
}
