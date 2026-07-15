"use client";

import React from "react";

type Appointment = {
  id: string;
  patient: string;
  type?: string;
  start?: string;
  end?: string;
  status?: string;
  provider?: string;
  location?: string;
  reason?: string;
};

type Props = {
  appointment: Appointment | null;
  onClose: () => void;
  onCancel?: (id: string) => void;
};

export default function AppointmentDetail({ appointment, onClose, onCancel }: Props) {
  if (!appointment) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-container">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottom: "1px solid var(--gray-200)" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--gray-600)" }}>Appointment Details</div>
            <h3 style={{ margin: 0 }}>{appointment.patient}</h3>
          </div>
          <div>
            <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 12 }}><strong>Time:</strong> {new Date(appointment.start || '').toLocaleString()} - {new Date(appointment.end || '').toLocaleTimeString()}</div>
          <div style={{ marginBottom: 12 }}><strong>Provider:</strong> {appointment.provider || '—'}</div>
          <div style={{ marginBottom: 12 }}><strong>Location:</strong> {appointment.location || '—'}</div>
          <div style={{ marginBottom: 12 }}><strong>Type:</strong> {appointment.type || '—'}</div>
          <div style={{ marginBottom: 12 }}><strong>Status:</strong> {appointment.status || '—'}</div>
          <div style={{ marginBottom: 12 }}><strong>Reason:</strong> {appointment.reason || '—'}</div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn-action btn-edit" onClick={() => alert('Edit (demo)')}>✏️ Edit Appointment</button>
            <button className="btn-action btn-reschedule" onClick={() => alert('Reschedule (demo)')}>Reschedule</button>
            <button className="btn-action btn-cancel" onClick={() => { if (onCancel) onCancel(appointment.id); else alert('Cancel (demo)'); }}>❌ Cancel</button>
            <button className="btn-action btn-primary" onClick={() => window.print()}>🖨️ Print Summary</button>
          </div>
        </div>
      </div>
    </div>
  );
}
