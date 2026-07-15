"use client";

import React, { useMemo, useState } from "react";
import "./scheduling.css";
import "./scheduling-theme.css";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import BookingModal from "./BookingModal";
import AppointmentDetail from "./AppointmentDetail";
import { isSameDay, formatDateToISO } from "./dateUtils";

type View = "today" | "week" | "month";

const sampleAppointments = [
  {
    id: "APT-2026-001",
    patient: "John Smith",
    type: "Checkup",
    start: new Date().toISOString(),
    end: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    status: "confirmed",
    provider: "Dr. Sarah Anderson",
    location: "Room 101",
    reason: "Annual physical examination",
  },
  {
    id: "APT-2026-002",
    patient: "Sarah Johnson",
    type: "Follow-up",
    start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    status: "pending",
    provider: "Dr. Carlos Martinez",
    location: "Room 203",
    reason: "Diabetes Management",
  },
];

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function fmtTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function SchedulingAppClient() {
  const [view, setView] = useState<View>("week");
  const [search, setSearch] = useState("");
  const [appointments, setAppointments] = useState(sampleAppointments as any[]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [detailsAppt, setDetailsAppt] = useState<any | null>(null);

  const slots = useMemo(() => {
    const base = new Date();
    base.setHours(9, 0, 0, 0);
    return Array.from({ length: 8 }).map((_, i) => {
      const s = new Date(base.getTime() + i * 30 * 60000);
      const e = new Date(s.getTime() + 30 * 60000);
      return { id: `slot-${i}`, start: s.toISOString(), end: e.toISOString(), practitioner: 'Dr. Sarah Anderson', location: 'Main Clinic', status: 'free' };
    });
  }, []);
  const today = useMemo(() => new Date(), []);

  function handleBook(slot: any | null, patientData: any) {
    const start = slot?.start ?? new Date().toISOString();
    const end = slot?.end ?? new Date(Date.parse(start) + 30 * 60000).toISOString();
    const newAppt = {
      id: `APT-${Date.now()}`,
      patient: patientData.patientName || 'New Patient',
      type: patientData.appointmentType || 'Checkup',
      start,
      date: formatDateToISO(new Date(start)),
      end,
      status: 'confirmed',
      provider: patientData.provider || slot?.practitioner || 'Any',
      location: slot?.location || 'Clinic',
      reason: patientData.reason || '',
    };
    setAppointments((s) => [newAppt, ...s]);
    setBookingOpen(false);
    alert('Booked appointment (demo)');
  }

  function handleCancel(id: string) {
    if (!confirm('Cancel this appointment?')) return;
    setAppointments((s) => s.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)));
    setDetailsAppt(null);
  }

  return (
    <div className="main-container">
      <header className="header">
        <div className="navigation-bar">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Scheduling</h1>
            <div className="view-toggle-group" role="group" aria-label="Calendar view selection">
              <button className={`view-btn ${view === "today" ? "active" : ""}`} data-view="today" aria-pressed={view === "today"} onClick={() => setView("today")}>
                <span className="btn-icon">📅</span>
                <span className="btn-label">Today</span>
                <span className="btn-date" id="today-date">{today.toLocaleDateString('en-US')}</span>
              </button>
              <button className={`view-btn ${view === "week" ? "active" : ""}`} data-view="week" aria-pressed={view === "week"} onClick={() => setView("week")}>
                <span className="btn-label">Week</span>
              </button>
              <button className={`view-btn ${view === "month" ? "active" : ""}`} data-view="month" aria-pressed={view === "month"} onClick={() => setView("month")}>
                <span className="btn-label">Month</span>
              </button>
            </div>
          </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Button onClick={() => setBookingOpen(true)}>+ Book Appointment</Button>
          </div>
        </div>
      </header>

      <div className="filters-bar">
        <div className="search-container">
          <div className="search-wrapper">
            <input className="search-input" placeholder="Search patients, appointments, or providers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="filter-btn">Client ▾</button>
          <button className="filter-btn">Type ▾</button>
          <button className="filter-btn">Status ▾</button>
          <button className="filter-btn">Provider ▾</button>
          <button className="clear-filters-btn">Clear All Filters</button>
        </div>
      </div>

      <div className="content-area">
        {view === "week" && (
          <div className="week-view">
            <div className="week-grid-container">
              <div className="week-grid">
                {/* Render 7 day columns */}
                  {Array.from({ length: 7 }).map((_, i) => {
                  const dayDate = new Date();
                  dayDate.setHours(0,0,0,0);
                  dayDate.setDate(dayDate.getDate() + i);

                  const dayAppointments = appointments
                    .filter((a) => isSameDay(a.start ?? a.date, dayDate))
                    .sort((a,b) => (new Date(a.start).getTime() || 0) - (new Date(b.start).getTime() || 0));

                  return (
                    <div key={i} className={`day-column ${isSameDay(dayDate, today) ? 'today' : ''}`} data-date={dayDate.toISOString()}>
                      <div className="day-header">
                        <span className="day-name">{dayDate.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className="day-date">{dayDate.getDate()}</span>
                      </div>
                      <div className="day-content">
                        <div className="appointments-list">
                          {dayAppointments.length === 0 && <div className="empty-day">No appointments</div>}
                          {dayAppointments.map((a) => (
                            <div key={a.id} className={`mini-appointment-card ${a.type?.toLowerCase()}`} onClick={() => setDetailsAppt(a)}>
                              <div className="mini-card-time">{fmtTime(a.start)}</div>
                              <div className="mini-card-patient">{a.patient}</div>
                              <div className="mini-card-type">{a.type}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="day-footer">
                        <span className="appointment-count">{dayAppointments.length} appointments</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {view === "today" && (
          <div className="today-view">
            <div className="view-header">
              <h2 className="view-title">
                <span className="view-name">Today</span>
                <span className="view-date">{new Date().toLocaleDateString()}</span>
              </h2>
            </div>

            <div className="timeline-container">
              {appointments.map((a) => (
                  <div key={a.id} className={`appointment-card ${a.status}`} onClick={() => setDetailsAppt(a)}>
                    <div className="card-header">
                      <span className={`appointment-type-badge ${a.type.toLowerCase()}`}>🏥 {a.type.toUpperCase()}</span>
                      <span className="appointment-time">{fmtTime(a.start)} - {fmtTime(a.end)}</span>
                    </div>
                    <div className="card-body">
                      <h3 className="patient-name">{a.patient}</h3>
                      <p className="appointment-reason">{a.reason}</p>
                      <div className="card-meta">
                        <span className="meta-item">📍 {a.location}</span>
                        <span className="meta-item">👨‍️ {a.provider}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {view === "month" && (
          <div className="month-view">
            <div className="month-calendar-container">
              <div className="month-calendar">
                <div className="calendar-header-row">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                    <div key={d} className="calendar-day-header">{d}</div>
                  ))}
                </div>
                {/* Month grid rendering: 6 weeks to cover month spillover */}
                {(() => {
                  const start = new Date(today.getFullYear(), today.getMonth(), 1);
                  const startDay = start.getDay();
                  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                  const totalCells = 42; // 6 weeks
                  const cells = Array.from({ length: totalCells }).map((_, idx) => {
                    const dayNum = idx - startDay + 1;
                    const inMonth = dayNum > 0 && dayNum <= daysInMonth;
                    const dateObj = new Date(today.getFullYear(), today.getMonth(), inMonth ? dayNum : 1);
                    return { idx, dayNum: inMonth ? dayNum : null, inMonth, dateObj };
                  });

                  return <div className="calendar-week-row">
                    {cells.map((c) => {
                      // Map appointments that fall on this date
                      const appts = appointments.filter(a => isSameDay(a.start ?? a.date, c.dateObj));

                      return (
                        <div key={c.idx} className={`calendar-day-cell ${c.inMonth ? '' : 'other-month'} ${c.inMonth && c.dateObj.toDateString() === today.toDateString() ? 'today' : ''}`} data-date={c.dateObj.toISOString()}>
                          <span className="day-number">{c.dayNum ?? ''}</span>
                          {appts.length > 0 && <div className="appointment-count-badge">{appts.length}</div>}
                          <div className="day-appointments-indicator">
                            {appts.slice(0,4).map((a,i) => (
                              <span key={a.id} className={`appointment-dot ${i % 6 === 0 ? 'blue' : i % 6 === 1 ? 'green' : i % 6 === 2 ? 'red' : i % 6 === 3 ? 'yellow' : i % 6 === 4 ? 'purple' : 'teal'}`} title={`${a.patient} • ${a.type}`}></span>
                            ))}
                          </div>

                          <div className="day-events-preview">
                            {appts.map((a) => (
                              <div key={a.id} className={`mini-event ${a.type.toLowerCase() === 'follow-up' ? 'yellow' : a.type.toLowerCase() === 'checkup' ? 'green' : 'blue'}`}>
                                <div style={{ fontWeight: 700 }}>{a.patient}</div>
                                <div style={{ fontSize: 12 }}>{fmtTime(a.start)} • {a.type}</div>
                              </div>
                            ))}
                            {appts.length === 0 && <div className="mini-event">No appointments</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>;
                })()}
              </div>
              <div className="calendar-legend">
                <div className="legend-item"><span className="legend-dot blue"></span><span className="legend-label">Checkup</span></div>
                <div className="legend-item"><span className="legend-dot green"></span><span className="legend-label">Follow-up</span></div>
                <div className="legend-item"><span className="legend-dot red"></span><span className="legend-label">Urgent</span></div>
                <div style={{ marginLeft: 'auto', color: 'var(--gray-600)', fontSize: 13 }}>Month view • {today.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <BookingModal open={bookingOpen} slots={slots} onClose={() => setBookingOpen(false)} onBook={handleBook} />
      <AppointmentDetail appointment={detailsAppt} onClose={() => setDetailsAppt(null)} onCancel={handleCancel} />
    </div>
  );
}
