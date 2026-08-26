import { getCommunicationPageData } from './communicationPageData';
import CommunicationWorkspace from './CommunicationWorkspace';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CommunicationPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const { snapshot } = await getCommunicationPageData(params);
  return <CommunicationWorkspace initialData={snapshot} />;
}
