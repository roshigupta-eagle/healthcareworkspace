"use client";

import React, { useMemo, useState } from "react";

type Slot = { id: string; start: string; end: string; practitioner?: string; location?: string; status?: string };

type Props = {
  open: boolean;
  slots?: Slot[];
  onClose: () => void;
  onBook: (slot: Slot | null, patientData: { patientName: string; appointmentType?: string; reason?: string; provider?: string }) => void;
};

export default function BookingModal({ open, slots = [], onClose, onBook }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(slots[0] || null);
  const [patientName, setPatientName] = useState("");
  const [appointmentType, setAppointmentType] = useState("checkup");
  const [reason, setReason] = useState("");

  // update selectedSlot if incoming slots change
  React.useEffect(() => {
    if (slots && slots.length && !selectedSlot) setSelectedSlot(slots[0]);
  }, [slots]);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-container">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottom: "1px solid var(--gray-200)" }}>
          <div>
            <h3 style={{ margin: 0 }}>Book New Appointment</h3>
            <div style={{ fontSize: 13, color: "var(--gray-600)" }}>Select a slot and enter patient details</div>
          </div>
          <div>
            <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16, padding: 16 }}>
          <div>
            <div style={{ marginBottom: 12 }}>
              <strong>Available Slots</strong>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {slots.length === 0 && <div className="text-sm text-neutral-500">No free slots for selected range.</div>}
              {slots.map((s) => (
                <button key={s.id} className={`booking-slot ${selectedSlot?.id === s.id ? "selected" : ""}`} onClick={() => setSelectedSlot(s)}>
                  <div style={{ fontWeight: 600 }}>{new Date(s.start).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "var(--gray-600)" }}>{s.practitioner} • {s.location}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <form onSubmit={(e) => { e.preventDefault(); if (!patientName) { alert('Please enter patient name'); return; } onBook(selectedSlot, { patientName, appointmentType, reason }); }}>
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Patient Name <span style={{ color: "var(--status-cancelled)" }}>*</span></label>
                <input className="form-input" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Full Name" />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Appointment Type</label>
                <select className="form-select" value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)}>
                  <option value="checkup">Annual Checkup</option>
                  <option value="followup">Follow-Up</option>
                  <option value="consultation">Consultation</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Reason for Visit</label>
                <textarea className="form-textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn-submit">Book Appointment</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
