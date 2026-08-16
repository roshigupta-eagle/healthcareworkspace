"use client";

import React from 'react';
import Link from 'next/link';

export default function DashboardHeader() {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <header className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cardiology Command Center</h1>
        <p className="text-sm text-gray-600 mt-1">Monitor patient flow, urgent alerts, appointments, clinical tasks, and pending care activities.</p>
        <p className="text-xs text-gray-400 mt-1">{today} • Toronto Cardiology Clinic • Dr. Sarah Lee</p>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/dashboard/records" className="px-3 py-1 rounded bg-white border hover:bg-gray-50 focus:outline-none focus:ring" title="View Patients" aria-label="View Patients">
          View Patients
        </Link>
        <Link href="/dashboard/encounters" className="px-3 py-1 rounded bg-white border hover:bg-gray-50 focus:outline-none focus:ring" title="View Encounters" aria-label="View Encounters">
          View Encounters
        </Link>
        <Link href="/doctor/appointments" className="px-3 py-1 rounded bg-white border hover:bg-gray-50 focus:outline-none focus:ring" title="View Appointments" aria-label="View Appointments">
          Appointments
        </Link>
        <Link href="/dashboard/orders" className="px-3 py-1 rounded bg-white border hover:bg-gray-50 focus:outline-none focus:ring" title="View Orders" aria-label="View Orders">
          View Orders
        </Link>
        <Link href="/doctor/health-records" className="px-3 py-1 rounded bg-white border hover:bg-gray-50 focus:outline-none focus:ring" title="View Health Records" aria-label="View Health Records">
          View Health Records
        </Link>
      </div>
    </header>
  );
}
