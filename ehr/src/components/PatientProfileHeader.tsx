'use client';

import React from 'react';

export default function PatientProfileHeader({ patient }: { patient: any }) {
  const initials = (patient.name || '').split(' ').map((s: string) => s[0]).slice(0,2).join('');

  return (
    <div className="sticky top-4 z-20">
      <div className="rounded-lg p-1 bg-gradient-to-r from-indigo-50 via-white to-rose-50">
        <div className="bg-white rounded-lg p-6 flex items-center gap-6 shadow-xl ring-1 ring-gray-100">
          <div className="flex items-center gap-6">
            <div className="rounded-full p-1 bg-gradient-to-br from-indigo-600 to-pink-500">
              {patient.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={patient.photoUrl} alt={patient.name} className="w-24 h-24 rounded-full object-cover border-2 border-white shadow" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-semibold text-2xl shadow border-2 border-white">
                  {initials}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">{patient.name}</h2>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-medium">{patient.age} yrs</span>
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-medium">{patient.gender}</span>
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-medium">MRN: {patient.mrn}</span>
              </div>

              <div className="mt-3 text-sm text-gray-600 flex flex-col">
                <span className="flex items-center gap-2"> <span className="text-gray-400">📞</span> {patient.contact?.phone || '—'}</span>
                <span className="flex items-center gap-2 mt-1"> <span className="text-gray-400">✉️</span> {patient.contact?.email || '—'}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="grid grid-cols-3 gap-6 w-full max-w-md">
              <div className="text-center">
                <div className="text-xs text-gray-500">Weight</div>
                <div className="mt-1 font-semibold text-gray-900">{patient.weight || '—'}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Height</div>
                <div className="mt-1 font-semibold text-gray-900">{patient.height || '—'}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Blood Type</div>
                <div className="mt-1 font-semibold text-gray-900">{patient.bloodType || '—'}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="text-sm text-gray-500 text-right">
              <div className="text-xs text-gray-400">Last seen</div>
              <div className="font-medium text-gray-900">{patient.lastVisit || '—'}</div>
              <div className="mt-1 text-xs text-gray-500">Attending: <span className="font-medium text-gray-900">{patient.lastAttendingDoctor || '—'}</span></div>
            </div>
            <div className="mt-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 text-sm font-semibold shadow-sm border border-emerald-200">{patient.insurance?.provider || 'No insurance'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
