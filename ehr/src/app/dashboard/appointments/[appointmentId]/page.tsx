import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getSchedulingSnapshot } from '@/lib/schedulingData';

export const dynamic = 'force-dynamic';

function previewQuery(values: Record<string, string | string[] | undefined>) {
  const asUser = values.asUser;
  const value = Array.isArray(asUser) ? asUser[0] : asUser;
  return value ? `?asUser=${encodeURIComponent(value)}` : values.noauth ? '?noauth=1&asUser=dev' : '';
}

export default async function AppointmentDetailPage({ params, searchParams }: { params: Promise<{ appointmentId: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const values = searchParams ? await searchParams : {};
  const asUser = Array.isArray(values.asUser) ? values.asUser[0] : values.asUser;
  const preview = process.env.NODE_ENV !== 'production' && (Boolean(values.noauth) || ['dev', 'dev-doctor'].includes(asUser || ''));
  const session = await auth().catch(() => null);
  if (!session && !preview) redirect('/login');
  const role = String(session?.user?.role || 'DOCTOR').toUpperCase();
  if (session?.user && !['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER'].includes(role)) redirect('/unauthorized');
  const { appointmentId } = await params;
  const snapshot = await getSchedulingSnapshot();
  const appointment = snapshot.appointments.find((item) => item.id === appointmentId);
  if (!appointment) redirect(`/dashboard/appointments${previewQuery(values)}`);
  return <main className="appt-page" aria-labelledby="appointment-detail-title"><div className="appt-header"><div><Link href={`/dashboard/appointments${previewQuery(values)}`} className="appt-secondary-button">Back to Appointments</Link><span className="appt-eyebrow" style={{ marginTop: '1rem' }}>Full appointment detail</span><h1 id="appointment-detail-title">{appointment.patientName}</h1><p>{appointment.appointmentType || appointment.serviceType || 'Appointment'} · {new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: snapshot.timeZone }).format(new Date(appointment.start))}</p></div><span className="appt-status appt-status.is-booked">{appointment.status}</span></div><div className="appt-detail-page-grid"><section className="appt-detail-page-card"><h2>Appointment details</h2><dl><div><dt>Date and time</dt><dd>{new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: snapshot.timeZone }).format(new Date(appointment.start))} to {new Intl.DateTimeFormat('en-US', { timeStyle: 'short', timeZone: snapshot.timeZone }).format(new Date(appointment.end))}</dd></div><div><dt>Patient</dt><dd>{appointment.patientName}{appointment.patientMrn ? ` · MRN ${appointment.patientMrn}` : ''}</dd></div><div><dt>Provider</dt><dd>{appointment.providerName}</dd></div><div><dt>Location</dt><dd>{appointment.locationName || 'Not documented'}</dd></div><div><dt>Status</dt><dd>{appointment.status}</dd></div><div><dt>Reason</dt><dd>{appointment.description || 'Not documented'}</dd></div></dl></section><aside className="appt-detail-page-card"><h2>Workflow</h2><p>Appointment records are planned visits. An Encounter is created separately when clinical care begins.</p><div className="appt-detail-page-links"><Link href={`/dashboard/appointments${previewQuery(values)}`} className="appt-primary-button">Return to worklist</Link>{appointment.patientId && <Link href={`/dashboard/messages?patientId=${encodeURIComponent(appointment.patientId)}&appointmentId=${encodeURIComponent(appointment.id)}${previewQuery(values) ? `&${previewQuery(values).slice(1)}` : ''}`} className="appt-secondary-button">Message Patient</Link>}</div></aside></div></main>;
}
