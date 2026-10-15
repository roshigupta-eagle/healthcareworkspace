import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import { getLaboratoryDashboardSnapshot, type LaboratoryDashboardFilters, type LaboratoryFilter, type LaboratorySort } from '@/lib/laboratoryDashboard';
import LaboratoryCommandCenterClient from './LaboratoryCommandCenterClient';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

const FILTERS = new Set<LaboratoryFilter>(['all', 'needs-review', 'abnormal', 'critical', 'follow-up', 'specimen-issue']);
const SORTS = new Set<LaboratorySort>(['most-urgent', 'newest', 'updated', 'name']);

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function previewQuery(noAuth: boolean, asUser: string, preview: boolean) {
  if (!preview) return '';
  const query = new URLSearchParams();
  if (noAuth) query.set('noauth', '1');
  query.set('asUser', asUser || 'dev');
  return query.toString();
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
  const asUser = firstValue(params.asUser);
  const noAuth = ['1', 'true'].includes(firstValue(params.noauth));
  const preview = process.env.NODE_ENV !== 'production' && (noAuth || ['dev', 'dev-doctor', 'user-admin-khan'].includes(asUser));
  const session = await auth().catch(() => null);
  if (!session?.user && !preview) redirect('/login?returnTo=%2Fdashboard%2Flaboratory');

  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const previewActor = preview && !session?.user;
  const actor = previewActor
    ? { id: asUser || 'dev', name: asUser === 'dev' ? 'dev' : asUser === 'user-admin-khan' ? 'Admin Fatima Khan' : 'Doctor User', role: asUser === 'user-admin-khan' ? 'ADMIN' : 'DEV' }
    : { id: user?.id || 'dev-doctor', name: user?.name || 'Doctor User', role: String(user?.role || 'DOCTOR').toUpperCase() };
  if (session?.user && !CLINICAL_WORKSPACE_ROLES.has(actor.role)) redirect('/unauthorized');

  const initialData = await getLaboratoryDashboardSnapshot(actor, initialFilters(params), { preview });
  return <LaboratoryCommandCenterClient initialData={initialData} preview={previewQuery(noAuth, asUser, preview)} />;
}
