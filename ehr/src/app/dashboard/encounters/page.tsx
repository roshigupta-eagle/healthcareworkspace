import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import { getEncounterWorkspace } from '@/lib/encounterWorkspace';
import EncounterCommandCenter from '@/components/encounters/EncounterCommandCenter';

export const dynamic = 'force-dynamic';

export default async function EncountersPage() {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fdashboard%2Fencounters');
  const user = session.user as { id?: string; name?: string; role?: string };
  const actor = { id: user.id || '', name: user.name || '', role: String(user.role || '').toUpperCase() };
  if (!CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');

  return <EncounterCommandCenter initialData={await getEncounterWorkspace(actor)} />;
}
