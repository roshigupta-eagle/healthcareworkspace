import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getSchedulingSnapshot, readSchedulingResource } from '@/lib/schedulingData';

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function nameOf(patient: Record<string, unknown>) {
  const name = Array.isArray(patient.name) ? patient.name[0] as Record<string, unknown> | undefined : undefined;
  const given = Array.isArray(name?.given) ? name.given.filter((value): value is string => typeof value === 'string') : [];
  return [...given, text(name?.family)].filter((value): value is string => Boolean(value)).join(' ') || 'Patient name unavailable';
}

function previewQuery(values: Record<string, string | string[] | undefined>) {
  const asUser = values.asUser;
  const value = Array.isArray(asUser) ? asUser[0] : asUser;
  return value ? `?asUser=${encodeURIComponent(value)}` : values.noauth ? '?noauth=1&asUser=dev' : '';
}

export default async function FhirPatientRecordPage({ params, searchParams }: { params: Promise<{ patientId: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const values = searchParams ? await searchParams : {};
  const asUser = Array.isArray(values.asUser) ? values.asUser[0] : values.asUser;
  const preview = process.env.NODE_ENV !== 'production' && (Boolean(values.noauth) || ['dev', 'dev-doctor'].includes(asUser || ''));
  const session = await auth().catch(() => null);
  if (!session && !preview) redirect('/login');
  const role = String(session?.user?.role || 'DEV').toUpperCase();
  if (session?.user && !['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER', 'DEV'].includes(role)) redirect('/unauthorized');
  const { patientId } = await params;
  const patient = await readSchedulingResource('Patient', patientId);
  if (!patient) redirect(`/dashboard/appointments${previewQuery(values)}`);
  const snapshot = await getSchedulingSnapshot();
  const appointments = snapshot.appointments.filter((appointment) => appointment.patientId === patientId).sort((left, right) => Date.parse(right.start) - Date.parse(left.start));
  const name = nameOf(patient);
  const dob = text(patient.birthDate) || 'Not documented';
  const gender = text(patient.gender) || 'Not documented';
  const active = patient.active !== false;
  const backHref = `/dashboard/appointments${previewQuery(values)}`;
  return <main className="doctor-view-workspace" aria-labelledby="fhir-patient-title"><nav aria-label="Breadcrumb" className="mb-5"><Link href={backHref} className="doctor-view-text-button">Back to Appointments</Link></nav><header className="doctor-view-header"><div><div className="doctor-view-eyebrow">FHIR Patient record</div><h1 id="fhir-patient-title" className="mt-2 text-3xl font-black text-slate-950">{name}</h1><p className="mt-2 text-sm text-slate-600">{gender} · DOB {dob} · Patient ID {patientId}</p></div><span className="doctor-view-badge border-emerald-200 bg-emerald-50 text-emerald-800">{active ? 'Active' : 'Inactive'}</span></header><div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.65fr)]"><section className="doctor-view-surface overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><div className="doctor-view-eyebrow text-blue-700">Appointment history</div><h2 className="mt-1 text-xl font-black text-slate-950">Scheduled visits</h2></div>{appointments.length ? <div className="divide-y divide-slate-100">{appointments.map((appointment) => <div className="p-5" key={appointment.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-950">{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: snapshot.timeZone }).format(new Date(appointment.start))}</h3><p className="mt-1 text-sm text-slate-700">{appointment.description || appointment.appointmentType || 'Appointment'}</p><p className="mt-1 text-xs text-slate-500">{appointment.providerName}{appointment.locationName ? ` · ${appointment.locationName}` : ''}</p></div><span className="doctor-view-badge border-blue-200 bg-blue-50 text-blue-800">{appointment.status}</span></div></div>)}</div> : <div className="p-8 text-sm text-slate-600">No appointments are linked to this patient in the live source.</div>}</section><aside className="doctor-view-surface h-fit p-5"><div className="doctor-view-eyebrow text-teal-700">Record navigation</div><h2 className="mt-1 text-lg font-black text-slate-950">Continue clinical work</h2><p className="mt-2 text-sm leading-6 text-slate-600">This view is the exact FHIR patient entry point from the appointment workflow. Detailed clinical resources remain in their authorized source workspaces.</p><div className="mt-5 flex flex-wrap gap-2"><Link href={backHref} className="doctor-view-secondary-button">Return to schedule</Link></div></aside></div></main>;
}
