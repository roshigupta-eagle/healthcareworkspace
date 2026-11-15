import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LABORATORY_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import { getLaboratoryDashboardSnapshot, type LaboratoryDashboardFilters, type LaboratoryFilter, type LaboratorySort } from '@/lib/laboratoryDashboard';
import LaboratoryCommandCenterClient from './LaboratoryCommandCenterClient';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

const FILTERS = new Set<LaboratoryFilter>(['all', 'needs-review', 'abnormal', 'critical', 'follow-up', 'specimen-issue']);
const SORTS = new Set<LaboratorySort>(['most-urgent', 'newest', 'updated', 'name']);

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function initialFilters(params: SearchParams): LaboratoryDashboardFilters {
  const filter = firstValue(params.filter);
  const sort = firstValue(params.sort);
  return {
    q: firstValue(params.q) || undefined,
    filter: FILTERS.has(filter as LaboratoryFilter) ? filter as LaboratoryFilter : undefined,
    sort: SORTS.has(sort as LaboratorySort) ? sort as LaboratorySort : undefined,
  };
}

export default async function LaboratoryPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const session = await auth().catch(() => null);
  if (!session?.user) redirect('/login?returnTo=%2Fdashboard%2Flaboratory');

  const user = session.user as { id?: string; name?: string; role?: string };
  const actor = { id: user.id || '', name: user.name || '', role: String(user.role || '').toUpperCase() };
  if (!LABORATORY_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');

  const initialData = await getLaboratoryDashboardSnapshot(actor, initialFilters(params));
  return <LaboratoryCommandCenterClient initialData={initialData} />;
}
