"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  dailyScheduleRows,
  totalProcedureCount,
  PASTELS,
  SCHEDULE_START_HOUR,
  SCHEDULE_END_HOUR,
  type FixtureEvent,
  type FixtureRow,
} from '@/scheduling/fixtures/dailyScheduleFixture';

const LEFT_COL_WIDTH = 152;
const TIME_HEADER_HEIGHT = 36;
const ROW_HEIGHT = 72;
const TIMELINE_MIN_WIDTH = 760;
const TOTAL_MINUTES = (SCHEDULE_END_HOUR - SCHEDULE_START_HOUR) * 60;
const HOUR_MARKS = Array.from({ length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1 }, (_, i) => SCHEDULE_START_HOUR + i);

function pctForTime(hour: number, minute: number) {
  const mins = (hour - SCHEDULE_START_HOUR) * 60 + minute;
  return Math.min(100, Math.max(0, (mins / TOTAL_MINUTES) * 100));
}

function formatHourLabel(h: number) {
  return `${h}:00`;
}

function formatClock(hour: number, minute: number) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${minute.toString().padStart(2, '0')} ${period}`;
}

function formatDateLong(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#B91C1C" />
      <path d="M8 4.2V8l2.6 1.5" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" aria-hidden="true">
      <path d="M12.5 4.5L7 10l5.5 5.5" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScheduleTimeHeader() {
  return (
    <div className="flex border-b border-slate-100" style={{ height: TIME_HEADER_HEIGHT }}>
      <div
        className="shrink-0 sticky left-0 z-10 bg-white flex items-center px-4 border-r border-slate-100"
        style={{ width: LEFT_COL_WIDTH }}
      >
        <span className="text-[11px] font-medium text-slate-400">Theatre</span>
      </div>
      <div className="relative flex-1" style={{ minWidth: TIMELINE_MIN_WIDTH }}>
        {HOUR_MARKS.map((h, i) => {
          const left = (i / (HOUR_MARKS.length - 1)) * 100;
          const isFirst = i === 0;
          const isLast = i === HOUR_MARKS.length - 1;
          const translate = isFirst ? '0%' : isLast ? '-100%' : '-50%';
          return (
            <span
              key={h}
              className="absolute top-0 h-full flex items-center text-[11px] text-slate-400"
              style={{ left: `${left}%`, transform: `translateX(${translate})` }}
            >
              {formatHourLabel(h)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleEvent({ row, event, onSelect }: { row: FixtureRow; event: FixtureEvent; onSelect: (row: FixtureRow, event: FixtureEvent) => void }) {
  const palette = PASTELS[event.color];
  const left = pctForTime(event.startHour, event.startMinute);
  const right = pctForTime(event.endHour, event.endMinute);
  const width = Math.max(2, right - left);
  const label = `${event.title}, ${event.provider}, ${formatClock(event.startHour, event.startMinute)} to ${formatClock(event.endHour, event.endMinute)}${event.delayed ? ', delayed' : ''}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(row, event)}
      aria-label={label}
      title={event.title}
      style={{
        left: `${left}%`,
        width: `${width}%`,
        top: '50%',
        transform: 'translateY(-50%)',
        height: 52,
        backgroundColor: palette.bg,
        borderColor: palette.border,
        color: palette.text,
      }}
      className="absolute rounded-[8px] border px-2 py-1 text-left overflow-hidden cursor-pointer hover:brightness-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="text-[12px] font-semibold leading-tight truncate">{event.title}</div>
        {event.delayed && (
          <span title="Delayed" aria-label="Delayed" className="shrink-0 mt-0.5">
            <ClockIcon className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
      <div className="text-[10.5px] leading-tight truncate opacity-80">{event.provider}</div>
    </button>
  );
}

function ScheduleRow({ row, onSelect }: { row: FixtureRow; onSelect: (row: FixtureRow, event: FixtureEvent) => void }) {
  return (
    <div className="flex border-b border-slate-100 last:border-b-0" style={{ height: ROW_HEIGHT }}>
      <div
        className="shrink-0 sticky left-0 z-10 bg-white flex flex-col justify-center px-4 border-r border-slate-100"
        style={{ width: LEFT_COL_WIDTH }}
      >
        <div className={`text-[12.5px] font-semibold ${row.delayed ? 'text-[#B91C1C]' : 'text-slate-800'}`}>{row.label}</div>
        <div className={`text-[11px] mt-0.5 ${row.delayed ? 'text-[#B91C1C]' : 'text-slate-400'}`}>
          {row.delayed ? 'delayed' : `${row.events.length} ${row.events.length === 1 ? 'op' : 'ops'}`}
        </div>
      </div>
      <div className="relative flex-1" style={{ minWidth: TIMELINE_MIN_WIDTH }}>
        {HOUR_MARKS.slice(1, -1).map((h, i) => (
          <div
            key={h}
            className="absolute inset-y-0 w-px bg-slate-100"
            style={{ left: `${((i + 1) / (HOUR_MARKS.length - 1)) * 100}%` }}
          />
        ))}
        {row.events.map((event) => (
          <ScheduleEvent key={event.id} row={row} event={event} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function CurrentTimeMarker({ now }: { now: Date }) {
  const hour = now.getHours();
  const minute = now.getMinutes();
  if (hour < SCHEDULE_START_HOUR || hour > SCHEDULE_END_HOUR || (hour === SCHEDULE_END_HOUR && minute > 0)) return null;
  const fraction = pctForTime(hour, minute) / 100;
  const left = `calc(${LEFT_COL_WIDTH}px + (100% - ${LEFT_COL_WIDTH}px) * ${fraction})`;
  return (
    <div className="pointer-events-none absolute z-20" style={{ left, top: TIME_HEADER_HEIGHT, bottom: 0, width: 0 }}>
      <div className="absolute -top-1 -left-[3px] w-[7px] h-[7px] rounded-full bg-[#F97316]" />
      <div className="absolute top-0 bottom-0 -left-[1.5px] w-[3px] bg-[#F97316]" />
    </div>
  );
}

function AgendaList({ rows }: { rows: FixtureRow[] }) {
  return (
    <div className="sm:hidden divide-y divide-slate-100">
      {rows.map((row) => (
        <div key={row.id} className="py-3">
          <div className={`text-[13px] font-semibold ${row.delayed ? 'text-[#B91C1C]' : 'text-slate-800'}`}>
            {row.label}
            {row.delayed && <span className="ml-2 text-[11px] font-medium">delayed</span>}
          </div>
          <ul className="mt-2 space-y-2">
            {row.events.map((event) => {
              const palette = PASTELS[event.color];
              return (
                <li
                  key={event.id}
                  className="rounded-lg border px-3 py-2"
                  style={{ backgroundColor: palette.bg, borderColor: palette.border, color: palette.text }}
                >
                  <div className="text-[12px] font-semibold">{event.title}</div>
                  <div className="text-[11px] opacity-80">{event.provider}</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {formatClock(event.startHour, event.startMinute)} – {formatClock(event.endHour, event.endMinute)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AppointmentDetailsDrawer({
  row,
  event,
  onClose,
}: {
  row: FixtureRow;
  event: FixtureEvent;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const durationMinutes = (event.endHour * 60 + event.endMinute) - (event.startHour * 60 + event.startMinute);
  const durationLabel = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60 ? `${durationMinutes % 60}m` : ''}`.trim()
    : `${durationMinutes}m`;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Appointment details">
      <div className="flex-1 bg-black/10" onClick={onClose} />
      <div className="w-96 bg-white border-l border-slate-200 p-5 shadow-lg overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-slate-500">Procedure details</div>
            <div className="text-lg font-semibold text-slate-800">{event.title}</div>
          </div>
          <button onClick={onClose} aria-label="Close details" className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Provider</dt>
            <dd className="text-slate-800 font-medium">{event.provider}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Location</dt>
            <dd className="text-slate-800 font-medium">{row.label}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Start</dt>
            <dd className="text-slate-800 font-medium">{formatClock(event.startHour, event.startMinute)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">End</dt>
            <dd className="text-slate-800 font-medium">{formatClock(event.endHour, event.endMinute)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Duration</dt>
            <dd className="text-slate-800 font-medium">{durationLabel}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Status</dt>
            <dd className={`font-medium ${event.delayed ? 'text-[#B91C1C]' : 'text-slate-800'}`}>{event.delayed ? 'Delayed' : 'Scheduled'}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <button onClick={onClose} className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TodayScheduleClient() {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [selection, setSelection] = useState<{ row: FixtureRow; event: FixtureEvent } | null>(null);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const rows = dailyScheduleRows;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-none hover:bg-slate-50"
        >
          <BackArrowIcon />
        </button>
        <h1 className="text-[24px] font-semibold text-slate-800">
          Daily schedule
          <span className="sr-only"> — {formatDateLong(today)}</span>
        </h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between px-5" style={{ height: 52 }}>
          <div className="text-[15px] font-semibold text-slate-800">Daily schedule (all theatres)</div>
          <div className="text-[13px] font-medium text-slate-500">{totalProcedureCount} procedures today</div>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">No procedures scheduled today</div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <div className="relative" style={{ minWidth: LEFT_COL_WIDTH + TIMELINE_MIN_WIDTH }}>
                <ScheduleTimeHeader />
                <div>
                  {rows.map((row) => (
                    <ScheduleRow key={row.id} row={row} onSelect={(r, e) => setSelection({ row: r, event: e })} />
                  ))}
                </div>
                <CurrentTimeMarker now={now} />
              </div>
            </div>
            <div className="px-5 pb-4">
              <AgendaList rows={rows} />
            </div>
          </>
        )}
      </div>

      {selection && (
        <AppointmentDetailsDrawer row={selection.row} event={selection.event} onClose={() => setSelection(null)} />
      )}
    </div>
  );
}
