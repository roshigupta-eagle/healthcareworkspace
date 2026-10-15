import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllMockUsers } from '@/cardiology/services/api.mock';
import { getAdminDashboardData } from '@/lib/adminDashboard';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function display(value: number | null) { return value === null ? 'Unavailable' : value.toLocaleString(); }

export default async function AdminPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const asUser = first(params.asUser);
  const preview = process.env.NODE_ENV !== 'production' && asUser === 'user-admin-khan';
  const session = await auth().catch(() => null);
  const user = session?.user as { role?: string; name?: string } | undefined;
  const previewUser = preview ? getAllMockUsers()['user-admin-khan'] : undefined;
  const role = user?.role ?? previewUser?.role;
  if (!role) redirect('/login');
  if (role !== 'ADMIN') redirect('/unauthorized');

  const data = await getAdminDashboardData();
  const query = preview ? '?asUser=user-admin-khan&noauth=1' : '';
  const actions = [
    data.pendingUsers === null ? { label: 'User approval status unavailable', tone: 'unknown', href: '/admin/users' } : { label: data.pendingUsers > 0 ? String(data.pendingUsers) + ' user accounts awaiting approval' : 'No users awaiting approval', tone: data.pendingUsers > 0 ? 'attention' : 'routine', href: '/admin/users' },
    data.auditFailures === null ? { label: 'Security event status unavailable', tone: 'unknown', href: '/admin/security' } : { label: data.auditFailures > 0 ? String(data.auditFailures) + ' failed audit events require review' : 'No failed audit events in the read model', tone: data.auditFailures > 0 ? 'attention' : 'routine', href: '/admin/security' },
  ];
  const metrics = [
    ['Active users', display(data.activeUsers), 'Current user directory'],
    ['Patient records', display(data.patientRecords), 'Canonical patient repository'],
    ['Open encounters', display(data.openEncounters), 'Planned, arrived, or in progress'],
    ['Integration issues', 'Unknown', 'No integration health read model'],
  ] as const;

  return <div className='space-y-7'>
    <section className='flex flex-col justify-between gap-4 sm:flex-row sm:items-end'>
      <div><p className='mb-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700'>Organization overview</p><h1 className='text-3xl font-semibold tracking-tight text-slate-950'>Welcome back, {user?.name ?? previewUser?.name ?? 'Administrator'}</h1><p className='mt-2 text-sm text-slate-600'>Priorities and verified operational signals across your organization.</p></div>
      <div className='rounded-lg border border-slate-200 bg-white px-4 py-3 text-right shadow-sm'><p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>System posture</p><p className='mt-1 text-sm font-semibold text-slate-700'>Partially observed</p><p className='mt-1 text-xs text-slate-500'>Updated on request</p></div>
    </section>

    <section aria-labelledby='action-center-heading' className='rounded-xl border border-teal-200 bg-white p-5 shadow-sm'><div className='mb-4 flex items-center justify-between gap-3'><div><p className='text-xs font-bold uppercase tracking-[0.14em] text-teal-700'>Admin Action Center</p><h2 id='action-center-heading' className='mt-1 text-xl font-semibold text-slate-900'>What needs attention</h2></div><Link href={'/admin/security' + query} className='rounded-lg border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50'>Review all</Link></div><div className='grid gap-3 lg:grid-cols-2'>{actions.map((action) => <Link key={action.label} href={action.href + query} className='flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm hover:bg-teal-50'><span className='font-medium text-slate-800'>{action.label}</span><span className={'rounded-full px-2 py-1 text-xs font-semibold ' + (action.tone === 'attention' ? 'bg-amber-100 text-amber-800' : action.tone === 'unknown' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800')}>{action.tone === 'attention' ? 'Needs attention' : action.tone === 'unknown' ? 'Unknown' : 'Routine'}</span></Link>)}</div></section>

    <section aria-label='Administrative metrics' className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>{metrics.map(([label, value, detail]) => <article key={label} className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'><p className='text-xs font-bold uppercase tracking-[0.12em] text-slate-500'>{label}</p><p className='mt-3 text-2xl font-semibold text-slate-900'>{value}</p><p className='mt-2 text-xs text-slate-500'>{detail}</p></article>)}</section>

    <section className='grid gap-5 xl:grid-cols-[1.1fr_0.9fr]'><article className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'><h2 className='text-lg font-semibold text-slate-900'>Organization health</h2><p className='mt-1 text-sm text-slate-600'>Signals without a connected health source remain unknown.</p><div className='mt-5 space-y-3'>{['EHR Core', 'Telehealth media', 'FHIR APIs', 'Laboratory integration', 'Notifications'].map((service) => <div key={service} className='flex items-center justify-between border-b border-slate-100 pb-3 text-sm last:border-0'><span className='font-medium text-slate-700'>{service}</span><span className='rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600'>Unknown</span></div>)}</div></article><article className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'><h2 className='text-lg font-semibold text-slate-900'>Recent administrative activity</h2><div className='mt-4 space-y-3'>{data.recentActivity.length === 0 ? <p className='rounded-lg bg-slate-50 p-4 text-sm text-slate-600'>No audit activity is available from the current read model.</p> : data.recentActivity.map((event) => <div key={event.id} className='border-b border-slate-100 pb-3 last:border-0'><p className='text-sm font-medium text-slate-800'>{event.action} {event.entityType ?? 'resource'}</p><p className='mt-1 text-xs text-slate-500'>{event.actor ?? 'System'} - {event.recorded.toLocaleString()}</p></div>)}</div><div className='mt-5 flex flex-wrap gap-2'>{[['Add user', '/admin/users'], ['Review audit events', '/admin/security'], ['Open integrations', '/admin/integrations']].map(([label, href]) => <Link key={label} href={href + query} className='rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'>{label}</Link>)}</div></article></section>
  </div>;
}
