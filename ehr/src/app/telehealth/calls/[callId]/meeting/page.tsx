import { getCommunicationHubPageData } from '@/app/communication/communicationHubPageData';
import { getCommunicationCall } from '@/lib/clinicalCommunicationStore';
import { notFound } from 'next/navigation';
import TelehealthMeetingWorkspace from './TelehealthMeetingWorkspace';

export const dynamic = 'force-dynamic';
type SearchParams = Record<string, string | string[] | undefined>;
function firstValue(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function MeetingPage({ params, searchParams }: { params: Promise<{ callId: string }>; searchParams?: Promise<SearchParams> }) {
  const [{ callId }, query] = await Promise.all([params, searchParams || Promise.resolve({})]);
  const { actor } = await getCommunicationHubPageData(query);
  const call = await getCommunicationCall(callId, actor, firstValue(query.patientId));
  if (!call) notFound();
  const search = new URLSearchParams({ channel: 'call', folder: 'calls' });
  for (const key of ['asUser', 'patientId']) { const value = firstValue(query[key]); if (value) search.set(key, value); }
  if (call.conversationId) search.set('conversationId', call.conversationId);
  return <TelehealthMeetingWorkspace callId={callId} returnHref={`/communication?${search.toString()}`} showDevelopmentBadge={process.env.NODE_ENV !== 'production'} />;
}
