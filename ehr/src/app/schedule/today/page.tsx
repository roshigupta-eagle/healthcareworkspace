import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CLINICAL_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import DailyScheduleWorkspace from '@/components/schedule/DailyScheduleWorkspace';

export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TodaySchedulePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const preview = process.env.NODE_ENV !== 'production' && (Boolean(params.noauth) || ['dev', 'dev-doctor'].includes(firstValue(params.asUser) || ''));
  const session = await auth().catch(() => null);
  if (!session && !preview) redirect(`/login?returnTo=${encodeURIComponent('/schedule/today')}`);
  const role = String(session?.user?.role || 'DEV').toUpperCase();
  if (session?.user && !CLINICAL_WORKSPACE_ROLES.has(role)) redirect('/unauthorized');
  const configuredTimeZone = process.env.DOCTOR_VIEW_TIME_ZONE || 'America/Toronto';
  let timeZone = 'America/Toronto';
  try { new Intl.DateTimeFormat('en-US', { timeZone: configuredTimeZone }).format(); timeZone = configuredTimeZone; } catch {}
  if (process.env.NODE_ENV === 'production') return <div className="daily-schedule-page"><div className="daily-schedule-production-empty"><span className="daily-schedule-eyebrow">Operating day</span><h1>Daily Schedule</h1><p>The live operating-day source is not configured for this environment.</p><span>Demo fixture data is intentionally unavailable in production.</span></div></div>;
  return <DailyScheduleWorkspace timeZone={timeZone} />;
}
