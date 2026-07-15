"use client";

import React, { useState } from 'react';
import Link from 'next/link';

export default function FloatingActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-6 bottom-6 z-50">
      <div className="flex flex-col items-end gap-2">
        {open && (
          <div className="mb-2 bg-white rounded-lg shadow-lg p-2 ring-1 ring-gray-100">
            <Link href="/dashboard/appointments/new" className="block px-3 py-2 text-sm hover:bg-gray-50 rounded">New Appointment</Link>
            <Link href="/dashboard/prescriptions/new" className="block px-3 py-2 text-sm hover:bg-gray-50 rounded">New Prescription</Link>
            <Link href="/dashboard/labs/order" className="block px-3 py-2 text-sm hover:bg-gray-50 rounded">Order Lab</Link>
            <Link href="/dashboard/records/new" className="block px-3 py-2 text-sm hover:bg-gray-50 rounded">New Patient</Link>
          </div>
        )}

        <button onClick={() => setOpen(!open)} aria-label="Quick actions" className="w-14 h-14 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-lg hover:bg-teal-500 transition">
          <span className="text-2xl">+</span>
        </button>
      </div>
    </div>
  );
}
