import { getCommunicationPageData } from '../communicationPageData';
import CommunicationWorkspace from '../CommunicationWorkspace';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CommunicationCallsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const { snapshot } = await getCommunicationPageData(params, { channel: 'call' });
  return <CommunicationWorkspace initialData={snapshot} active="calls" />;
}
