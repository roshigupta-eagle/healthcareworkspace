"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Button, Badge, Modal, Spinner } from '@/design-system';
import type { FHIRAppointment, FHIRSlot } from '@/scheduling/types/fhir-scheduling';
import { useRouter } from 'next/navigation';

type ViewMode = 'day' | 'week' | 'month' | 'agenda';

const DAY_START = 7; // 7:00
const DAY_END = 19; // 19:00
const MINUTES_PER_DAY = (DAY_END - DAY_START) * 60;
const GRID_MINUTE_STEP = 30; // render grid lines every 30 minutes

function isoDateKey(d: Date) { return d.toISOString().slice(0,10); }
function fmtTime(iso?: string) { if(!iso) return '—'; try { return new Date(iso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); } catch { return iso; } }

export default function DoctorCalendar({ practitionerId, compact = false }: { practitionerId?: string; compact?: boolean }) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<FHIRAppointment[]>([]);
  const [slots, setSlots] = useState<FHIRSlot[]>([]);
  const [providers, setProviders] = useState<{id:string;name:string}[]>([]);
  const [locations, setLocations] = useState<{id:string;name:string}[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewMode>('day');
  const [date, setDate] = useState<Date>(new Date());
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<string | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set(['booked','pending','proposed','arrived','fulfilled']));

  const [selectedAppt, setSelectedAppt] = useState<FHIRAppointment | null>(null);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookSlot, setBookSlot] = useState<FHIRSlot | null>(null);
  const [patientName, setPatientName] = useState('');
  const [nowTick, setNowTick] = useState(Date.now());

  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [apRes, slRes, provRes, locRes] = await Promise.all([
        fetch('/api/scheduling/appointments'),
        fetch('/api/scheduling/slots'),
        fetch('/api/scheduling/providers'),
        fetch('/api/scheduling/locations'),
      ]);
      const appts = await apRes.json();
      const sls = await slRes.json();
      const provs = await provRes.json();
      const locs = await locRes.json();
      setAppointments(Array.isArray(appts) ? appts : []);
      setSlots(Array.isArray(sls) ? sls : []);
      setProviders(Array.isArray(provs) ? provs : []);
      setLocations(Array.isArray(locs) ? locs : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('calendar fetch error', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); const id = setInterval(() => fetchAll(), 30_000); return () => clearInterval(id); }, [fetchAll]);
  useEffect(() => { const t = setInterval(() => setNowTick(Date.now()), 60_000); return () => clearInterval(t); }, []);

  // Derived data
  const dayKey = useMemo(() => isoDateKey(date), [date]);
  const slotsByStart = useMemo(() => {
    const m: Record<string, FHIRSlot> = {};
    slots.forEach(s => { m[s.start] = s; });
    return m;
  }, [slots]);

  const visibleAppointments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter(a => {
      // date filter
      const apDay = (a.start || '').slice(0,10);
      if (view === 'day' && apDay !== dayKey) return false;
      if (view === 'week') {
        const start = new Date(date); start.setDate(start.getDate() - start.getDay()); // sunday
        const end = new Date(start); end.setDate(start.getDate() + 7);
        const s = new Date(a.start);
        if (s < start || s >= end) return false;
      }
      if (providerFilter !== 'all') {
        const pid = a.participants.find(p => p.type === 'practitioner')?.actorId;
        if (pid !== providerFilter) return false;
      }
      if (locationFilter !== 'all') {
        if (a.slotIds && a.slotIds.length) {
          const sl = slots.find(s => s.id === a.slotIds?.[0]);
          if (sl && sl.locationId !== locationFilter) return false;
        }
      }
      if (statusFilter.size && !statusFilter.has(a.status)) return false;
      if (!q) return true;
      const patient = a.participants.find(p => p.type === 'patient')?.display || '';
      const provider = a.participants.find(p => p.type === 'practitioner')?.display || '';
      return patient.toLowerCase().includes(q) || provider.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q) || (a.appointmentType || '').toLowerCase().includes(q);
    });
  }, [appointments, view, date, search, providerFilter, locationFilter, statusFilter, slots, dayKey]);

  // layout helpers
  const containerHeight =  (MINUTES_PER_DAY / GRID_MINUTE_STEP) * 40; // 40px per GRID_MINUTE_STEP
  function minutesFromStart(iso: string) {
    const dt = new Date(iso);
    return dt.getHours() * 60 + dt.getMinutes() - DAY_START * 60;
  }
  function topForIso(iso: string) {
    const mins = minutesFromStart(iso);
    return Math.max(0, (mins / MINUTES_PER_DAY) * containerHeight);
  }
  function heightForRange(startIso: string, endIso: string) {
    const s = new Date(startIso); const e = new Date(endIso);
    const mins = (e.getTime() - s.getTime()) / (60 * 1000);
    return Math.max(18, (mins / MINUTES_PER_DAY) * containerHeight);
  }

  async function handleBook(slot: FHIRSlot, patient: { name: string }) {
    try {
      const res = await fetch('/api/scheduling/book', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slotId: slot.id, patient, appointmentType: 'Consultation' }) });
      const body = await res.json();
      if (res.ok && body.appointment) {
        setAppointments(prev => [body.appointment, ...prev]);
        setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, status: 'busy' } : s));
        setBookModalOpen(false);
        setBookSlot(null);
      } else {
        alert('Failed to book: ' + (body.message || 'unknown'));
      }
    } catch (err) { alert('Booking error'); }
  }

  async function handleCancel(appt: FHIRAppointment) {
    if (!confirm('Cancel this appointment?')) return;
    const res = await fetch('/api/scheduling/cancel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ appointmentId: appt.id }) });
    const body = await res.json();
    if (res.ok && body.success) {
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'cancelled' } : a));
      // free slots locally
      if (appt.slotIds && appt.slotIds.length) setSlots(prev => prev.map(s => appt.slotIds?.includes(s.id) ? { ...s, status: 'free' } : s));
      setSelectedAppt(null);
    } else alert('Failed to cancel');
  }

  async function handleReschedule(appt: FHIRAppointment, targetSlot: FHIRSlot) {
    try {
      const res = await fetch('/api/scheduling/reschedule', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ appointmentId: appt.id, newSlotId: targetSlot.id }) });
      const body = await res.json();
      if (res.ok && body.appointment) {
        setAppointments(prev => prev.map(a => a.id === body.appointment.id ? body.appointment : a));
        setSlots(prev => prev.map(s => s.id === targetSlot.id ? { ...s, status: 'busy' } : s).map(s => body.appointment.slotIds && body.appointment.slotIds.includes(s.id) ? { ...s, status: 'busy' } : s));
        setSelectedAppt(null);
      } else alert('Reschedule failed: ' + (body.message||''));
    } catch (err) { alert('Reschedule failed'); }
  }

  // Drag/drop handlers
  function onDragStart(e: React.DragEvent, apptId: string) { e.dataTransfer.setData('text/appt', apptId); e.dataTransfer.effectAllowed = 'move'; }
  async function onDropOnSlot(e: React.DragEvent, slotId: string) {
    e.preventDefault();
    const apptId = e.dataTransfer.getData('text/appt');
    if (!apptId) return;
    const appt = appointments.find(a => a.id === apptId);
    const slot = slots.find(s => s.id === slotId);
    if (!appt || !slot) return;
    await handleReschedule(appt, slot);
  }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }

  // Navigation helpers
  function goPrev() { const nd = new Date(date); if (view === 'day') nd.setDate(nd.getDate() - 1); else if (view === 'week') nd.setDate(nd.getDate() - 7); else nd.setMonth(nd.getMonth() - 1); setDate(nd); }
  function goNext() { const nd = new Date(date); if (view === 'day') nd.setDate(nd.getDate() + 1); else if (view === 'week') nd.setDate(nd.getDate() + 7); else nd.setMonth(nd.getMonth() + 1); setDate(nd); }
  function goToday() { setDate(new Date()); }

  return (
    <Card variant="outlined" className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Appointments</h3>
            <div className="text-sm text-neutral-500">{date.toDateString()}</div>
            <div className="ml-3 flex items-center gap-2">
              <input className="px-3 py-2 border rounded-md text-sm" placeholder="Search patients, types, providers" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
                <option value="all">All providers</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
                <option value="all">All locations</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant={view === 'day' ? 'secondary' : 'ghost'} onClick={() => setView('day')}>Day</Button>
            <Button size="sm" variant={view === 'week' ? 'secondary' : 'ghost'} onClick={() => setView('week')}>Week</Button>
            <Button size="sm" variant={view === 'month' ? 'secondary' : 'ghost'} onClick={() => setView('month')}>Month</Button>
            <Button size="sm" variant={view === 'agenda' ? 'secondary' : 'ghost'} onClick={() => setView('agenda')}>Agenda</Button>
            <div className="ml-4 flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={goPrev}>Prev</Button>
              <Button size="sm" variant="ghost" onClick={goToday}>Today</Button>
              <Button size="sm" variant="ghost" onClick={goNext}>Next</Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-neutral-600">Legend:</div>
          <Badge variant="info" size="sm">Booked</Badge>
          <Badge variant="warning" size="sm">Pending</Badge>
          <Badge variant="ghost" size="sm">Cancelled</Badge>
          <Button size="sm" variant="secondary" onClick={() => fetchAll()}>Refresh</Button>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center p-8"><Spinner /></div>
        ) : (
          <div className="w-full">
            {/* Day view (primary) */}
            {view === 'day' && (
              <div className="flex gap-4">
                <div className="w-16 text-xs text-neutral-600">
                  {Array.from({ length: (DAY_END - DAY_START) }).map((_, i) => (
                    <div key={i} className="h-20 flex items-start">{`${(DAY_START + i)}:00`}</div>
                  ))}
                </div>

                <div className="flex-1 relative border border-neutral-100 rounded-lg overflow-hidden" style={{ minHeight: containerHeight }} ref={containerRef}>
                  {/* background grid */}
                  {Array.from({ length: MINUTES_PER_DAY / GRID_MINUTE_STEP }).map((_, idx) => (
                    <div key={idx} className="absolute left-0 right-0 border-t border-neutral-100" style={{ top: `${(idx * GRID_MINUTE_STEP / MINUTES_PER_DAY) * 100}%`, height: `${(GRID_MINUTE_STEP / MINUTES_PER_DAY) * 100}%` }} />
                  ))}

                  {/* free slots markers */}
                  {slots.filter(s => s.status === 'free' && (providerFilter === 'all' ? true : s.practitionerId === providerFilter) && (locationFilter === 'all' ? true : s.locationId === locationFilter) && s.start.slice(0,10) === dayKey).map(slot => (
                    <div key={slot.id} draggable={false} onDragOver={onDragOver} onDrop={(e) => onDropOnSlot(e, slot.id)} className="absolute left-2 right-2 bg-emerald-50 border border-emerald-100 rounded-md flex items-center justify-between px-2 text-xs text-emerald-800" style={{ top: `${topForIso(slot.start)}px`, height: `${Math.max(22, (new Date(slot.end).getTime() - new Date(slot.start).getTime())/60000 / MINUTES_PER_DAY * containerHeight)}px` }}>
                      <div>{fmtTime(slot.start)} • {providers.find(p => p.id === slot.practitionerId)?.name || slot.practitionerId}</div>
                      <div><Button size="xs" variant="secondary" onClick={() => { setBookSlot(slot); setBookModalOpen(true); }}>Book</Button></div>
                    </div>
                  ))}

                  {/* current time indicator */}
                  {(() => {
                    const now = new Date(nowTick);
                    const daystr = now.toISOString().slice(0,10);
                    if (daystr === dayKey) {
                      const mins = minutesFromStart(now.toISOString());
                      if (mins >= 0 && mins <= MINUTES_PER_DAY) {
                        const top = (mins / MINUTES_PER_DAY) * containerHeight;
                        return <div className="absolute left-0 right-0 pointer-events-none" style={{ top: `${top}px` }}><div className="h-[2px] bg-red-500 w-full opacity-90" /></div>;
                      }
                    }
                    return null;
                  })()}

                  {/* appointments */}
                  {visibleAppointments.filter(a => a.start.slice(0,10) === dayKey).map(appt => {
                    const top = topForIso(appt.start);
                    const h = heightForRange(appt.start, appt.end);
                    const patient = appt.participants.find(p => p.type === 'patient')?.display || 'Patient';
                    const provider = appt.participants.find(p => p.type === 'practitioner')?.display || 'Provider';
                    const color = appt.status === 'cancelled' ? '#E5E7EB' : appt.status === 'booked' ? '#06b6d4' : '#f59e0b';
                    return (
                      <div key={appt.id} draggable onDragStart={(e) => onDragStart(e, appt.id)} onClick={() => setSelectedAppt(appt)} className="absolute left-4 right-4 p-2 rounded-md shadow-sm cursor-pointer overflow-hidden" style={{ top: `${top}px`, height: `${h}px`, backgroundColor: color, color: '#042' }}>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium truncate">{patient}</div>
                          <div className="text-xs">{fmtTime(appt.start)}</div>
                        </div>
                        <div className="text-xs opacity-90 truncate">{appt.appointmentType || appt.serviceType} • {provider}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Week / Month / Agenda simplified views */}
            {view === 'week' && (
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => { const d = new Date(date); d.setDate(date.getDate() - date.getDay() + i); const key = isoDateKey(d); const list = visibleAppointments.filter(a => a.start.slice(0,10) === key); return (
                  <div key={key} className="border rounded-md p-2 min-h-[180px] bg-white">
                    <div className="text-xs font-medium mb-2">{d.toLocaleDateString(undefined, { weekday: 'short', month:'short', day:'numeric' })}</div>
                    <div className="space-y-1">
                      {list.map(a => <div key={a.id} className="p-2 rounded bg-neutral-50 text-sm cursor-pointer" onClick={() => setSelectedAppt(a)}>{fmtTime(a.start)} • {a.participants.find(p => p.type==='patient')?.display}</div>)}
                    </div>
                  </div>
                ); })}
              </div>
            )}

            {view === 'month' && (
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => { const d = new Date(date); d.setDate(d.getDate() - d.getDate() + 1 + i); const key = isoDateKey(d); const count = visibleAppointments.filter(a => a.start.slice(0,10) === key).length; return (
                  <div key={i} className="min-h-[80px] border rounded-md p-2 bg-white">
                    <div className="text-xs font-medium">{d.getDate()}</div>
                    {count > 0 && <div className="text-xs text-neutral-700 mt-1">{count} appt</div>}
                  </div>
                ); })}
              </div>
            )}

            {view === 'agenda' && (
              <div className="space-y-2">
                {visibleAppointments.sort((a,b) => a.start.localeCompare(b.start)).map(a => (
                  <div key={a.id} className="p-3 border rounded-md bg-white flex items-center justify-between">
                    <div>
                      <div className="font-medium">{a.participants.find(p => p.type==='patient')?.display}</div>
                      <div className="text-xs text-neutral-600">{new Date(a.start).toLocaleString()} • {a.appointmentType}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="xs" variant="ghost" onClick={() => setSelectedAppt(a)}>Details</Button>
                      <Button size="xs" variant="ghost" onClick={() => handleCancel(a)}>Cancel</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking modal */}
      <Modal open={bookModalOpen} onClose={() => { setBookModalOpen(false); setBookSlot(null); }} title="Quick Book" size="sm">
        <div className="space-y-3">
          <div className="text-sm text-neutral-700">Booking slot: {bookSlot ? `${new Date(bookSlot.start).toLocaleString()} • ${providers.find(p => p.id === bookSlot.practitionerId)?.name || bookSlot.practitionerId}` : ''}</div>
          <label className="block text-sm">Patient name</label>
          <input className="w-full border rounded px-2 py-1" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => { setBookModalOpen(false); setBookSlot(null); }}>Cancel</Button>
            <Button size="sm" variant="secondary" onClick={() => { if (!bookSlot) return; if (!patientName) { alert('Enter patient name'); return; } handleBook(bookSlot, { name: patientName }); }}>Book</Button>
          </div>
        </div>
      </Modal>

      {/* Appointment details modal */}
      <Modal open={!!selectedAppt} onClose={() => setSelectedAppt(null)} title="Appointment" size="sm">
        {selectedAppt ? (
          <div className="space-y-3">
            <div className="font-semibold">{selectedAppt.participants.find(p => p.type==='patient')?.display}</div>
            <div className="text-sm text-neutral-600">{new Date(selectedAppt.start).toLocaleString()} • {selectedAppt.appointmentType}</div>
            <div className="text-sm">Provider: {selectedAppt.participants.find(p => p.type==='practitioner')?.display}</div>
            <div className="text-sm">Status: {selectedAppt.status}</div>
            <div className="text-sm text-neutral-600">{selectedAppt.description}</div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="ghost" onClick={() => { if (selectedAppt?.slotIds && selectedAppt.slotIds.length) { const slot = slots.find(s => s.id === selectedAppt.slotIds[0]); if (slot) { setBookSlot(slot); setBookModalOpen(true); } } }}>Find slot</Button>
              <Button size="sm" variant="ghost" onClick={() => selectedAppt && handleCancel(selectedAppt)}>Cancel</Button>
              <Button size="sm" variant="secondary" onClick={() => { const pid = selectedAppt.participants.find(p => p.type==='patient')?.actorId; if (pid) router.push(`/doctor/patients/${selectedAppt.participants.find(p => p.type==='patient')?.actorId}`); }}>Open Patient</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </Card>
  );
}
