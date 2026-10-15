import { getCommunicationHubPageData } from '../communicationHubPageData';
import UnifiedCommunicationHub from '../UnifiedCommunicationHub';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CommunicationMessagesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const { snapshot } = await getCommunicationHubPageData(params);
  return <UnifiedCommunicationHub initialData={snapshot} initialMode="messages" />;
}
