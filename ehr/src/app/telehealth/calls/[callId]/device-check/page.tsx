import { getCommunicationHubPageData } from '@/app/communication/communicationHubPageData';
import { getCommunicationCall } from '@/lib/clinicalCommunicationStore';
import { notFound } from 'next/navigation';
import TelehealthDeviceCheck from './TelehealthDeviceCheck';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DeviceCheckPage({ params, searchParams }: { params: Promise<{ callId: string }>; searchParams?: Promise<SearchParams> }) {
  const [{ callId }, query] = await Promise.all([params, searchParams || Promise.resolve<SearchParams>({})]);
  const { actor } = await getCommunicationHubPageData(query);
  const call = await getCommunicationCall(callId, actor, firstValue(query.patientId));
  if (!call) notFound();
  const returnParams = new URLSearchParams({ channel: 'call', folder: 'calls' });
  const patientId = firstValue(query.patientId);
  if (patientId) returnParams.set('patientId', patientId);
  return <TelehealthDeviceCheck callId={callId} returnHref={`/communication?${returnParams.toString()}`} />;
}
