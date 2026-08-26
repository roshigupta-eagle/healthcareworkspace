'use client';

import React, { useState } from 'react';
import { IconX, IconMessageSquare, IconCheck } from './AllergyIcons';

interface Props {
  patient: any;
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}

export default function MessagePatientDrawer({ patient, isOpen, onClose, onSent }: Props) {
  const [subject, setSearchSubject] = useState('Allergy Review Confirmation');
  const [body, setBody] = useState(
    `Dear ${patient?.name || 'Patient'},\n\nWe are updating your electronic health record. Please confirm if you have experienced any new drug, food, or environmental allergies or changes in existing reactions since your last visit.\n\nThank you,\nClinical Care Team`
  );
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    // Simulate secure messaging API call
    setTimeout(() => {
      setSending(false);
      onSent();
      onClose();
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-[540px] bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#DDE7F0] bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0">
              <IconMessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#121A2D]">Message Patient</h2>
              <p className="text-xs text-gray-500">Send secure portal message regarding allergy documentation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSend} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Recipient
            </label>
            <input
              type="text"
              disabled
              value={`${patient.name} (${patient.email || 'Patient Portal'})`}
              className="w-full text-sm p-2.5 border border-gray-200 rounded-xl bg-slate-50 font-semibold text-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSearchSubject(e.target.value)}
              className="w-full text-sm p-2.5 border border-gray-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Message Body
            </label>
            <textarea
              required
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full text-sm p-3 border border-gray-300 rounded-xl font-sans"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow transition-colors flex items-center gap-1.5"
            >
              <IconCheck className="w-4 h-4" />
              <span>{sending ? 'Sending Message...' : 'Send Secure Message'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
