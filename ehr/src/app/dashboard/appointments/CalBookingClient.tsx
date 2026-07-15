"use client"

import React, { useEffect, useMemo, useState } from 'react'
import './cal-theme.css'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { fetchSlots, fetchAppointments, bookAppointment, providers as mockProviders, locations as mockLocations } from '@/scheduling/services/scheduling.mock'

const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function CalBookingClient({ initialAppointments = [], currentUser = null }: { initialAppointments?: any[]; currentUser?: any }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [slots, setSlots] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>(initialAppointments || [])
  const [providers] = useState(() => mockProviders)
  const [locations] = useState(() => mockLocations)

  const [cursor, setCursor] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null)
  const [filterProvider, setFilterProvider] = useState<string | null>(null)
  const [availableOnly, setAvailableOnly] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [patientName, setPatientName] = useState(currentUser?.name || '')
  const [appointmentType, setAppointmentType] = useState('Consultation')

  useEffect(() => {
    let mountedFlag = true
    fetchSlots().then(s => { if (mountedFlag) setSlots(s) }).catch(()=>{})
    fetchAppointments().then(a => { if (mountedFlag) setAppointments(a) }).catch(()=>{})
    return () => { mountedFlag = false }
  }, [])

  const days = useMemo(() => {
    const out: Date[] = []
    const start = new Date(cursor)
    start.setDate(start.getDate() - 3)
    for (let i = 0; i < 9; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      out.push(d)
    }
    return out
  }, [cursor])

  const visibleSlots = useMemo(() => {
    if (!selectedDate) return []
    const dayKey = selectedDate.toDateString()
    return slots.filter(s => new Date(s.start).toDateString() === dayKey)
      .filter(s => !filterProvider || s.practitionerId === filterProvider)
      .filter(s => (availableOnly ? s.status === 'free' : true))
      .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }, [slots, selectedDate, filterProvider, availableOnly])

  function pad(n: number) { return String(n).padStart(2, '0') }

  function fmtTime(t: string) {
    try {
      const d = new Date(t)
      if (mounted) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch (e) { return t }
  }

  async function handleBook(slot: any) {
    if (!patientName) { alert('Enter patient name'); return }
    try {
      const res = await bookAppointment({ slotId: slot.id, patient: { id: `patient-${Date.now()}`, name: patientName } })
      if (res.success && res.appointment) {
        setAppointments((s) => [res.appointment, ...s])
        const fresh = await fetchSlots()
        setSlots(fresh)
        setSelectedSlot(res.appointment)
        alert('Booked appointment')
      } else {
        alert('Failed to book: ' + (res.message || 'unknown'))
      }
    } catch (e) {
      alert('Booking error')
    }
  }

  return (
    <div className="w-full rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Book Appointment</h2>
          <div className="text-sm text-neutral-600">Two-pane scheduling workspace</div>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterProvider || ''} onChange={(e) => setFilterProvider(e.target.value || null)} className="border rounded px-2 py-1">
            <option value="">All providers</option>
            {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label className="text-sm"><input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="mr-1"/>Available only</label>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5 bg-white rounded shadow-sm p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button onClick={() => { const d = new Date(cursor); d.setDate(cursor.getDate()-7); setCursor(d) }} className="px-2 py-1 border rounded">◀</button>
              <div className="font-medium">{mounted ? cursor.toLocaleDateString() : cursor.toISOString().slice(0,10)}</div>
              <button onClick={() => { const d = new Date(cursor); d.setDate(cursor.getDate()+7); setCursor(d) }} className="px-2 py-1 border rounded">▶</button>
            </div>
            <div className="text-sm text-neutral-500">Swipe days • Live</div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => (
              <button key={d.toISOString()} onClick={() => setSelectedDate(d)} className={`flex-0 px-3 py-2 rounded ${selectedDate && d.toDateString() === selectedDate.toDateString() ? 'bg-sky-50 border border-sky-200' : 'bg-white border'}`}>
                <div className="text-xs text-neutral-500">{WEEKDAYS[d.getDay()]}</div>
                <div className="font-medium">{d.getDate()}</div>
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            {visibleSlots.length === 0 && <div className="text-sm text-neutral-500 p-4">No slots</div>}
            {visibleSlots.map(s => (
              <div key={s.id} className={`p-3 rounded border flex items-center justify-between ${s.status === 'free' ? 'bg-white' : 'bg-neutral-50 text-neutral-400'}`}>
                <div>
                  <div className="font-medium">{fmtTime(s.start)} — {fmtTime(s.end)}</div>
                  <div className="text-sm text-neutral-500">{providers.find((p:any)=>p.id===s.practitionerId)?.name} • {locations.find((l:any)=>l.id===s.locationId)?.name}</div>
                </div>
                <div>
                  <button disabled={s.status!=='free'} onClick={() => handleBook(s)} className={`px-3 py-1 rounded ${s.status==='free' ? 'bg-sky-600 text-white' : 'bg-neutral-200 text-neutral-500'}`}>{s.status==='free' ? 'Book' : 'Booked'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-7 bg-white rounded shadow-sm p-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm font-medium">Search patient</label>
              <input value={searchQ} onChange={(e)=>setSearchQ(e.target.value)} placeholder="Search patient..." className="mt-1 w-full border rounded px-3 py-2" />
              <div className="mt-2 text-sm text-neutral-500">Type to search — mock autocomplete</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Patient name</label>
                <input value={patientName} onChange={(e)=>setPatientName(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-medium">Appointment type</label>
                <select value={appointmentType} onChange={(e)=>setAppointmentType(e.target.value)} className="mt-1 w-full border rounded px-2 py-2">
                  <option>Consultation</option>
                  <option>Follow-up</option>
                  <option>Vaccination</option>
                  <option>Virtual</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Selected slot</label>
              <div className="mt-1 p-3 border rounded bg-neutral-50">
                {selectedSlot ? (
                  <div>
                    <div className="font-medium">{mounted ? new Date(selectedSlot.start).toLocaleString() : new Date(selectedSlot.start).toISOString().slice(0,16).replace('T',' ')}</div>
                    <div className="text-sm text-neutral-500">{providers.find((p:any)=>p.id===selectedSlot.practitionerId)?.name}</div>
                  </div>
                ) : (
                  <div className="text-sm text-neutral-500">No slot selected</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={async () => {
                const draft = { patientName, appointmentType, selectedSlot }
                localStorage.setItem('apptDraft', JSON.stringify(draft))
                alert('Draft saved')
              }}>Save Draft</Button>

              <Button onClick={() => {
                const slot = visibleSlots.find(s => s.status === 'free')
                if (!slot) return alert('No free slots')
                setSelectedSlot(slot)
                handleBook(slot)
              }} variant="primary">Book Appointment →</Button>

              <Button onClick={() => { if (selectedSlot) handleBook(selectedSlot) }} variant="ghost">Book & Open Chart</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
