import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SCHEDULING_WORKSPACE_ROLES } from '@/lib/doctorWorkspaceAuth';
import DailyScheduleWorkspace from '@/components/schedule/DailyScheduleWorkspace';

export const revalidate = 0;

export default async function TodaySchedulePage() {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect(`/login?returnTo=${encodeURIComponent('/schedule/today')}`);
  const role = String(session.user.role || '').toUpperCase();
  if (!SCHEDULING_WORKSPACE_ROLES.has(role)) redirect('/unauthorized');
  const configuredTimeZone = process.env.DOCTOR_VIEW_TIME_ZONE || 'America/Toronto';
  let timeZone = 'America/Toronto';
  try { new Intl.DateTimeFormat('en-US', { timeZone: configuredTimeZone }).format(); timeZone = configuredTimeZone; } catch {}
  if (process.env.NODE_ENV === 'production') return <div className="daily-schedule-page"><div className="daily-schedule-production-empty"><span className="daily-schedule-eyebrow">Operating day</span><h1>Daily Schedule</h1><p>The live operating-day source is not configured for this environment.</p><span>Demo fixture data is intentionally unavailable in production.</span></div></div>;
  return <DailyScheduleWorkspace timeZone={timeZone} />;
}
