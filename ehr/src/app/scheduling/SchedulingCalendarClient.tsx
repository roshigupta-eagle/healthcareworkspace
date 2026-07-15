"use client";

import React, { useMemo, useState } from 'react';
import type { FHIRAppointment, FHIRSlot } from '@/scheduling/types/fhir-scheduling';
import { bookAppointment, cancelAppointment, rescheduleAppointment } from '@/scheduling/services/scheduling.mock';
import { Card, Button, Badge, Modal } from '@/design-system';

type Provider = { id: string; name: string };
type Location = { id: string; name: string };

type Props = {
  initialAppointments: FHIRAppointment[];
  initialSlots: FHIRSlot[];
  providers?: Provider[];
  locations?: Location[];
  currentUser?: { id?: string; name?: string; role?: string } | null;
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function fmtTime(iso?: string) {
  if (!iso) return '—';
  try {
    const dt = new Date(iso);
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function colorForId(id?: string) {
  const colors = ['#06b6d4', '#7c3aed', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#0ea5e9'];
  if (!id) return colors[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return colors[Math.abs(h) % colors.length];
}

export default function SchedulingCalendarClient({ initialAppointments, initialSlots, providers = [], locations = [], currentUser = null }: Props) {
  const [appointments, setAppointments] = useState<FHIRAppointment[]>(initialAppointments || []);
  const [slots, setSlots] = useState<FHIRSlot[]>(initialSlots || []);
  const [view, setView] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [cursor, setCursor] = useState(new Date());
  const [search, setSearch] = useState('');
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [detailsAppt, setDetailsAppt] = useState<FHIRAppointment | null>(null);

  const [providerFilter, setProviderFilter] = useState<string | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set(['booked', 'pending', 'proposed', 'arrived', 'fulfilled', 'cancelled', 'noshow']));

  const startOfWeek = useMemo(() => {
    const d = new Date(cursor);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday-first
    return new Date(d.setDate(diff));
  }, [cursor]);

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [startOfWeek]);

  const monthDays = useMemo(() => {
    const ref = new Date(cursor);
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
    const arr: Date[] = [];
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      arr.push(new Date(d));
    }
    return arr;
  }, [cursor]);

  const filteredAppointments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter((a) => {
      if (providerFilter !== 'all') {
        const pid = a.participants.find((p) => p.type === 'practitioner')?.actorId;
        if (pid !== providerFilter) return false;
      }
      if (locationFilter !== 'all') {
        if (a.slotIds && a.slotIds.length) {
          const sl = slots.find((s) => s.id === a.slotIds?.[0]);
          if (sl && sl.locationId !== locationFilter) return false;
        }
      }
      if (statusFilter.size && !statusFilter.has((a.status || '').toString())) return false;
      if (!q) return true;
      const patient = a.participants.find((p) => p.type === 'patient')?.display?.toLowerCase() || '';
      const provider = a.participants.find((p) => p.type === 'practitioner')?.display?.toLowerCase() || '';
      return patient.includes(q) || provider.includes(q) || (a.description || '').toLowerCase().includes(q) || (a.appointmentType || '').toLowerCase().includes(q);
    });
  }, [appointments, search, providerFilter, locationFilter, statusFilter, slots]);

  const visibleAppointments = useMemo(() => {
    if (view === 'all') return filteredAppointments;
    if (view === 'today') {
      const ref = new Date();
      return filteredAppointments.filter(a => new Date(a.start).toDateString() === ref.toDateString());
    }
    if (view === 'week') {
      const start = new Date(startOfWeek);
      const end = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
      return filteredAppointments.filter(a => new Date(a.start) >= start && new Date(a.start) < end);
    }
    if (view === 'month') {
      const ref = new Date(cursor);
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
      return filteredAppointments.filter(a => new Date(a.start) >= start && new Date(a.start) < end);
    }
    return filteredAppointments;
  }, [filteredAppointments, view, startOfWeek, cursor]);

  async function openBookModalForWeek() {
    setBookModalOpen(true);
  }

  async function handleBook(slot: FHIRSlot, patientName: string, contact?: string, appointmentType?: string) {
    const res = await bookAppointment({ slotId: slot.id, patient: { name: patientName, contact }, appointmentType, serviceType: slot.serviceType });
    if (res.success && res.appointment) {
      setAppointments((s) => [res.appointment!, ...s]);
      setSlots((s) => s.map((sl) => (sl.id === slot.id ? { ...sl, status: 'busy' } : sl)));
      setBookModalOpen(false);
      alert('Booked appointment');
    } else {
      alert('Could not book: ' + (res.message || 'unknown'));
    }
  }

  async function handleCancel(appt: FHIRAppointment) {
    if (!confirm('Cancel this appointment?')) return;
    const ok = await cancelAppointment(appt.id);
    if (ok) {
      setAppointments((s) => s.map((a) => (a.id === appt.id ? { ...a, status: 'cancelled' } : a)));
      if (appt.slotIds) {
        setSlots((s) => s.map((sl) => (appt.slotIds?.includes(sl.id) ? { ...sl, status: 'free' } : sl)));
      }
      setDetailsAppt(null);
    } else {
      alert('Failed to cancel');
    }
  }

  function toggleStatusFilter(status: string) {
    setStatusFilter((prev) => {
      const copy = new Set(prev);
      if (copy.has(status)) copy.delete(status); else copy.add(status);
      return copy;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <input className="border rounded px-3 py-2" placeholder="Search patients, providers, services" value={search} onChange={(e) => setSearch(e.target.value)} />

          <select className="border rounded px-3 py-2" value={providerFilter} onChange={(e) => setProviderFilter(e.target.value as string)}>
            <option value="all">All providers</option>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select className="border rounded px-3 py-2" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value as string)}>
            <option value="all">All locations</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          {/* Removed quick-range chips - replaced by clear view buttons below */}

          {/* View toggle - Today | Week | Month | All */}
          <div className="ml-2 flex gap-1">
            <Button size="sm" variant={view === 'today' ? 'secondary' : 'ghost'} onClick={() => { setView('today'); setCursor(new Date()); }}>Today</Button>
            <Button size="sm" variant={view === 'week' ? 'secondary' : 'ghost'} onClick={() => setView('week')}>Week</Button>
            <Button size="sm" variant={view === 'month' ? 'secondary' : 'ghost'} onClick={() => setView('month')}>Month</Button>
            <Button size="sm" variant={view === 'all' ? 'secondary' : 'ghost'} onClick={() => setView('all')}>All</Button>
          </div>

        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {['booked','pending','proposed','arrived','fulfilled','cancelled','noshow'].map((s) => (
              <button key={s} className={`px-2 py-1 text-xs rounded ${statusFilter.has(s) ? 'bg-neutral-900 text-white' : 'bg-white border'}`} onClick={() => toggleStatusFilter(s)}>{s}</button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setCursor((d) => { const nd = new Date(d); nd.setDate(nd.getDate() - 7); return nd; })}>Prev</Button>
            <Button size="sm" variant="ghost" onClick={() => setCursor(new Date())}>Today</Button>
            <Button size="sm" variant="ghost" onClick={() => setCursor((d) => { const nd = new Date(d); nd.setDate(nd.getDate() + 7); return nd; })}>Next</Button>
            <Button size="sm" variant="secondary" onClick={() => openBookModalForWeek()}>Book</Button>
            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM') && <Button size="sm" variant="ghost">Manage Providers</Button>}
          </div>
        </div>
      </div>

      {/* Week view */}
      {view === 'week' && (
        <div className="grid grid-cols-7 gap-3">
          {days.map((d) => {
            const key = dayKey(d);
            const dayAppts = visibleAppointments.filter((a) => {
              const sd = new Date(a.start);
              return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth() && sd.getDate() === d.getDate();
            });
            return (
              <Card key={key} variant="outlined" className="p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                  <div className="text-xs text-neutral-500">{dayAppts.length} appts</div>
                </div>

                <div className="mt-3 space-y-2">
                  {dayAppts.length === 0 && <div className="text-sm text-neutral-500">No appointments</div>}
                  {dayAppts.map((a) => {
                    const pid = a.participants.find(p => p.type === 'practitioner')?.actorId;
                    const color = colorForId(pid);
                    return (
                      <div key={a.id} className="p-2 rounded border flex items-center justify-between cursor-pointer hover:shadow-sm" onClick={() => setDetailsAppt(a)}>
                        <div className="flex items-center gap-3">
                          <div style={{ width: 8, height: 40, backgroundColor: color, borderRadius: 4 }} aria-hidden />
                          <div>
                            <div className="font-medium">{a.participants.find(p => p.type === 'patient')?.display || 'Patient'}</div>
                            <div className="text-xs text-neutral-600">{fmtTime(a.start)} — {a.appointmentType || a.serviceType}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={a.status === 'booked' ? 'info' : a.status === 'cancelled' ? 'default' : 'warning'} size="sm">{a.status}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Today (day) view */}
      {view === 'today' && (
        <div className="space-y-3">
          <h3 className="font-semibold">{new Date(cursor).toLocaleDateString()}</h3>
          <div className="space-y-2">
            {visibleAppointments.filter(a => new Date(a.start).toDateString() === new Date(cursor).toDateString()).map(a => (
              <Card key={a.id} variant="outlined" className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.participants.find(p => p.type === 'patient')?.display}</div>
                    <div className="text-xs text-neutral-600">{fmtTime(a.start)} — {a.participants.find(p => p.type === 'practitioner')?.display} • {a.appointmentType || a.serviceType}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div><Badge variant={a.status === 'booked' ? 'info' : a.status === 'cancelled' ? 'default' : 'warning'} size="sm">{a.status}</Badge></div>
                    <div className="flex gap-2"><Button size="xs" variant="ghost" onClick={() => setDetailsAppt(a)}>Details</Button></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Month view */}
      {view === 'month' && (
        <div className="grid grid-cols-7 gap-3">
          {monthDays.map((d) => {
            const dayAppts = visibleAppointments.filter((a) => {
              const sd = new Date(a.start);
              return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth() && sd.getDate() === d.getDate();
            });
            return (
              <Card key={d.toISOString()} variant="outlined" className="p-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{d.getDate()}</div>
                  <div className="text-xs text-neutral-500">{dayAppts.length}</div>
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  {dayAppts.slice(0, 3).map(a => (
                    <div key={a.id} className="p-1 rounded bg-neutral-50">{fmtTime(a.start)} • {a.participants.find(p => p.type === 'patient')?.display}</div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* All view: flat list of all visible appointments */}
      {view === 'all' && (
        <div className="space-y-3">
          <h3 className="font-semibold">All appointments</h3>
          <div className="space-y-2">
            {visibleAppointments.sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map(a => (
              <Card key={a.id} variant="outlined" className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.participants.find(p => p.type === 'patient')?.display}</div>
                    <div className="text-xs text-neutral-600">{new Date(a.start).toLocaleString()} • {a.appointmentType || a.serviceType}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div><Badge variant={a.status === 'booked' ? 'info' : a.status === 'cancelled' ? 'ghost' : 'warning'} size="sm">{a.status}</Badge></div>
                    <div className="flex gap-2"><Button size="xs" variant="ghost" onClick={() => setDetailsAppt(a)}>Details</Button></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal open={bookModalOpen} onClose={() => setBookModalOpen(false)} title="Available Slots" size="lg">
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">Select a free slot to book (demo).</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {slots.filter(s => s.status === 'free' && new Date(s.start) >= startOfWeek && new Date(s.start) < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000) && (providerFilter === 'all' ? true : s.practitionerId === providerFilter) && (locationFilter === 'all' ? true : s.locationId === locationFilter)).map(s => (
              <div key={s.id} className="p-3 bg-white rounded border flex items-center justify-between">
                <div>
                  <div className="font-medium">{new Date(s.start).toLocaleString()}</div>
                  <div className="text-xs text-neutral-600">{providers.find(p => p.id === s.practitionerId)?.name || s.practitionerId} • {locations.find(l => l.id === s.locationId)?.name || s.locationId}</div>
                </div>
                <div>
                  <Button size="sm" variant="secondary" onClick={() => { const name = window.prompt('Patient name to book (demo):', 'New Patient'); if (name) { handleBook(s, name); } }}>Book</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal open={!!detailsAppt} onClose={() => setDetailsAppt(null)} title="Appointment Details" size="sm">
        {detailsAppt ? (
          <div className="space-y-3">
            <div><strong>Patient:</strong> {detailsAppt.participants.find(p => p.type === 'patient')?.display}</div>
            <div><strong>Time:</strong> {new Date(detailsAppt.start).toLocaleString()}</div>
            <div><strong>Provider:</strong> {detailsAppt.participants.find(p => p.type === 'practitioner')?.display}</div>
            <div><strong>Type:</strong> {detailsAppt.appointmentType}</div>
            <div><strong>Status:</strong> {detailsAppt.status}</div>
            <div><strong>Notes:</strong> {detailsAppt.description || detailsAppt.comment || '—'}</div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="ghost" onClick={() => detailsAppt && handleCancel(detailsAppt)}>Cancel</Button>
              <Button size="sm" variant="secondary" onClick={() => { const newSlot = slots.find(s => s.status === 'free'); if (newSlot) { rescheduleAppointment(detailsAppt!.id, newSlot.id).then(res => { if (res.success && res.appointment) { setAppointments(a => a.map(ap => ap.id === res.appointment!.id ? res.appointment! : ap)); setSlots(sl => sl.map(s => s.id === newSlot.id ? { ...s, status: 'busy' } : s)); setDetailsAppt(null); alert('Rescheduled'); } else { alert('Reschedule failed'); } }); } else { alert('No free slot to reschedule to (demo)'); } }}>Reschedule (auto)</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
