"use client";

import React, { useState } from 'react';
import { Modal } from '@/design-system/components';
import { Button } from './ui';

export interface CancelAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  patientName: string;
  dateLabel: string;
  timeLabel: string;
  provider: string;
  onConfirm: (payload: { reason: string; notifyPatient: boolean }) => Promise<void> | void;
}

/**
 * Single, deliberate Cancel Appointment workflow (spec: never duplicate this
 * destructive action). Waits for the (simulated) backend confirmation before
 * closing so the UI never claims success prematurely.
 */
export default function CancelAppointmentDialog({
  open,
  onClose,
  patientName,
  dateLabel,
  timeLabel,
  provider,
  onConfirm,
}: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState('');
  const [notifyPatient, setNotifyPatient] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm({ reason: reason.trim(), notifyPatient });
      setReason('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title="Cancel Appointment"
      description="This cancels the scheduled visit. The patient's chart and history are preserved."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Keep Appointment
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting} className="bg-red-600 !text-white border-red-600 hover:bg-red-700">
            {submitting ? 'Cancelling…' : 'Cancel Appointment'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <dl className="grid grid-cols-2 gap-y-2 gap-x-4 bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div>
            <dt className="text-xs text-gray-500">Patient</dt>
            <dd className="font-medium text-gray-900">{patientName}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Provider</dt>
            <dd className="font-medium text-gray-900">{provider}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Date</dt>
            <dd className="font-medium text-gray-900">{dateLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Time</dt>
            <dd className="font-medium text-gray-900">{timeLabel}</dd>
          </div>
        </dl>

        <div>
          <label htmlFor="cancel-reason" className="block text-xs font-medium text-gray-600 mb-1">
            Cancellation reason
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            placeholder="e.g. Patient requested reschedule"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={notifyPatient}
            onChange={(e) => setNotifyPatient(e.target.checked)}
            className="rounded border-gray-300 text-teal-600 focus:ring-teal-400"
          />
          Notify patient of cancellation
        </label>
      </div>
    </Modal>
  );
}
