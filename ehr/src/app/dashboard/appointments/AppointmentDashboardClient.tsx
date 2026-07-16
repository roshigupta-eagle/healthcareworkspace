"use client"

import react, { useEffect, useMemo, useState } from 'react';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

type Props = {
  initialAppointments?: any[];
  providers?: any[];
  locations?: any[];
  currentUser?: any;
};

const STATUS_KEYS = ['booked','pending','proposed','arrived','fulfilled','cancelled','noshow'];

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch (e) { return iso; }
}

function getRangeBounds(range: string, refDate: Date) {
  const date = new Date(refDate);
  date.setHours(0,0,0,0);
  if (range === 'today') {
    const start = new Date(date);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }
  if (range === 'week') {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { start, end };
  }
  if (range === 'month') {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return { start, end };
  }
  return { start: null, end: null } as any;
}

export default function AppointmentDashboardClient({ initialAppointments = [], providers = [], locations = [], currentUser }: Props) {
  const [appointments, setAppointments] = useState<any[]>(initialAppointments || []);
  const [dateRange, setDateRange] = useState<'today'|'week'|'month'|'all'>('week');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [statusSet, setStatusSet] = useState<Set<string>>(new Set(STATUS_KEYS));
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);
  const [density, setDensity] = useState<'comfortable'|'compact'>('comfortable');
  const [rescheduleSlots, setRescheduleSlots] = useState<any[] | null>(null);
  const [rescheduleFor, setRescheduleFor] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const res = await fetch('/api/scheduling/appointments');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setAppointments(data || []);
      } catch (e) { /* ignore */ }
    }
    fetchData();
    const id = setInterval(fetchData, 10000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function fetchSlots() {
      try {
        const res = await fetch('/api/scheduling/slots');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setSlots(data || []);
      } catch (e) { /* ignore */ }
    }
    fetchSlots();
  }, []);

  const { start, end } = useMemo(() => getRangeBounds(dateRange, new Date(selectedDate)), [dateRange, selectedDate]);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (start && end) {
        const when = a.start || a.datetime || a.date || a.when;
        if (!when) return false;
        const d = new Date(when);
        if (isNaN(d.getTime())) return false;
        if (d < start || d >= end) return false;
      }
      const st = (a.status || '').toString().toLowerCase();
      if (!statusSet.has(st) && !(statusSet.size === 0 && STATUS_KEYS.includes(st))) return false;
      if (providerFilter !== 'all') {
        const pract = a.participants?.find((p: any) => p.type === 'practitioner')?.actorId || a.practitionerId || a.providerId;
        if (pract !== providerFilter) return false;
      }
      if (locationFilter !== 'all') {
        const loc = a.location || a.participants?.find((p: any) => p.type === 'location')?.display || a.locationId;
        if (loc !== locationFilter) return false;
      }
      return true;
    }).sort((x,y) => new Date(x.start || x.datetime || 0).getTime() - new Date(y.start || y.datetime || 0).getTime());
  }, [appointments, start, end, statusSet, providerFilter, locationFilter]);

  const metrics = useMemo(() => {
    const now = new Date();
    const inRange = filtered;
    const today = inRange.filter(a => new Date(a.start || a.datetime || 0).toDateString() === now.toDateString());
    const waiting = inRange.filter(a => ((a.status || '').toString().toLowerCase() === 'booked') && new Date(a.start) <= now).length;
    const checkedIn = inRange.filter(a => ((a.status || '').toString().toLowerCase() === 'arrived' || (a.status || '').toString().toLowerCase() === 'fulfilled')).length;
    const critical = inRange.filter(a => ((a.serviceType || '').toString().toLowerCase().includes('emerg') || (a.appointmentType || '').toString().toLowerCase().includes('emerg'))).length;
    const cancelled = inRange.filter(a => ((a.status || '').toString().toLowerCase() === 'cancelled')).length;
    const avgDelayMinutes = (() => {
      const diffs: number[] = [];
      for (const a of inRange) {
        if (a.actualStart && a.start) {
          const d = (new Date(a.actualStart).getTime() - new Date(a.start).getTime()) / 60000;
          if (!Number.isNaN(d)) diffs.push(d);
        }
      }
      if (diffs.length === 0) return null;
      const sum = diffs.reduce((s, v) => s + v, 0);
      return Math.round(sum / diffs.length);
    })();
    const utilization = slots && slots.length ? Math.round((appointments.filter(a => ['booked','arrived','fulfilled'].includes(((a.status||'').toString().toLowerCase()))).length / Math.max(1, slots.length)) * 100) : null;
    const cancellationRate = inRange.length ? Math.round((cancelled / inRange.length) * 100) : 0;
    return { today: today.length, waiting, checkedIn, critical, avgDelayMinutes, utilization, cancellationRate };
  }, [filtered, slots, appointments]);

  function toggleStatus(s: string) {
    const key = s.toLowerCase();
    setStatusSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function doCancel(id: string) {
    if (!confirm('Cancel this appointment?')) return;
    setActionLoading(id);
    try {
      const res = await fetch('/api/scheduling/cancel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ appointmentId: id }) });
      const j = await res.json();
      if (j && j.success) setAppointments(prev => prev.map(p => p.id === id ? { ...p, status: 'cancelled' } : p));
      else alert('Failed to cancel');
    } catch (e) { /* ignore */ } finally { setActionLoading(null); }
  }

  async function openReschedule(id: string, practitionerId?: string) {
    setRescheduleFor(id);
    setRescheduleSlots(null);
    setActionLoading(id);
    try {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const q = new URLSearchParams({ from, to });
      if (practitionerId) q.set('practitionerId', practitionerId);
      const res = await fetch('/api/scheduling/find?' + q.toString());
      const data = await res.json();
      setRescheduleSlots(data || []);
    } catch (e) { setRescheduleSlots([]); } finally { setActionLoading(null); }
  }

  async function doReschedule(appointmentId: string, slotId: string) {
    if (!confirm('Move appointment to selected slot?')) return;
    setActionLoading(appointmentId);
    try {
      const res = await fetch('/api/scheduling/reschedule', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ appointmentId, newSlotId: slotId }) });
      const j = await res.json();
      if (res.ok && j && j.success) {
        const resp = await fetch('/api/scheduling/appointments');
        const data = await resp.json();
        setAppointments(data || []);
        setRescheduleFor(null);
        setRescheduleSlots(null);
      } else alert(j?.message || 'Reschedule failed');
    } catch (e) { /* ignore */ } finally { setActionLoading(null); }
  }

  function clearFilters() {
    setProviderFilter('all');
    setLocationFilter('all');
    setStatusSet(new Set(STATUS_KEYS));
    setDateRange('week');
    setSelectedDate(new Date().toISOString().slice(0,10));
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="bg-white rounded-xl border p-4 sm:p-6 shadow-sm mb-6 card-surface card-hover-raise">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <button type="button" onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().slice(0,10)); }} className="px-3 py-1.5 rounded-md border bg-white">◀</button>
            <input aria-label="Selected date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm min-w-[150px]" />
            <button type="button" onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().slice(0,10)); }} className="px-3 py-1.5 rounded-md border bg-white">▶</button>
          </div>

          <div className="flex-1 flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {(['today','week','month','all'] as const).map((r) => (
              <button key={r} aria-pressed={dateRange === r} onClick={() => { setDateRange(r); if (r === 'today') { setSelectedDate(new Date().toISOString().slice(0,10)); setStatusSet(new Set(STATUS_KEYS)); } }} className={cls('px-3 py-1.5 rounded-lg text-sm border', dateRange === r ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-neutral-700')}>{r === 'all' ? 'All' : r === 'week' ? 'Week' : r === 'month' ? 'Month' : 'Today'}</button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto mt-3 md:mt-0">
            <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm">
              <option value="all">All providers</option>
              {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm ml-2">
              <option value="all">All locations</option>
              {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <button type="button" onClick={() => { setLoading(true); fetch('/api/scheduling/appointments').then(r => r.json()).then(d => setAppointments(d || [])).finally(()=>setLoading(false)); }} className="ml-2 px-3 py-1.5 rounded-lg border text-sm">Refresh</button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
            <div className="bg-white rounded-lg border p-3 flex items-center justify-between"><div><div className="text-xs text-neutral-500">Waiting</div><div className="text-lg font-semibold text-neutral-900">{metrics.waiting}</div></div><div className="text-xs text-neutral-400">⏳</div></div>
            <div className="bg-white rounded-lg border p-3 flex items-center justify-between"><div><div className="text-xs text-neutral-500">Checked In</div><div className="text-lg font-semibold text-neutral-900">{metrics.checkedIn}</div></div><div className="text-xs text-neutral-400">🟢</div></div>
            <div className="bg-white rounded-lg border p-3 flex items-center justify-between"><div><div className="text-xs text-neutral-500">Critical</div><div className="text-lg font-semibold text-neutral-900">{metrics.critical}</div></div><div className="text-xs text-neutral-400">🔴</div></div>
            <div className="bg-white rounded-lg border p-3 flex items-center justify-between"><div><div className="text-xs text-neutral-500">Avg Delay</div><div className="text-lg font-semibold text-neutral-900">{metrics.avgDelayMinutes ?? '—'} {metrics.avgDelayMinutes ? 'min' : ''}</div></div><div className="text-xs text-neutral-400">⏱️</div></div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-neutral-500 mr-2">Density</div>
            <div className="inline-flex items-center rounded-md bg-white border p-1">
              <button onClick={() => setDensity('comfortable')} className={cls('px-2 py-1 rounded text-sm', density === 'comfortable' ? 'bg-sky-600 text-white' : 'text-neutral-700')}>Comfort</button>
              <button onClick={() => setDensity('compact')} className={cls('px-2 py-1 rounded text-sm', density === 'compact' ? 'bg-sky-600 text-white' : 'text-neutral-700')}>Compact</button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="hidden sm:flex sm:flex-wrap sm:gap-3">
            {STATUS_KEYS.map((s) => {
              const key = s.toLowerCase(); const active = statusSet.has(key);
              return (<button key={s} onClick={() => toggleStatus(key)} aria-pressed={active} className={cls('px-3 sm:px-4 py-1.5 rounded-full text-sm border', active ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-neutral-700 hover:bg-neutral-50')}>{capitalize(s)}</button>);
            })}
            <button onClick={clearFilters} className="ml-2 px-3 py-1.5 text-sm text-neutral-600">Clear Filters</button>
          </div>
          <div className="sm:hidden chips-scroll">
            {STATUS_KEYS.map((s) => { const key = s.toLowerCase(); const active = statusSet.has(key); return (<button key={s} onClick={() => toggleStatus(key)} aria-pressed={active} className={cls('flex-shrink-0 px-3 py-1 rounded-full text-xs border', active ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-neutral-700')}>{capitalize(s)}</button>); })}
            <button onClick={clearFilters} className="flex-shrink-0 px-3 py-1 text-xs text-neutral-600">Clear</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <section className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border p-4 sm:p-6 shadow-sm card-surface card-hover-raise">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-neutral-900">Appointments</h2>
                <p className="text-sm text-neutral-600">Showing {filtered.length} appointment{filtered.length !== 1 ? 's' : ''} — {dateRange === 'all' ? 'All time' : `${start ? start.toLocaleDateString() : ''}${start && end ? ` — ${new Date(end).toLocaleDateString()}` : ''}`}</p>
              </div>
              <div className="text-sm text-neutral-600">{appointments.length} total</div>
            </div>

            <div className="mt-5 space-y-4">
              {filtered.length === 0 && <div className="text-sm text-neutral-500">No appointments match your filters.</div>}

              {filtered.map((a) => {
                const patient = a.participants?.find((p: any) => p.type === 'patient')?.display || a.patientName || 'Patient';
                const provider = a.participants?.find((p: any) => p.type === 'practitioner')?.display || providers.find((p: any) => p.id === a.practitionerId)?.name || a.provider || 'Provider';
                const status = (a.status || 'unknown').toString().toLowerCase();
                const appointmentType = a.appointmentType || a.serviceType || 'Appointment';
                const compact = density === 'compact';
                const outerClass = cls('w-full bg-white border shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 card-surface card-hover-raise relative group', compact ? 'rounded-lg p-2 sm:p-3 text-sm' : 'rounded-xl p-4 sm:p-5');
                const timeColClass = compact ? 'w-20 flex-shrink-0 text-xs text-neutral-600' : 'w-24 flex-shrink-0 text-xs text-neutral-600';
                return (
                  <div key={a.id} className={outerClass}>
                    <div className={timeColClass}>
                      <div className={cls('font-medium text-neutral-900', compact ? 'text-sm' : '')}>{new Date(a.start || a.datetime || a.created).toLocaleDateString()}</div>
                      <div className="mt-1">{new Date(a.start || a.datetime || a.created).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
                    </div>

                    <div className="flex-1 min-w-0 leading-relaxed truncate-break">
                      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex gap-2">
                        <a href={`/dashboard/encounters/${a.id}`} className="inline-flex items-center px-2 py-1 rounded bg-white border text-xs text-neutral-700 shadow-sm">Open</a>
                        <button onClick={() => openReschedule(a.id, a.participants?.find((p: any) => p.type === 'practitioner')?.actorId || a.practitionerId)} className="inline-flex items-center px-2 py-1 rounded bg-white border text-xs text-neutral-700 shadow-sm">Reschedule</button>
                        <button onClick={() => doCancel(a.id)} className="inline-flex items-center px-2 py-1 rounded bg-white border text-xs text-neutral-700 shadow-sm">Cancel</button>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-neutral-900 truncate">{patient}</div>
                          <div className="text-xs text-neutral-600 truncate-break">{provider} • {appointmentType} • {a.location || a.locationId || ''}</div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className={cls('inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold', status === 'booked' ? 'bg-sky-50 text-sky-700' : status === 'pending' || status === 'proposed' ? 'bg-amber-50 text-amber-700' : status === 'cancelled' ? 'bg-gray-50 text-gray-700' : 'bg-neutral-50 text-neutral-700')}>
                            {capitalize(status)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                        <a href={`/dashboard/encounters/${a.id}`} className="text-sky-600 hover:underline">Open</a>
                        <button onClick={() => openReschedule(a.id, a.participants?.find((p: any) => p.type === 'practitioner')?.actorId || a.practitionerId)} className="text-neutral-600 hover:underline">Reschedule</button>
                        <button onClick={() => doCancel(a.id)} className="text-neutral-600 hover:underline">Cancel</button>
                      </div>

                      {rescheduleFor === a.id && (
                        <div className="mt-3 border rounded p-3 bg-neutral-50">
                          <div className="text-sm font-medium">Choose a new slot</div>
                          <div className="mt-2 space-y-2 max-h-48 overflow-auto">
                            {actionLoading === a.id && <div className="text-sm text-neutral-500">Loading slots…</div>}
                            {rescheduleSlots && rescheduleSlots.length === 0 && <div className="text-sm text-neutral-500">No available slots found.</div>}
                            {rescheduleSlots && rescheduleSlots.map((s) => (
                              <div key={s.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                <div className="text-sm">{new Date(s.start).toLocaleString()}</div>
                                <div>
                                  <button onClick={() => doReschedule(a.id, s.id)} className="px-3 py-1 rounded-md bg-sky-600 text-white text-sm">Move</button>
                                </div>
                              </div>
                            ))}
                            <div className="mt-2"><button onClick={() => { setRescheduleFor(null); setRescheduleSlots(null); }} className="text-sm text-neutral-600">Close</button></div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        </section>

        <aside className="lg:col-span-1">
          <div className="bg-white rounded-xl border p-3 sm:p-4 shadow-sm sticky top-6 card-surface card-hover-raise">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-neutral-900">Upcoming</div>
              <div className="text-xs text-neutral-500">{filtered.length}</div>
            </div>

            <div className="mt-3 space-y-3 max-h-[60vh] overflow-auto">
              {filtered.map((a) => {
                const patientParticipant = a.participants?.find((p: any) => p.type === 'patient');
                const patientId = patientParticipant?.actorId || a.patientId;
                const patientData = patientId ? getPatientById(String(patientId)) as any : null;
                const patientName = patientParticipant?.display || patientData?.name || a.patientName || 'Patient';
                const metaParts: string[] = [];
                if (patientData?.age) metaParts.push(`${patientData.age} yrs`);
                if (patientData?.conditions && patientData.conditions.length) metaParts.push(patientData.conditions.slice(0,2).join(', '));
                const patientMetaStr = metaParts.join(' • ');

                const provider = a.participants?.find((p: any) => p.type === 'practitioner')?.display || providers.find((p: any) => p.id === a.practitionerId)?.name || a.provider || 'Provider';
                const status = (a.status || 'unknown').toString().toLowerCase();

                const compact = density === 'compact';
                const outerClass = cls('w-full bg-white border shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 card-surface card-hover-raise relative group', compact ? 'rounded-lg p-2 sm:p-3 text-sm' : 'rounded-xl p-4 sm:p-5');
                const timeColClass = compact ? 'w-20 flex-shrink-0 text-xs text-neutral-600' : 'w-24 flex-shrink-0 text-xs text-neutral-600';

                return (
                  <div key={a.id} className={outerClass}>
                    <div className={timeColClass}>
                      <div className={cls('font-medium text-neutral-900', compact ? 'text-sm' : '')}>{new Date(a.start || a.datetime || a.created).toLocaleDateString()}</div>
                      <div className="mt-1">{new Date(a.start || a.datetime || a.created).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
                    </div>

                    <div className="flex-1 min-w-0 leading-relaxed truncate-break">
                      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex gap-2">
                        <a href={`/dashboard/encounters/${a.id}`} className="inline-flex items-center px-2 py-1 rounded bg-white border text-xs text-neutral-700 shadow-sm">Open</a>
                        <button onClick={() => openReschedule(a.id, a.participants?.find((p: any) => p.type === 'practitioner')?.actorId || a.practitionerId)} className="inline-flex items-center px-2 py-1 rounded bg-white border text-xs text-neutral-700 shadow-sm">Reschedule</button>
                        <button onClick={() => doCancel(a.id)} className="inline-flex items-center px-2 py-1 rounded bg-white border text-xs text-neutral-700 shadow-sm">Cancel</button>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-neutral-900 truncate">{patientName}</div>
                          <div className="text-xs text-neutral-600 truncate-break">{patientMetaStr ? `${patientMetaStr} • ` : ''}{provider} • {a.appointmentType || a.serviceType || 'Appointment'}</div>
                        </div>

                        <div className="text-right flex-shrink-0 ml-2">
                          <div className={cls('inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold', status === 'booked' ? 'bg-sky-50 text-sky-700' : status === 'pending' || status === 'proposed' ? 'bg-amber-50 text-amber-700' : status === 'cancelled' ? 'bg-gray-50 text-gray-700' : 'bg-neutral-50 text-neutral-700')}>
                            {capitalize(status)}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
'use client'

import React, { useEffect, useMemo, useState } from 'react';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

type Props = {
  initialAppointments?: any[];
  providers?: any[];
  locations?: any[];
  currentUser?: any;
};

const STATUS_KEYS = ['booked','pending','proposed','arrived','fulfilled','cancelled','noshow'];

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch (e) {
    return iso;
  }
}

function getRangeBounds(range: string, refDate: Date) {
  const date = new Date(refDate);
  date.setHours(0,0,0,0);
  if (range === 'today') {
    const start = new Date(date);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  if (range === 'week') {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay()); // Sunday start
    start.setHours(0,0,0,0);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  if (range === 'month') {
    const start = new Date(date.getFullYear(), date.getMonth(), 1, 0,0,0,0);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0,0,0,0);
    return { start, end };
  }

  return { start: null, end: null } as any;
}

export default function AppointmentDashboardClient({ initialAppointments = [], providers = [], locations = [], currentUser }: Props) {
  const [appointments, setAppointments] = useState<any[]>(initialAppointments || []);
  const [dateRange, setDateRange] = useState<'today'|'week'|'month'|'all'>('week');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [statusSet, setStatusSet] = useState<Set<string>>(new Set(STATUS_KEYS));
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);
  const [density, setDensity] = useState<'comfortable'|'compact'>('comfortable');
  const [rescheduleSlots, setRescheduleSlots] = useState<any[] | null>(null);
  const [rescheduleFor, setRescheduleFor] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch latest appointments (polling)
  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const res = await fetch('/api/scheduling/appointments');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setAppointments(data || []);
      } catch (e) {
        // ignore
      }
    }
    fetchData();
    const id = setInterval(fetchData, 10000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // Fetch slots for utilization metric
  useEffect(() => {
    let mounted = true;
    async function fetchSlots() {
      try {
        const res = await fetch('/api/scheduling/slots');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setSlots(data || []);
      } catch (e) {
        // ignore
      }
    }
    fetchSlots();
  }, []);

  const { start, end } = useMemo(() => getRangeBounds(dateRange, new Date(selectedDate)), [dateRange, selectedDate]);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      // Date filter
      if (start && end) {
        const when = a.start || a.datetime || a.date || a.when;
        if (!when) return false;
        const d = new Date(when);
        if (isNaN(d.getTime())) return false;
        if (d < start || d >= end) return false;
      }

      // Status filter
      const st = (a.status || '').toString().toLowerCase();
      if (!statusSet.has(st) && !(statusSet.size === 0 && STATUS_KEYS.includes(st))) return false;

      // Provider filter
      if (providerFilter !== 'all') {
        const pract = a.participants?.find((p: any) => p.type === 'practitioner')?.actorId || a.practitionerId || a.providerId;
        if (pract !== providerFilter) return false;
      }

      // Location filter
      if (locationFilter !== 'all') {
        const loc = a.location || a.participants?.find((p: any) => p.type === 'location')?.display || a.locationId;
        if (loc !== locationFilter) return false;
      }

      return true;
    }).sort((x,y) => new Date(x.start || x.datetime || 0).getTime() - new Date(y.start || y.datetime || 0).getTime());
  }, [appointments, start, end, statusSet, providerFilter, locationFilter]);

  // KPI metrics (computed from the filtered set)
  const metrics = useMemo(() => {
    const now = new Date();
    const inRange = filtered;
    const today = inRange.filter(a => new Date(a.start || a.datetime || 0).toDateString() === now.toDateString());
    const waiting = inRange.filter(a => ((a.status || '').toString().toLowerCase() === 'booked') && new Date(a.start) <= now).length;
    const checkedIn = inRange.filter(a => ((a.status || '').toString().toLowerCase() === 'arrived' || (a.status || '').toString().toLowerCase() === 'fulfilled')).length;
    const critical = inRange.filter(a => ((a.serviceType || '').toString().toLowerCase().includes('emerg') || (a.appointmentType || '').toString().toLowerCase().includes('emerg'))).length;
    const cancelled = inRange.filter(a => ((a.status || '').toString().toLowerCase() === 'cancelled')).length;
    const avgDelayMinutes = (() => {
      const diffs: number[] = [];
      for (const a of inRange) {
        if (a.actualStart && a.start) {
          const d = (new Date(a.actualStart).getTime() - new Date(a.start).getTime()) / 60000;
          if (!Number.isNaN(d)) diffs.push(d);
        }
      }
      if (diffs.length === 0) return null;
      const sum = diffs.reduce((s, v) => s + v, 0);
      return Math.round(sum / diffs.length);
    })();
    const utilization = slots && slots.length ? Math.round((appointments.filter(a => ['booked','arrived','fulfilled'].includes(((a.status||'').toString().toLowerCase()))).length / Math.max(1, slots.length)) * 100) : null;
    const cancellationRate = inRange.length ? Math.round((cancelled / inRange.length) * 100) : 0;
    return { today: today.length, waiting, checkedIn, critical, avgDelayMinutes, utilization, cancellationRate };
  }, [filtered, slots, appointments]);

  function toggleStatus(s: string) {
    const key = s.toLowerCase();
    setStatusSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function doCancel(id: string) {
    if (!confirm('Cancel this appointment?')) return;
    setActionLoading(id);
    try {
      const res = await fetch('/api/scheduling/cancel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ appointmentId: id }) });
      const j = await res.json();
      if (j && j.success) {
        // optimistic update
        setAppointments(prev => prev.map(p => p.id === id ? { ...p, status: 'cancelled' } : p));
      } else {
        alert('Failed to cancel');
      }
    } catch (e) {
      // ignore
    } finally { setActionLoading(null); }
  }

  async function openReschedule(id: string, practitionerId?: string) {
    setRescheduleFor(id);
    setRescheduleSlots(null);
    setActionLoading(id);
    try {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const q = new URLSearchParams({ from, to });
      if (practitionerId) q.set('practitionerId', practitionerId);
      const res = await fetch('/api/scheduling/find?' + q.toString());
      const slots = await res.json();
      setRescheduleSlots(slots || []);
    } catch (e) {
      setRescheduleSlots([]);
    } finally {
      setActionLoading(null);
    }
  }

  async function doReschedule(appointmentId: string, slotId: string) {
    if (!confirm('Move appointment to selected slot?')) return;
    setActionLoading(appointmentId);
    try {
      const res = await fetch('/api/scheduling/reschedule', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ appointmentId, newSlotId: slotId }) });
      const j = await res.json();
      if (res.ok && j && j.success) {
        // refresh list
        const resp = await fetch('/api/scheduling/appointments');
        const data = await resp.json();
        setAppointments(data || []);
        setRescheduleFor(null);
        setRescheduleSlots(null);
      } else {
        alert(j?.message || 'Reschedule failed');
      }
    } catch (e) {
      // ignore
    } finally { setActionLoading(null); }
  }

  function clearFilters() {
    setProviderFilter('all');
    setLocationFilter('all');
    setStatusSet(new Set(STATUS_KEYS));
    setDateRange('week');
    setSelectedDate(new Date().toISOString().slice(0,10));
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Top controls */}
      <div className="bg-white rounded-xl border p-4 sm:p-6 shadow-sm mb-6 transition-shadow duration-200 ease-in-out card-surface card-hover-raise">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <button type="button" onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().slice(0,10)); }} className="px-3 py-1.5 rounded-md border bg-white transition-colors duration-200">◀</button>
            <input aria-label="Selected date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm min-w-[150px]" />
            <button type="button" onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().slice(0,10)); }} className="px-3 py-1.5 rounded-md border bg-white transition-colors duration-200">▶</button>
          </div>

          <div className="flex-1 flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {(['today','week','month','all'] as const).map((r) => (
              <button
                key={r}
                aria-pressed={dateRange === r}
                onClick={() => { setDateRange(r); if (r === 'today') { setSelectedDate(new Date().toISOString().slice(0,10)); setStatusSet(new Set(STATUS_KEYS)); } }}
                className={cls(
                  'px-3 py-1.5 rounded-lg text-sm border whitespace-nowrap transition-colors duration-200',
                  dateRange === r ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-neutral-700 hover:bg-neutral-50'
                )}
              >{r === 'all' ? 'All' : r === 'week' ? 'Week' : r === 'month' ? 'Month' : 'Today'}</button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto mt-3 md:mt-0">
            <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm">
              <option value="all">All providers</option>
              {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm ml-2">
              <option value="all">All locations</option>
              {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <button type="button" onClick={() => { setLoading(true); fetch('/api/scheduling/appointments').then(r => r.json()).then(d => setAppointments(d || [])).finally(()=>setLoading(false)); }} className="ml-2 px-3 py-1.5 rounded-lg border text-sm transition-colors duration-200">Refresh</button>
          </div>
        </div>
        
        {/* KPI summary & density toggle */}
        <div className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
            <div className="bg-white rounded-lg border p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-neutral-500">Waiting</div>
                <div className="text-lg font-semibold text-neutral-900">{metrics.waiting}</div>
              </div>
              <div className="text-xs text-neutral-400">⏳</div>
            </div>
            <div className="bg-white rounded-lg border p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-neutral-500">Checked In</div>
                <div className="text-lg font-semibold text-neutral-900">{metrics.checkedIn}</div>
              </div>
              <div className="text-xs text-neutral-400">🟢</div>
            </div>
            <div className="bg-white rounded-lg border p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-neutral-500">Critical</div>
                <div className="text-lg font-semibold text-neutral-900">{metrics.critical}</div>
              </div>
              <div className="text-xs text-neutral-400">🔴</div>
            </div>
            <div className="bg-white rounded-lg border p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-neutral-500">Avg Delay</div>
                <div className="text-lg font-semibold text-neutral-900">{metrics.avgDelayMinutes ?? '—'} {metrics.avgDelayMinutes ? 'min' : ''}</div>
              </div>
              <div className="text-xs text-neutral-400">⏱️</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-neutral-500 mr-2">Density</div>
            <div className="inline-flex items-center rounded-md bg-white border p-1">
              <button onClick={() => setDensity('comfortable')} className={cls('px-2 py-1 rounded text-sm', density === 'comfortable' ? 'bg-sky-600 text-white' : 'text-neutral-700')}>Comfort</button>
              <button onClick={() => setDensity('compact')} className={cls('px-2 py-1 rounded text-sm', density === 'compact' ? 'bg-sky-600 text-white' : 'text-neutral-700')}>Compact</button>
            </div>
          </div>
        </div>

        {/* Status filters */}
        <div className="mt-4">
          <div className="hidden sm:flex sm:flex-wrap sm:gap-3">
            {STATUS_KEYS.map((s) => {
              const key = s.toLowerCase();
              const active = statusSet.has(key);
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(key)}
                  aria-pressed={active}
                  className={cls('px-3 sm:px-4 py-1.5 rounded-full text-sm border transition-colors duration-200', active ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-neutral-700 hover:bg-neutral-50')}
                >{capitalize(s)}</button>
              );
            })}

            <button onClick={clearFilters} className="ml-2 px-3 py-1.5 text-sm text-neutral-600">Clear Filters</button>
          </div>

          {/* Mobile: horizontally scrollable compact chips to avoid tall wrapping */}
          <div className="sm:hidden chips-scroll">
            {STATUS_KEYS.map((s) => {
              const key = s.toLowerCase();
              const active = statusSet.has(key);
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(key)}
                  aria-pressed={active}
                  className={cls('flex-shrink-0 px-3 py-1 rounded-full text-xs border transition-colors duration-200', active ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-neutral-700')}
                >{capitalize(s)}</button>
              );
            })}

            <button onClick={clearFilters} className="flex-shrink-0 px-3 py-1 text-xs text-neutral-600">Clear</button>
          </div>
        </div>
      </div>

      {/* Main content: list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border p-4 sm:p-6 shadow-sm card-surface card-hover-raise transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-neutral-900">Appointments</h2>
                <p className="text-sm text-neutral-600">Showing {filtered.length} appointment{filtered.length !== 1 ? 's' : ''} — {dateRange === 'all' ? 'All time' : `${start ? start.toLocaleDateString() : ''}${start && end ? ` — ${new Date(end).toLocaleDateString()}` : ''}`}</p>
              </div>
              <div className="text-sm text-neutral-600">{appointments.length} total</div>
            </div>

            <div className="mt-5 space-y-4">
              {filtered.length === 0 && <div className="text-sm text-neutral-500">No appointments match your filters.</div>}

              {filtered.map((a) => {
                const patient = a.participants?.find((p: any) => p.type === 'patient')?.display || a.patientName || 'Patient';
                const provider = a.participants?.find((p: any) => p.type === 'practitioner')?.display || providers.find((p: any) => p.id === a.practitionerId)?.name || a.provider || 'Provider';
                const when = formatDateTime(a.start || a.datetime || a.created);
                const status = (a.status || 'unknown').toString().toLowerCase();
                const appointmentType = a.appointmentType || a.serviceType || 'Appointment';

                const compact = density === 'compact';
                const outerClass = cls('w-full bg-white border shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 card-surface card-hover-raise transition-shadow duration-200 relative group', compact ? 'rounded-lg p-2 sm:p-3 text-sm' : 'rounded-xl p-4 sm:p-5');
                const timeColClass = compact ? 'w-20 flex-shrink-0 text-xs text-neutral-600' : 'w-24 flex-shrink-0 text-xs text-neutral-600';

                return (
                  <div key={a.id} className={outerClass}>
                    <div className={timeColClass}>
                      <div className={cls('font-medium text-neutral-900', compact ? 'text-sm' : '')}>{new Date(a.start || a.datetime || a.created).toLocaleDateString()}</div>
                      <div className="mt-1">{new Date(a.start || a.datetime || a.created).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
                    </div>

                    <div className="flex-1 min-w-0 leading-relaxed truncate-break">
                      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex gap-2">
                        <a href={`/dashboard/encounters/${a.id}`} className="inline-flex items-center px-2 py-1 rounded bg-white border text-xs text-neutral-700 shadow-sm">Open</a>
                        <button onClick={() => openReschedule(a.id, a.participants?.find((p: any) => p.type === 'practitioner')?.actorId || a.practitionerId)} className="inline-flex items-center px-2 py-1 rounded bg-white border text-xs text-neutral-700 shadow-sm">Reschedule</button>
                        <button onClick={() => doCancel(a.id)} className="inline-flex items-center px-2 py-1 rounded bg-white border text-xs text-neutral-700 shadow-sm">Cancel</button>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-neutral-900 truncate">{patient}</div>
                          <div className="text-xs text-neutral-600 truncate-break">{provider} • {appointmentType} • {a.location || a.locationId || ''}</div>
                        </div>

                        <div className="text-right flex-shrink-0 ml-2">
                          <div className={cls('inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold transition-colors duration-200', status === 'booked' ? 'bg-sky-50 text-sky-700' : status === 'pending' || status === 'proposed' ? 'bg-amber-50 text-amber-700' : status === 'cancelled' ? 'bg-gray-50 text-gray-700' : 'bg-neutral-50 text-neutral-700')}>
                            {capitalize(status)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                        <a href={`/dashboard/encounters/${a.id}`} className="text-sky-600 hover:underline transition-colors duration-200 hover:text-sky-700">Open</a>
                        <button onClick={() => openReschedule(a.id, a.participants?.find((p: any) => p.type === 'practitioner')?.actorId || a.practitionerId)} className="text-neutral-600 hover:underline transition-colors duration-200">Reschedule</button>
                        <button onClick={() => doCancel(a.id)} className="text-neutral-600 hover:underline transition-colors duration-200">Cancel</button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-xs text-neutral-500">Tip: Use the filters and view buttons to focus on Today, Week, Month, or All appointments. Drag & drop rescheduling is available in the full calendar view.</div>
          </div>
        </section>
      </div>
    </div>
  );
}

                      {/* Reschedule panel */}
                      {rescheduleFor === a.id && (
                        <div className="mt-3 border rounded p-3 bg-neutral-50">
                          <div className="text-sm font-medium">Choose a new slot</div>
                          <div className="mt-2 space-y-2 max-h-48 overflow-auto">
                            {actionLoading === a.id && <div className="text-sm text-neutral-500">Loading slots…</div>}
                            {rescheduleSlots && rescheduleSlots.length === 0 && <div className="text-sm text-neutral-500">No available slots found.</div>}
                            {rescheduleSlots && rescheduleSlots.map((s) => (
                              <div key={s.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                <div className="text-sm">{new Date(s.start).toLocaleString()}</div>
                                <div>
                                  <button onClick={() => doReschedule(a.id, s.id)} className="px-3 py-1 rounded-md bg-sky-600 text-white text-sm transition-colors duration-200">Move</button>
                                </div>
                              </div>
                            ))}
                            <div className="mt-2">
                              <button onClick={() => { setRescheduleFor(null); setRescheduleSlots(null); }} className="text-sm text-neutral-600">Close</button>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="lg:col-span-1">
          <div className="bg-white rounded-xl border p-3 sm:p-4 shadow-sm sticky top-6 card-surface card-hover-raise transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-neutral-900">Upcoming</div>
              <div className="text-xs text-neutral-500">{filtered.length}</div>
            </div>

            <div className="mt-3 space-y-3 max-h-[60vh] overflow-auto">

              {filtered.map((a) => {
                const patientParticipant = a.participants?.find((p: any) => p.type === 'patient');
                const patientId = patientParticipant?.actorId || a.patientId;
                const patientData = patientId ? getPatientById(String(patientId)) as any : null;
                const patientName = patientParticipant?.display || patientData?.name || a.patientName || 'Patient';
                const metaParts: string[] = [];
                if (patientData?.age) metaParts.push(`${patientData.age} yrs`);
                if (patientData?.conditions && patientData.conditions.length) metaParts.push(patientData.conditions.slice(0,2).join(', '));
                const patientMetaStr = metaParts.join(' • ');

                const provider = a.participants?.find((p: any) => p.type === 'practitioner')?.display || providers.find((p: any) => p.id === a.practitionerId)?.name || a.provider || 'Provider';
                const when = formatDateTime(a.start || a.datetime || a.created);
                const status = (a.status || 'unknown').toString().toLowerCase();
                const appointmentType = a.appointmentType || a.serviceType || 'Appointment';

                const risk = patientData && (patientData.conditions || []).some((c: string) => /hypertens|diabet|chest|cardio/i.test(c)) ? 'high' : 'normal';
                const insurance = patientData?.insurance?.provider ? patientData.insurance.provider : null;
                const lastLab = patientData?.labResults?.slice(-1)[0];

                const compact = density === 'compact';
                const outerClass = cls('w-full bg-white border shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 card-surface card-hover-raise transition-shadow duration-200 relative group', compact ? 'rounded-lg p-2 sm:p-3 text-sm' : 'rounded-xl p-4 sm:p-5');
                const timeColClass = compact ? 'w-20 flex-shrink-0 text-xs text-neutral-600' : 'w-24 flex-shrink-0 text-xs text-neutral-600';

                return (
                  <div key={a.id} className={outerClass}>
                    <div className={timeColClass}>
                      <div className={cls('font-medium text-neutral-900', compact ? 'text-sm' : '')}>{new Date(a.start || a.datetime || a.created).toLocaleDateString()}</div>
                      <div className="mt-1">{new Date(a.start || a.datetime || a.created).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
                    </div>

                    <div className="flex-1 min-w-0 leading-relaxed truncate-break">
                      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex gap-2">
                        <a href={`/dashboard/encounters/${a.id}`} className="inline-flex items-center px-2 py-1 rounded bg-white border text-xs text-neutral-700 shadow-sm">Open</a>
                        <button onClick={() => openReschedule(a.id, a.participants?.find((p: any) => p.type === 'practitioner')?.actorId || a.practitionerId)} className="inline-flex items-center px-2 py-1 rounded bg-white border text-xs text-neutral-700 shadow-sm">Reschedule</button>
                        <button onClick={() => doCancel(a.id)} className="inline-flex items-center px-2 py-1 rounded bg-white border text-xs text-neutral-700 shadow-sm">Cancel</button>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-neutral-900 truncate">{patientName}</div>
                          <div className="text-xs text-neutral-600 truncate-break">{patientMetaStr ? `${patientMetaStr} • ` : ''}{provider} • {appointmentType} • {a.location || a.locationId || ''}</div>
                        </div>

                        <div className="text-right flex-shrink-0 ml-2">
                          <div className={cls('inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold transition-colors duration-200', status === 'booked' ? 'bg-sky-50 text-sky-700' : status === 'pending' || status === 'proposed' ? 'bg-amber-50 text-amber-700' : status === 'cancelled' ? 'bg-gray-50 text-gray-700' : 'bg-neutral-50 text-neutral-700')}>
                            {capitalize(status)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                        {insurance && <div className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs">Insurance: {insurance}</div>}
                        {risk === 'high' && <div className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">High Risk</div>}
                        {lastLab && <div className="inline-flex items-center px-2 py-1 rounded-full bg-neutral-50 text-neutral-700 text-xs">{lastLab.name}: {lastLab.result}{lastLab.unit ? ` ${lastLab.unit}` : ''}</div>}

                        <a href={`/dashboard/encounters/${a.id}`} className="text-sky-600 hover:underline transition-colors duration-200 hover:text-sky-700">Open</a>
                        <button onClick={() => openReschedule(a.id, a.participants?.find((p: any) => p.type === 'practitioner')?.actorId || a.practitionerId)} className="text-neutral-600 hover:underline transition-colors duration-200">Reschedule</button>
                        <button onClick={() => doCancel(a.id)} className="text-neutral-600 hover:underline transition-colors duration-200">Cancel</button>
                      </div>
