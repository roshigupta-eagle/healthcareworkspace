"use client"

import React, { useMemo, useState } from 'react'
import './scheduling.css'

type EventItem = {
  id: string
  patient: string
  type: string
  start: string // ISO
  end: string
  status: 'booked' | 'pending' | 'proposed' | 'arrived' | 'fulfilled' | 'cancelled'
}

const STATUS_COLOR: Record<string, string> = {
  booked: '#039be5',
  pending: '#f4511e',
  proposed: '#9e9e9e',
  arrived: '#33b679',
  fulfilled: '#009688',
  cancelled: '#d50000',
}

function startOfWeek(d: Date) {
  const dt = new Date(d)
  const day = dt.getDay()
  dt.setDate(dt.getDate() - day)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function formatShort(d: Date) {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function SchedulingClient() {
  const [today] = useState(() => new Date())
  const [view, setView] = useState<'week' | 'month' | 'day' | 'all'>('week')
  const [query, setQuery] = useState('')

  const weekStart = useMemo(() => startOfWeek(today), [today])
  const days = useMemo(() => {
    const arr: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      arr.push(d)
    }
    return arr
  }, [weekStart])

  // sample data for demo
  const [events] = useState<EventItem[]>(() => {
    const s = new Date()
    const sunday = startOfWeek(s)
    const make = (offset: number, hh: number, mm = 0, status: EventItem['status'], patient = 'John Smith', type = 'Consultation') => {
      const day = new Date(sunday)
      day.setDate(sunday.getDate() + offset)
      day.setHours(hh, mm, 0, 0)
      const end = new Date(day.getTime() + 30 * 60000)
      return {
        id: `${offset}-${hh}-${mm}`,
        patient,
        type,
        start: day.toISOString(),
        end: end.toISOString(),
        status,
      }
    }
    return [
      make(2, 11, 0, 'booked', 'John Smith'),
      make(2, 13, 30, 'pending', 'Mary Johnson', 'Follow-up'),
      make(4, 9, 0, 'arrived', 'Carlos Vega', 'Check-in'),
      make(0, 15, 0, 'cancelled', 'A. Patient', 'Telehealth'),
    ]
  })

  const eventsByDay = useMemo(() => {
    const m: Record<string, EventItem[]> = {}
    for (const d of days) {
      m[d.toDateString()] = []
    }
    for (const e of events) {
      const dt = new Date(e.start)
      const key = dt.toDateString()
      if (!m[key]) m[key] = []
      m[key].push(e)
    }
    return m
  }, [days, events])

  return (
    <div className="sched-page">
      <div className="sched-topbar">
        <div className="sched-left">
          <button className="hamburger" aria-label="Toggle sidebar">☰</button>
          <h1 className="sched-title">Scheduling</h1>
        </div>

        <div className="sched-center">
          <input
            className="sched-search"
            placeholder="Search patients, providers, locations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
          />
        </div>

        <div className="sched-right">
          <div className="view-toggle" role="tablist">
            {['day', 'week', 'month', 'all'].map((v) => (
              <button key={v} className={`view-btn ${view === (v as any) ? 'active' : ''}`} onClick={() => setView(v as any)}>
                {v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sched-filterbar">
        <div className="filters-left">
          <button className="filter-btn">All Providers ▾</button>
          <button className="filter-btn">All Locations ▾</button>
        </div>
        <div className="filters-right">
          <div className="status-chips">
            {['booked', 'pending', 'proposed', 'arrived', 'fulfilled', 'cancelled'].map((s) => (
              <button key={s} className={`chip ${s === 'booked' ? 'chip-active' : ''}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar week grid (simple) */}
      <div className="sched-grid">
        {days.map((d) => {
          const items = eventsByDay[d.toDateString()] || []
          const isToday = d.toDateString() === new Date().toDateString()
          return (
            <div key={d.toISOString()} className="day-column">
              <div className="day-header">
                <div>
                  <div className="day-name">{d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()}</div>
                  <div className={`day-number ${isToday ? 'today' : ''}`}>{d.getDate()}</div>
                </div>
                <div className="day-count">{items.length} appts</div>
              </div>

              <div className="day-body">
                {items.length === 0 ? (
                  <div className="empty-day">No appointments</div>
                ) : (
                  items.map((it) => (
                    <div key={it.id} className={`event-card ${it.status}`} style={{ borderLeftColor: STATUS_COLOR[it.status] }} role="button" tabIndex={0}>
                      <div className="event-left" />
                      <div className="event-body">
                        <div className="event-title">{it.patient}</div>
                        <div className="event-meta">{formatShort(new Date(it.start))} — {it.type}</div>
                      </div>
                      <div className="event-badge" style={{ background: STATUS_COLOR[it.status], color: '#fff' }}>{it.status}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
