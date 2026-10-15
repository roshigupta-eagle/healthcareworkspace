import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import { getEncounterWorkspace } from '@/lib/encounterWorkspace';
import EncounterCommandCenter from '@/components/encounters/EncounterCommandCenter';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function EncountersPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const asUser = firstValue(resolvedSearchParams.asUser);
  const noAuth = ['1', 'true'].includes(firstValue(resolvedSearchParams.noauth));
  const preview = process.env.NODE_ENV !== 'production' && (
    noAuth || ['dev', 'dev-doctor', 'user-admin-khan'].includes(asUser)
  );
  const session = await auth().catch(() => null);
  if (!session?.user && !preview) redirect('/login?returnTo=%2Fdashboard%2Fencounters');
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const actor = preview && !session?.user
    ? {
        id: asUser || 'dev-doctor',
        name: asUser === 'user-admin-khan' ? 'Admin Fatima Khan' : 'Doctor User',
        role: asUser === 'user-admin-khan' ? 'ADMIN' : 'DEV',
      }
    : {
        id: user?.id || 'dev-doctor',
        name: user?.name || 'Doctor User',
        role: String(user?.role || 'DOCTOR').toUpperCase(),
      };
  if (!CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');
  const previewQuery = preview
    ? `${noAuth ? 'noauth=1' : ''}${noAuth && asUser ? '&' : ''}${asUser ? `asUser=${encodeURIComponent(asUser)}` : noAuth ? 'asUser=dev' : ''}`
    : '';

  return <EncounterCommandCenter initialData={await getEncounterWorkspace(actor)} preview={previewQuery} />;
}
