"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import {
  getAppointmentLifecycle,
  getLifecycleBadge,
  formatClinicDate,
  formatClinicTime,
  CLINIC_TIMEZONE,
  type AppointmentLifecycleResult,
} from '@/lib/appointmentLifecycle';
import { toDisplayLabel, toDisplayStatus } from '@/lib/clinicalDisplay';
import type { AppointmentRecord, AgendaItem, Patient } from '@/app/dashboard/records/mockPatients';
import { Badge, SectionCard, Button, EmptyRow, type Tone } from './appointment-detail/ui';
import {
  CalendarIcon,
  ClockIcon,
  DoctorIcon,
  PinIcon,
  NoteIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  MessageIcon,
  TargetIcon,
  SparklesIcon,
  PrintIcon,
  CopyIcon,
  SendIcon,
  PlusIcon,
  XIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarPlusIcon,
} from './appointment-detail/icons';
import CancelAppointmentDialog from './appointment-detail/CancelAppointmentDialog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findAppointment(patient: Patient, id?: string): AppointmentRecord | undefined {
  if (!id) return undefined;
  return (patient.upcoming || []).find((a) => a.id === id);
}

function minutesAgoLabel(from: Date, now: Date): string {
  const mins = Math.max(0, Math.round((now.getTime() - from.getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`;
}

function buildIcsContent(record: AppointmentRecord): string {
  const start = new Date(record.date);
  const end = record.end ? new Date(record.end) : new Date(start.getTime() + 30 * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Roshi EHR//Appointment//EN',
    'BEGIN:VEVENT',
    `UID:${record.id}@roshi-ehr`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${record.type} Appointment`,
    `LOCATION:${record.location || ''}`,
    `DESCRIPTION:Provider: ${record.doctor}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadIcs(record: AppointmentRecord) {
  const blob = new Blob([buildIcsContent(record)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `appointment-${record.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function readinessTone(pct: number): Tone {
  if (pct >= 80) return 'green';
  if (pct >= 50) return 'amber';
  return 'amber';
}

// ---------------------------------------------------------------------------
// Small presentational subcomponents (kept local — tightly coupled to page state)
// ---------------------------------------------------------------------------

function LifecycleStepper({ lifecycle, confirmed }: { lifecycle: AppointmentLifecycleResult['lifecycle']; confirmed: boolean }) {
  const steps = ['Scheduled', 'Confirmed', 'Checked In', 'In Progress', 'Completed'];
  const doneIndexByLifecycle: Record<string, number> = {
    upcoming: confirmed ? 1 : 0,
    today: confirmed ? 1 : 0,
    'checked-in': 2,
    waiting: 2,
    'in-progress': 3,
    completed: 4,
  };
  const doneIndex = doneIndexByLifecycle[lifecycle] ?? 0;

  return (
    <ol className="flex items-center w-full" aria-label="Appointment lifecycle progress">
      {steps.map((label, i) => {
        const isDone = i <= doneIndex;
        const isCurrent = i === doneIndex;
        return (
          <li key={label} className="flex-1 flex items-center last:flex-none">
            <div className="flex flex-col items-center gap-1 min-w-[64px]">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                  isDone ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-gray-300 text-gray-400'
                } ${isCurrent && !isDone ? 'ring-2 ring-teal-200' : ''}`}
                aria-hidden="true"
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span className={`text-[11px] text-center ${isDone ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-[2px] mx-1 mb-4 ${i < doneIndex ? 'bg-teal-500' : 'bg-gray-200'}`} />}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AppointmentDetailClient({
  appointment,
  patient,
}: {
  appointment: AppointmentRecord | null;
  patient: Patient;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());
  const [record, setRecord] = useState<AppointmentRecord | null>(appointment);
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());

  const [cancelOpen, setCancelOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const [agenda, setAgenda] = useState<AgendaItem[]>(record?.agenda || []);
  const [addAgendaOpen, setAddAgendaOpen] = useState(false);
  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [newAgendaOwner, setNewAgendaOwner] = useState<AgendaItem['owner']>('Clinician');
  const [newAgendaPriority, setNewAgendaPriority] = useState<AgendaItem['priority']>('Normal');

  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [sendState, setSendState] = useState<'idle' | 'sending'>('idle');
  const [instructionsSentAt, setInstructionsSentAt] = useState<string | undefined>(record?.instructionsSentAt);

  const [aiState, setAiState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    const tick = setInterval(() => setNow(new Date()), 60000);
    return () => {
      clearTimeout(t);
      clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const lifecycle = useMemo(() => {
    if (!record) return null;
    return getAppointmentLifecycle(
      { start: record.date, end: record.end, status: record.status, arrivedAt: record.arrivedAt },
      now,
    );
  }, [record, now]);

  const previousAppointment = useMemo(() => findAppointment(patient, record?.previousAppointmentId), [patient, record]);
  const nextAppointment = useMemo(() => findAppointment(patient, record?.nextAppointmentId), [patient, record]);
  const previousLifecycle = useMemo(
    () => (previousAppointment ? getAppointmentLifecycle({ start: previousAppointment.date, end: previousAppointment.end, status: previousAppointment.status }, now) : null),
    [previousAppointment, now],
  );
  const nextLifecycle = useMemo(
    () => (nextAppointment ? getAppointmentLifecycle({ start: nextAppointment.date, end: nextAppointment.end, status: nextAppointment.status }, now) : null),
    [nextAppointment, now],
  );

  const readiness = useMemo(() => {
    if (!record) return { checks: [], pct: 0 };
    const noteStarted = (record.documentation?.status || 'not-started') !== 'not-started';
    const confirmed = record.confirmationStatus === 'Confirmed';
    const checks: { id: string; label: string; done: boolean }[] = [
      { id: 'intake', label: 'Intake Complete', done: false },
      { id: 'meds', label: 'Medication Review Needed', done: false },
      { id: 'insurance', label: 'Insurance Verified', done: true },
      { id: 'note', label: noteStarted ? 'Visit Note Started' : 'Visit Note Not Started', done: noteStarted },
      { id: 'confirmed', label: 'Appointment Confirmed', done: confirmed },
    ];
    const pct = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
    return { checks, pct };
  }, [record]);

  if (loading) {
    return (
      <div aria-live="polite" aria-busy="true">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-gray-100 rounded" />
          <div className="h-16 bg-gray-100 rounded-xl" />
          <div className="h-28 bg-gray-100 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="h-40 bg-gray-100 rounded-xl" />
              <div className="h-40 bg-gray-100 rounded-xl" />
              <div className="h-40 bg-gray-100 rounded-xl" />
            </div>
            <div className="lg:col-span-4 space-y-4">
              <div className="h-32 bg-gray-100 rounded-xl" />
              <div className="h-32 bg-gray-100 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!record || !lifecycle) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
          <AlertTriangleIcon size={22} />
        </div>
        <h1 className="text-xl font-semibold text-[#121A2D]">Appointment Not Found</h1>
        <p className="mt-2 text-sm text-gray-600">We couldn&apos;t locate this appointment, or you may not have access to it.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => router.push(`/dashboard/records/${patient.id}`)}>
            Back to Schedule
          </Button>
          <Button variant="primary" onClick={() => router.refresh()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const badge = getLifecycleBadge(lifecycle);
  const startDate = lifecycle.start;
  const month = startDate.toLocaleString(undefined, { month: 'short' }).toUpperCase();
  const day = startDate.getDate();
  const year = startDate.getFullYear();

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/dashboard/records/${patient.id}`);
    }
  }

  function backLabel() {
    if (typeof document === 'undefined') return 'Back to Patient';
    const ref = document.referrer || '';
    if (/\/schedule/.test(ref)) return 'Back to Schedule';
    if (/\/appointments/.test(ref)) return 'Back to Appointments';
    return 'Back to Patient';
  }

  function touch() {
    setLastUpdated(new Date());
  }

  function openChart() {
    router.push(`/dashboard/records/${patient.id}`);
  }

  function startOrResumeEncounter() {
    router.push(`/dashboard/encounters/new?patientId=${encodeURIComponent(patient.id)}&appointmentId=${encodeURIComponent(record.id)}`);
  }

  function startVisitNote() {
    router.push(`/dashboard/records/${patient.id}/doctor-notes/new?appointmentId=${encodeURIComponent(record.id)}`);
  }

  function viewNote() {
    const noteId = record.documentation?.noteId;
    router.push(`/dashboard/records/${patient.id}/doctor-notes${noteId ? `?noteId=${encodeURIComponent(noteId)}` : ''}`);
  }

  function messagePatient() {
    const draft = `Regarding your ${record.type.toLowerCase()} appointment on ${formatClinicDate(startDate)}: `;
    router.push(`/dashboard/records/${patient.id}/messages?draft=${encodeURIComponent(draft)}`);
  }

  function rescheduleAppointment() {
    router.push(`/dashboard/appointments/book?patientId=${encodeURIComponent(patient.id)}&rescheduleId=${encodeURIComponent(record.id)}`);
  }

  function createFollowUp() {
    const title = `Follow-up: ${record.type} — ${patient.name}`;
    router.push(`/dashboard/records/${patient.id}/tasks?new=1&title=${encodeURIComponent(title)}`);
  }

  function markStatus(nextStatus: string, prompt: string) {
    if (!window.confirm(prompt)) return;
    setRecord((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    touch();
  }

  async function handleCancelConfirm(payload: { reason: string; notifyPatient: boolean }) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRecord((prev) =>
      prev
        ? {
            ...prev,
            status: 'Cancelled',
            cancelledAt: new Date().toISOString(),
            cancelledBy: 'You',
            cancelReason: payload.reason || undefined,
          }
        : prev,
    );
    touch();
    setCancelOpen(false);
  }

  const instructionItems: string[] = [
    'Bring valid ID or health card',
    'Arrive 10 minutes early',
    'Bring a list of current medications with doses',
  ];
  if (record.prep) instructionItems.push(record.prep);

  async function copyInstructions() {
    try {
      await navigator.clipboard.writeText(instructionItems.map((i) => `• ${i}`).join('\n'));
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  }

  function printInstructions() {
    const w = window.open('', '_blank', 'width=480,height=640');
    if (!w) return;
    w.document.write(
      `<html><head><title>Preparation Instructions</title><style>body{font-family:sans-serif;padding:24px;color:#121A2D}h1{font-size:18px}li{margin-bottom:8px}</style></head><body><h1>Preparation Instructions</h1><p>${patient.name} · ${record.type} · ${formatClinicDate(startDate)}</p><ul>${instructionItems.map((i) => `<li>${i}</li>`).join('')}</ul></body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }

  async function sendInstructions() {
    setSendState('sending');
    await new Promise((resolve) => setTimeout(resolve, 600));
    const nowIso = new Date().toISOString();
    setInstructionsSentAt(nowIso);
    setSendState('idle');
  }

  function addAgendaItem() {
    if (!newAgendaTitle.trim()) return;
    setAgenda((prev) => [
      ...prev,
      {
        id: `ag-${Date.now()}`,
        title: newAgendaTitle.trim(),
        source: 'Clinician',
        owner: newAgendaOwner,
        status: 'not-addressed',
        priority: newAgendaPriority,
      },
    ]);
    setNewAgendaTitle('');
    setNewAgendaOwner('Clinician');
    setNewAgendaPriority('Normal');
    setAddAgendaOpen(false);
  }

  function moveAgenda(id: string, dir: -1 | 1) {
    setAgenda((prev) => {
      const idx = prev.findIndex((a) => a.id === id);
      const swapWith = idx + dir;
      if (idx < 0 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }

  function cycleAgendaStatus(id: string) {
    setAgenda((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const order: AgendaItem['status'][] = ['not-addressed', 'addressed', 'follow-up-needed'];
        const next = order[(order.indexOf(a.status) + 1) % order.length];
        return { ...a, status: next };
      }),
    );
  }

  function generateAiSummary() {
    setAiState('loading');
    try {
      setTimeout(() => setAiState('ready'), 800);
    } catch {
      setAiState('error');
    }
  }

  const concernLabels = (patient.currentConcerns || []).map((c) => ({ label: toDisplayLabel(c), status: toDisplayStatus(c) }));
  const conditionLabels =
    patient.conditionDetails && patient.conditionDetails.length > 0
      ? patient.conditionDetails.map((c) => ({ label: c.name, status: c.status }))
      : (patient.conditions || []).map((c) => ({ label: c, status: undefined }));
  const openFollowUps = (record.followUp || []).filter((f) => f.status === 'open');

  const isEditableLifecycle = ['upcoming', 'today', 'checked-in', 'waiting'].includes(lifecycle.lifecycle);
  const showAgendaAndDocs = !['cancelled', 'no-show'].includes(lifecycle.lifecycle);

  return (
    <div>
      {/* ================= Header ================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 bg-white border border-[#DDE7F0] text-teal-700 px-3 py-2 rounded-md shadow-sm hover:shadow-md hover:bg-[#F3F8FB] transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6L9 12L15 18" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-medium">{backLabel()}</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-[#121A2D]">Appointment Detail</h1>
        </div>

        <div className="flex items-center gap-3">
          <Badge tone={badge.tone} dot>
            {badge.label}
          </Badge>
          <div className="text-xs text-gray-400">Updated {minutesAgoLabel(lastUpdated, now)}</div>
        </div>
      </div>

      {/* ================= Patient banner (sticky, collapses on scroll) ================= */}
      <div className="mb-6">
        <PatientProfileHeader patient={patient} />
      </div>

      {/* ================= Reconciliation warning ================= */}
      {lifecycle.needsReconciliation && (
        <div className="mb-6 rounded-[14px] border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangleIcon size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-amber-900">Appointment status needs reconciliation</div>
              <p className="text-sm text-amber-800 mt-1">
                This appointment&apos;s scheduled time ({formatClinicDate(startDate)}) has passed, but it is still marked
                &ldquo;{record.status}&rdquo;. Update the status to keep the schedule accurate.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => markStatus('Completed', 'Mark this appointment as Completed?')}>
                  Mark Completed
                </Button>
                <Button size="sm" variant="secondary" onClick={() => markStatus('No Show', 'Mark this appointment as No Show?')}>
                  Mark No Show
                </Button>
                <Button size="sm" variant="secondary" icon={<CalendarIcon size={14} />} onClick={startOrResumeEncounter}>
                  Link Encounter
                </Button>
                <Button size="sm" variant="ghost" onClick={rescheduleAppointment}>
                  Reschedule Follow-Up
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= Cancelled / No-show banners ================= */}
      {lifecycle.lifecycle === 'cancelled' && (
        <div className="mb-6 rounded-[14px] border border-gray-200 bg-gray-50 p-5 flex items-start gap-3">
          <XIcon size={18} className="text-gray-500 mt-0.5" />
          <div>
            <div className="font-semibold text-gray-800">Cancelled</div>
            <div className="text-sm text-gray-600 mt-1">
              {record.cancelledAt ? `Cancelled ${formatClinicDate(new Date(record.cancelledAt))}` : 'Cancelled'}
              {record.cancelledBy ? ` by ${record.cancelledBy}` : ''}
              {record.cancelReason ? ` — ${record.cancelReason}` : ''}
            </div>
          </div>
        </div>
      )}
      {lifecycle.lifecycle === 'no-show' && (
        <div className="mb-6 rounded-[14px] border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
          <AlertTriangleIcon size={18} className="text-amber-600 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-900">No Show</div>
            <div className="text-sm text-amber-800 mt-1">Patient did not arrive for this appointment.</div>
          </div>
        </div>
      )}

      {/* ================= Appointment Hero ================= */}
      <div className="mb-6 bg-white rounded-[14px] border border-[#E4EAF0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-b from-sky-50 to-teal-50 border border-teal-100 flex flex-col items-center justify-center text-center">
            <div className="text-[11px] font-semibold tracking-wide text-teal-700">{month}</div>
            <div className="text-2xl font-extrabold text-[#121A2D] leading-none mt-0.5">{day}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">{year}</div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-[#121A2D]">{record.type} Appointment</div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                <ClockIcon size={14} className="text-gray-400" />
                {formatClinicTime(lifecycle.start)} – {formatClinicTime(lifecycle.end)} · {Math.round((lifecycle.end.getTime() - lifecycle.start.getTime()) / 60000)} min
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-700">
                <DoctorIcon size={14} className="text-gray-400" />
                {record.doctor}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                <PinIcon size={14} className="text-gray-400" />
                {record.location || 'Location not set'}
                {record.room ? ` · Room ${record.room}` : ''}
              </div>
            </div>
            <div className="text-xs text-gray-400 text-right">{lifecycle.relativeLabel}</div>
          </div>
        </div>

        {/* Primary lifecycle action */}
        <div className="flex-shrink-0 w-full md:w-auto">
          {lifecycle.lifecycle === 'upcoming' && (
            <Button variant="primary" className="w-full md:w-auto" onClick={() => document.getElementById('prep-instructions')?.scrollIntoView({ behavior: 'smooth' })}>
              Prepare for Visit
            </Button>
          )}
          {(lifecycle.lifecycle === 'today' || lifecycle.lifecycle === 'checked-in' || lifecycle.lifecycle === 'waiting') && (
            <Button variant="primary" className="w-full md:w-auto" onClick={startOrResumeEncounter}>
              Start Encounter
            </Button>
          )}
          {lifecycle.lifecycle === 'in-progress' && (
            <Button variant="primary" className="w-full md:w-auto" onClick={startOrResumeEncounter}>
              Resume Encounter
            </Button>
          )}
          {lifecycle.lifecycle === 'completed' && (
            <Button variant="secondary" className="w-full md:w-auto" onClick={startOrResumeEncounter}>
              View Encounter
            </Button>
          )}
          {(lifecycle.lifecycle === 'cancelled' || lifecycle.lifecycle === 'no-show') && (
            <Button variant="primary" className="w-full md:w-auto" onClick={rescheduleAppointment}>
              Reschedule
            </Button>
          )}
        </div>
      </div>

      {/* ================= Lifecycle stepper ================= */}
      {!['cancelled', 'no-show', 'past-unresolved'].includes(lifecycle.lifecycle) && (
        <div className="mb-6 bg-white rounded-[14px] border border-[#E4EAF0] p-5">
          <LifecycleStepper lifecycle={lifecycle.lifecycle} confirmed={record.confirmationStatus === 'Confirmed'} />
        </div>
      )}

      {/* ================= Waiting context ================= */}
      {lifecycle.lifecycle === 'waiting' && (
        <div className={`mb-6 rounded-[14px] border p-4 flex items-center gap-3 ${lifecycle.waitingExceedsThreshold ? 'bg-amber-50 border-amber-200' : 'bg-teal-50 border-teal-200'}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${lifecycle.waitingExceedsThreshold ? 'bg-amber-500' : 'bg-teal-500'}`} aria-hidden="true" />
          <div className="text-sm">
            <span className="font-semibold">Waiting</span>
            {record.arrivedAt && <span className="text-gray-600"> · Arrived {formatClinicTime(new Date(record.arrivedAt))}</span>}
            {lifecycle.waitingMinutes != null && <span className="text-gray-600"> · Waiting {lifecycle.waitingMinutes} min</span>}
            {record.room && <span className="text-gray-600"> · Room {record.room}</span>}
          </div>
        </div>
      )}

      {/* ================= Main two-column layout ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* -------- Left / main column -------- */}
        <div className="lg:col-span-8 space-y-5">
          {/* Visit Documentation — most prominent physician workflow */}
          {showAgendaAndDocs && (
            <SectionCard title="Visit Documentation" icon={<NoteIcon size={16} />} emphasis>
              {(!record.documentation || record.documentation.status === 'not-started') && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="font-semibold text-[#121A2D]">Visit Note Not Started</div>
                    <div className="text-sm text-gray-500 mt-0.5">Start documenting once the encounter begins.</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" onClick={startVisitNote}>
                      Start Visit Note
                    </Button>
                  </div>
                </div>
              )}
              {record.documentation?.status === 'draft' && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone="amber">Draft</Badge>
                      <span className="font-semibold text-[#121A2D]">{record.documentation.author || record.doctor}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {record.documentation.lastSavedAt ? `Last saved ${minutesAgoLabel(new Date(record.documentation.lastSavedAt), now)}` : 'Draft in progress'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={viewNote}>
                      Preview
                    </Button>
                    <Button variant="primary" onClick={startVisitNote}>
                      Continue Note
                    </Button>
                  </div>
                </div>
              )}
              {record.documentation?.status === 'signed' && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone="green" dot>
                        Signed
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Signed by {record.documentation.author || record.doctor}
                      {record.documentation.signedAt ? ` · ${formatClinicDate(new Date(record.documentation.signedAt))}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" icon={<PrintIcon size={14} />} onClick={() => window.print()}>
                      Print
                    </Button>
                    <Button variant="primary" onClick={viewNote}>
                      View Note
                    </Button>
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* Visit Agenda */}
          {showAgendaAndDocs && (
            <SectionCard
              title="Visit Agenda"
              icon={<TargetIcon size={16} />}
              headerRight={
                isEditableLifecycle && (
                  <Button size="sm" variant="ghost" icon={<PlusIcon size={13} />} onClick={() => setAddAgendaOpen((v) => !v)}>
                    Add Agenda Item
                  </Button>
                )
              }
            >
              {addAgendaOpen && (
                <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-2">
                  <input
                    aria-label="Agenda item title"
                    value={newAgendaTitle}
                    onChange={(e) => setNewAgendaTitle(e.target.value)}
                    placeholder="Agenda item"
                    className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Owner"
                      value={newAgendaOwner}
                      onChange={(e) => setNewAgendaOwner(e.target.value as AgendaItem['owner'])}
                      className="rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                    >
                      <option>Clinician</option>
                      <option>Patient</option>
                      <option>Shared</option>
                    </select>
                    <select
                      aria-label="Priority"
                      value={newAgendaPriority}
                      onChange={(e) => setNewAgendaPriority(e.target.value as AgendaItem['priority'])}
                      className="rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                    >
                      <option>Normal</option>
                      <option>Important</option>
                    </select>
                    <div className="flex-1" />
                    <Button size="sm" variant="ghost" onClick={() => setAddAgendaOpen(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="primary" onClick={addAgendaItem}>
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {agenda.length === 0 ? (
                <EmptyRow>No agenda items yet.</EmptyRow>
              ) : (
                <ul className="space-y-2">
                  {agenda.map((item, idx) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{item.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {item.source} · {item.owner}
                          {item.priority === 'Important' ? ' · Important' : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isEditableLifecycle && (
                          <button
                            type="button"
                            onClick={() => cycleAgendaStatus(item.id)}
                            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 rounded"
                          >
                            {item.status === 'addressed' && <Badge tone="green">Addressed</Badge>}
                            {item.status === 'follow-up-needed' && <Badge tone="amber">Follow-Up Needed</Badge>}
                            {item.status === 'not-addressed' && <Badge tone="neutral">Not Addressed</Badge>}
                          </button>
                        )}
                        {!isEditableLifecycle && (
                          <>
                            {item.status === 'addressed' && <Badge tone="green">Addressed</Badge>}
                            {item.status === 'follow-up-needed' && <Badge tone="amber">Follow-Up Needed</Badge>}
                            {item.status === 'not-addressed' && <Badge tone="neutral">Not Addressed</Badge>}
                          </>
                        )}
                        {isEditableLifecycle && (
                          <div className="flex flex-col">
                            <button aria-label="Move up" onClick={() => moveAgenda(item.id, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                              <ArrowUpIcon size={12} />
                            </button>
                            <button aria-label="Move down" onClick={() => moveAgenda(item.id, 1)} disabled={idx === agenda.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                              <ArrowDownIcon size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}

          {/* Appointment Details */}
          <SectionCard title="Appointment Details" icon={<CalendarIcon size={16} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {record.type && (
                <div>
                  <div className="text-xs text-gray-400">Reason for visit</div>
                  <div className="font-medium text-gray-800">{record.type}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-400">Visit modality</div>
                <div className="font-medium text-gray-800">{record.modality || 'Office Visit'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Provider</div>
                <div className="font-medium text-gray-800">{record.doctor}</div>
              </div>
              {record.department && (
                <div>
                  <div className="text-xs text-gray-400">Department</div>
                  <div className="font-medium text-gray-800">{record.department}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-400">Date</div>
                <div className="font-medium text-gray-800">{formatClinicDate(lifecycle.start)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Time ({CLINIC_TIMEZONE.replace('_', ' ')})</div>
                <div className="font-medium text-gray-800">
                  {formatClinicTime(lifecycle.start)} – {formatClinicTime(lifecycle.end)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Location</div>
                <div className="font-medium text-gray-800">
                  {record.location || '—'}
                  {record.room ? ` · Room ${record.room}` : ''}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Status</div>
                <div className="mt-0.5">
                  <Badge tone={badge.tone}>{record.status || 'Scheduled'}</Badge>
                </div>
              </div>
              {record.createdAt && (
                <div>
                  <div className="text-xs text-gray-400">Appointment created</div>
                  <div className="font-medium text-gray-800">{formatClinicDate(new Date(record.createdAt))}</div>
                </div>
              )}
              {record.bookedBy && (
                <div>
                  <div className="text-xs text-gray-400">Booked by</div>
                  <div className="font-medium text-gray-800">{record.bookedBy}</div>
                </div>
              )}
              {record.confirmationStatus && (
                <div>
                  <div className="text-xs text-gray-400">Patient confirmation</div>
                  <div className="font-medium text-gray-800">{record.confirmationStatus}</div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Preparation Instructions */}
          <SectionCard
            id="prep-instructions"
            title="Preparation Instructions"
            icon={<CheckCircleIcon size={16} />}
            headerRight={<span className="text-xs text-gray-400">Patient-facing</span>}
          >
            <ul className="space-y-2.5">
              {instructionItems.map((text, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircleIcon size={15} className="text-teal-500 mt-0.5 flex-shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" icon={<CopyIcon size={13} />} onClick={copyInstructions}>
                {copyState === 'copied' ? 'Copied!' : copyState === 'error' ? 'Copy failed' : 'Copy Instructions'}
              </Button>
              <Button size="sm" variant="secondary" icon={<SendIcon size={13} />} onClick={sendInstructions} disabled={sendState === 'sending'}>
                {sendState === 'sending' ? 'Sending…' : 'Send to Patient'}
              </Button>
              <Button size="sm" variant="secondary" icon={<PrintIcon size={13} />} onClick={printInstructions}>
                Print
              </Button>
            </div>
            {instructionsSentAt && (
              <div className="mt-3 text-xs text-gray-500">
                Sent to patient · {formatClinicDate(new Date(instructionsSentAt))} {formatClinicTime(new Date(instructionsSentAt))} · Channel: Portal
              </div>
            )}
          </SectionCard>

          {/* Related Clinical Context */}
          <SectionCard title="Related Clinical Context" icon={<NoteIcon size={16} />}>
            <div className="space-y-4 text-sm">
              {concernLabels.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1.5">Health Concerns</div>
                  <a href={`/dashboard/records/${patient.id}/concerns`} className="block space-y-1.5 hover:opacity-80">
                    {concernLabels.map((c, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-gray-800">{c.label}</span>
                        {c.status && <Badge tone={c.status.toLowerCase() === 'active' ? 'teal' : 'neutral'}>{c.status}</Badge>}
                      </div>
                    ))}
                  </a>
                </div>
              )}
              {conditionLabels.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1.5">Key Conditions</div>
                  <a href={`/dashboard/records/${patient.id}/conditions`} className="block space-y-1.5 hover:opacity-80">
                    {conditionLabels.map((c, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-gray-800">{c.label}</span>
                        {c.status && <Badge tone="neutral">{c.status}</Badge>}
                      </div>
                    ))}
                  </a>
                </div>
              )}
              {(patient.medications || []).length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1.5">Current Medications</div>
                  <a href={`/dashboard/records/${patient.id}/medications`} className="block space-y-1.5 hover:opacity-80">
                    {(patient.medications || []).map((m) => (
                      <div key={m.name} className="flex items-center justify-between">
                        <span className="text-gray-800">{m.name}</span>
                        <span className="text-xs text-gray-500">{m.dose}</span>
                      </div>
                    ))}
                  </a>
                </div>
              )}
              {openFollowUps.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1.5">Open Follow-Up Tasks</div>
                  <a href={`/dashboard/records/${patient.id}/tasks`} className="block space-y-1.5 hover:opacity-80">
                    {openFollowUps.map((f) => (
                      <div key={f.id} className="flex items-center justify-between">
                        <span className="text-gray-800">{f.title}</span>
                        {f.dueDate && <span className="text-xs text-gray-500">Due {f.dueDate}</span>}
                      </div>
                    ))}
                  </a>
                </div>
              )}
              {concernLabels.length === 0 && conditionLabels.length === 0 && (patient.medications || []).length === 0 && (
                <EmptyRow>No related clinical context on file.</EmptyRow>
              )}
            </div>
          </SectionCard>

          {/* Continuity: previous / next appointment + follow-up */}
          <SectionCard title="Follow-Up &amp; Continuity" icon={<CalendarPlusIcon size={16} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-100 p-3">
                <div className="text-xs text-gray-400 mb-1">Previous Visit</div>
                {previousAppointment && previousLifecycle ? (
                  <>
                    <div className="text-sm font-medium text-gray-800">{formatClinicDate(previousLifecycle.start)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {previousAppointment.type} · {previousAppointment.doctor}
                    </div>
                    {previousAppointment.documentation?.status === 'signed' && <Badge tone="green" className="mt-2">Note Signed</Badge>}
                    <div className="mt-2">
                      <Button size="sm" variant="secondary" onClick={() => router.push(`/dashboard/records/${patient.id}/appointments/${previousAppointment.id}`)}>
                        View Appointment
                      </Button>
                    </div>
                  </>
                ) : (
                  <EmptyRow>No previous visit on file.</EmptyRow>
                )}
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <div className="text-xs text-gray-400 mb-1">Next Appointment</div>
                {nextAppointment && nextLifecycle ? (
                  <>
                    <div className="text-sm font-medium text-gray-800">{formatClinicDate(nextLifecycle.start)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatClinicTime(nextLifecycle.start)} · {nextAppointment.type}
                    </div>
                    <Badge tone={getLifecycleBadge(nextLifecycle).tone} className="mt-2">
                      {getLifecycleBadge(nextLifecycle).label}
                    </Badge>
                    <div className="mt-2">
                      <Button size="sm" variant="secondary" onClick={() => router.push(`/dashboard/records/${patient.id}/appointments/${nextAppointment.id}`)}>
                        View Appointment
                      </Button>
                    </div>
                  </>
                ) : (
                  <EmptyRow>Not scheduled.</EmptyRow>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {openFollowUps.length > 0 ? `${openFollowUps.length} open follow-up item(s)` : 'No open follow-up items'}
              </div>
              <Button size="sm" variant="secondary" icon={<PlusIcon size={13} />} onClick={createFollowUp}>
                Create Follow-Up
              </Button>
            </div>
          </SectionCard>
        </div>

        {/* -------- Right / workflow rail -------- */}
        <div className="lg:col-span-4 space-y-5">
          {/* Appointment Readiness */}
          <SectionCard title="Appointment Readiness" icon={<TargetIcon size={16} />}>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-extrabold text-[#121A2D]">{readiness.pct}%</div>
              <Badge tone={readinessTone(readiness.pct)}>{readiness.pct >= 80 ? 'Ready' : 'Needs Attention'}</Badge>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full ${readiness.pct >= 80 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                style={{ width: `${readiness.pct}%` }}
                role="progressbar"
                aria-valuenow={readiness.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Appointment readiness"
              />
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {readiness.checks.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span className={c.done ? 'text-emerald-500' : 'text-amber-500'} aria-hidden="true">
                    {c.done ? '✓' : '⚠'}
                  </span>
                  <span className={c.done ? 'text-gray-700' : 'text-gray-600'}>{c.label}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Before You Arrive */}
          <SectionCard title="Before You Arrive" icon={<CheckCircleIcon size={16} />}>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] flex-shrink-0">!</span>
                  <div>
                    <div className="font-medium text-gray-800">Complete Intake Form</div>
                    <div className="text-xs text-gray-400">Not Started</div>
                  </div>
                </div>
                <Button size="sm" variant="ghost">Start Form</Button>
              </li>
              <li className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] flex-shrink-0">!</span>
                  <div>
                    <div className="font-medium text-gray-800">Medication Review</div>
                    <div className="text-xs text-gray-400">2 medications need review</div>
                  </div>
                </div>
                <Button size="sm" variant="ghost">Review</Button>
              </li>
              <li className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] flex-shrink-0">✓</span>
                  <div>
                    <div className="font-medium text-gray-800">Insurance</div>
                    <div className="text-xs text-gray-400">Verified</div>
                  </div>
                </div>
              </li>
              <li className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${record.confirmationStatus === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {record.confirmationStatus === 'Confirmed' ? '✓' : '!'}
                  </span>
                  <div>
                    <div className="font-medium text-gray-800">Appointment Confirmation</div>
                    <div className="text-xs text-gray-400">{record.confirmationStatus || 'Unconfirmed'}</div>
                  </div>
                </div>
              </li>
            </ul>
          </SectionCard>

          {/* Clinician Readiness */}
          <SectionCard title="Clinician Readiness" icon={<DoctorIcon size={16} />}>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-gray-500">Visit agenda</span>
                <span className="font-medium text-gray-800">{agenda.length} item{agenda.length === 1 ? '' : 's'}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-500">Visit note</span>
                <span className="font-medium text-gray-800 capitalize">{(record.documentation?.status || 'not-started').replace('-', ' ')}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-500">Follow-up from previous visit</span>
                <span className="font-medium text-gray-800">{openFollowUps.length} open</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-500">Patient confirmed</span>
                <span className="font-medium text-gray-800">{record.confirmationStatus === 'Confirmed' ? 'Yes' : 'No'}</span>
              </li>
            </ul>
          </SectionCard>

          {/* Quick Actions */}
          <SectionCard title="Quick Actions" icon={<TargetIcon size={16} />}>
            <div className="flex flex-col gap-2">
              {lifecycle.lifecycle === 'completed' && (
                <>
                  <Button variant="secondary" onClick={viewNote}>View / Complete Note</Button>
                  <Button variant="secondary" icon={<PlusIcon size={13} />} onClick={createFollowUp}>Create Follow-Up</Button>
                </>
              )}
              <Button variant="secondary" icon={<MessageIcon size={13} />} onClick={messagePatient}>Message Patient</Button>
              {lifecycle.lifecycle !== 'completed' && lifecycle.lifecycle !== 'cancelled' && lifecycle.lifecycle !== 'no-show' && (
                <Button variant="secondary" onClick={openChart}>Open Chart</Button>
              )}

              <div className="relative pt-1" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={moreOpen}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-[#DDE7F0] bg-white px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  More
                </button>
                {moreOpen && (
                  <div role="menu" className="absolute left-0 right-0 mt-1 rounded-md bg-white border border-gray-200 shadow-lg py-1 z-30">
                    <button role="menuitem" onClick={() => { setMoreOpen(false); rescheduleAppointment(); }} className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Reschedule
                    </button>
                    <button role="menuitem" onClick={() => { setMoreOpen(false); downloadIcs(record); }} className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Add to Calendar
                    </button>
                    {!['completed', 'cancelled', 'no-show', 'in-progress'].includes(lifecycle.lifecycle) && (
                      <button role="menuitem" onClick={() => { setMoreOpen(false); setCancelOpen(true); }} className="w-full text-left px-3.5 py-2 text-sm text-red-600 hover:bg-red-50">
                        Cancel Appointment
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* AI Appointment Assistant */}
          <SectionCard
            title="AI Appointment Assistant"
            icon={<SparklesIcon size={16} className="text-violet-500" />}
            headerRight={<span className="text-[11px] text-violet-500 font-medium">Clinical review required</span>}
            className="!border-violet-100"
          >
            {aiState === 'idle' && (
              <>
                <p className="text-sm text-gray-500">Generate a concise, source-linked prep summary from this appointment&apos;s existing chart context.</p>
                <Button variant="ai" className="mt-3" icon={<SparklesIcon size={13} />} onClick={generateAiSummary}>
                  Generate Visit Prep Summary
                </Button>
              </>
            )}
            {aiState === 'loading' && <div className="animate-pulse h-16 bg-violet-50 rounded-md" />}
            {aiState === 'error' && (
              <div>
                <p className="text-sm text-red-600">AI assistance unavailable.</p>
                <Button variant="secondary" className="mt-2" onClick={generateAiSummary}>Try Again</Button>
              </div>
            )}
            {aiState === 'ready' && (
              <div className="text-sm space-y-3">
                <div>
                  <div className="text-xs font-semibold text-gray-500">Why patient is here</div>
                  <div className="text-gray-800">{record.type} — {agenda.map((a) => a.title).join('; ') || 'No agenda set'}</div>
                </div>
                {concernLabels.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Relevant active concerns</div>
                    <div className="text-gray-800">{concernLabels.map((c) => c.label).join(', ')}</div>
                    <div className="text-[11px] text-gray-400">Source: Health Concerns</div>
                  </div>
                )}
                {previousAppointment && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Previous visit follow-up</div>
                    <div className="text-gray-800">
                      {openFollowUps.length > 0 ? `${openFollowUps.length} open item(s) since ${formatClinicDate(previousLifecycle!.start)}` : 'No open items'}
                    </div>
                  </div>
                )}
                {(patient.medications || []).length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Current medications</div>
                    <div className="text-gray-800">{(patient.medications || []).map((m) => m.name).join(', ')}</div>
                    <div className="text-[11px] text-gray-400">Source: Medications</div>
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-gray-500">Documentation status</div>
                  <div className="text-gray-800 capitalize">{(record.documentation?.status || 'not-started').replace('-', ' ')}</div>
                </div>
              </div>
            )}
            <p className="mt-3 text-[11px] text-gray-400">AI is support only and does not replace clinician judgment.</p>
          </SectionCard>

          {/* Appointment History (operational, collapsible) */}
          <details className="bg-white rounded-[14px] border border-[#E4EAF0] p-5 group">
            <summary className="text-[15px] font-semibold text-[#121A2D] cursor-pointer select-none">Appointment History</summary>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              {record.createdAt && <li>Created {formatClinicDate(new Date(record.createdAt))}{record.bookedBy ? ` by ${record.bookedBy}` : ''}</li>}
              {record.confirmationStatus && <li>{record.confirmationStatus} by patient</li>}
              {record.arrivedAt && <li>Checked in {formatClinicTime(new Date(record.arrivedAt))}</li>}
              {record.cancelledAt && <li>Cancelled {formatClinicDate(new Date(record.cancelledAt))}{record.cancelledBy ? ` by ${record.cancelledBy}` : ''}</li>}
              {!record.createdAt && !record.cancelledAt && <li className="italic text-gray-400">No history recorded.</li>}
            </ul>
          </details>
        </div>
      </div>

      <CancelAppointmentDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        patientName={patient.name}
        dateLabel={formatClinicDate(lifecycle.start)}
        timeLabel={formatClinicTime(lifecycle.start)}
        provider={record.doctor}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}
