"use client";

import React, { useEffect, useRef, useState } from 'react';
import { PatientBanner } from '@/design-system/clinical/PatientBanner';
import Link from 'next/link';
// MessageDrawer removed in favor of a full Messages page

const MORE_ACTIONS = (patientId: string) => [
  { label: 'Add Clinical Note', href: `/dashboard/records/${patientId}/doctor-notes/new` },
  { label: 'Upload Document', href: `/dashboard/records/${patientId}/documents/upload` },
  { label: 'Create Task', href: `/dashboard/records/${patientId}/tasks/new` },
  { label: 'Add Condition', href: `/dashboard/records/${patientId}/conditions/new` },
  { label: 'Record Allergy', href: `/dashboard/records/${patientId}/allergies/new` },
  { label: 'Add Immunization', href: `/dashboard/records/${patientId}/immunizations/new` },
  { label: 'Add Medication', href: `/dashboard/records/${patientId}/medications/new` },
  { label: 'Create Referral', href: `/dashboard/records/${patientId}/referrals/new` },
];

export default function PatientProfileHeader({ patient, showActions = true }: { patient: any; showActions?: boolean }) {
  // messaging now routes to a dedicated Messages page
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const names = (patient.name || '').split(' ');
  const firstName = names[0] || '';
  const lastName = names.slice(1).join(' ') || '';
  const dob = patient.dob || '';
  const age = patient.age || 0;
  const gender = patient.gender || 'Unknown';
  const sex = (gender === 'Male' || gender === 'Female' || gender === 'Other') ? gender : 'Unknown';
  // Provide only additional identifiers (phone/email) here — MRN is shown separately in the banner
  const identifiers: Array<{ label: string; value: string; href?: string }> = [];
  if (patient.contact?.phone) identifiers.push({ label: 'Phone', value: patient.contact.phone, href: `/dashboard/records/${patient.id}/contact-preferences#phone` });
  if (patient.contact?.email) identifiers.push({ label: 'Email', value: patient.contact.email, href: `/dashboard/records/${patient.id}/contact-preferences#email` });
  if (patient.preferredLanguage) identifiers.push({ label: 'Preferred Language', value: patient.preferredLanguage });
  const allergies = patient.allergies || [];

  const isHighRisk = patient.riskLevel
    ? patient.riskLevel === 'High'
    : (patient.conditions || []).some((c: string) => ['Hypertension', 'Type 2 Diabetes', 'Heart Failure', 'CAD'].includes(c)) || (patient.age || 0) >= 65;
  const riskLabel = patient.riskLevel || (isHighRisk ? 'High' : 'Low');
  const moreActions = MORE_ACTIONS(patient.id);

  return (
    <div className="sticky top-4 z-20 space-y-3">
      <PatientBanner
        mrn={patient.mrn}
        firstName={firstName}
        lastName={lastName}
        dateOfBirth={dob}
        age={age}
        sex={sex as any}
        allergies={allergies}
        allergyHref={`/dashboard/records/${patient.id}/allergies`}
        identifiers={identifiers}
        verificationStatus="verified"
        className="rounded-t-lg"
      />

      <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-100 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <div className="text-xs text-gray-500">Clinical Risk</div>
            {isHighRisk ? (
              <Link
                href={`/patients/${patient.id}/risk-profile`}
                title={`Open clinical risk profile for ${patient.name}`}
                aria-label={`Open clinical risk profile for ${patient.name}, risk level ${riskLabel}`}
                className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md text-sm font-semibold bg-red-50 text-red-700 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-300"
              >
                {riskLabel} Clinical Risk
              </Link>
            ) : (
              <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md text-sm font-semibold bg-emerald-50 text-emerald-700">{riskLabel}</div>
            )}
          </div>

          <div>
            <div className="text-xs text-gray-500">Last seen</div>
            <div className="mt-1 font-medium text-gray-900">{patient.lastVisit || '—'}</div>
            <div className="text-xs text-gray-500">{patient.lastAttendingDoctor || '—'}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Weight</div>
            <div className="mt-1 font-medium text-gray-900">{patient.weight || '—'}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Primary Physician</div>
            <div className="mt-1 font-medium text-gray-900">{patient.lastAttendingDoctor || '—'}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Data Updated</div>
            <div className="mt-1 font-medium text-gray-900">
              {patient.dataUpdatedAt ? formatDateTimeConsistent(patient.dataUpdatedAt) : '—'}
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/encounters/new?patientId=${patient.id}`} className="inline-flex items-center gap-3 rounded-md bg-teal-700 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500" aria-label={`Start encounter for ${patient.name}`}>
            {/* Stethoscope / clipboard icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h6M9 8h6M5 6h14v12H5z" />
            </svg>
            <span>Start Encounter</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-1" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            </Link>

            <Link href={`/dashboard/orders/labs/new?patientId=${patient.id}`} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 text-sm px-3 py-2 hover:bg-gray-50" aria-label={`Order labs for ${patient.name}`}>Order Lab</Link>
            <Link href={`/dashboard/prescriptions/new?patientId=${patient.id}`} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 text-sm px-3 py-2 hover:bg-gray-50" aria-label={`Prescribe for ${patient.name}`}>Prescribe</Link>
            <Link
              href={`/dashboard/records/${patient.id}/messages`}
              className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 text-sm px-3 py-2 text-gray-700 hover:bg-gray-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400"
              aria-label={`Open messages for ${patient.name}`}
              title={patient.messagingDisabled ? 'Messaging disabled for this patient' : 'Open messages'}
              onClick={(e) => { if (patient.messagingDisabled) e.preventDefault(); }}
            >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-teal-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 4V5z" />
            </svg>
            <span>Message</span>
            {patient?.unreadMessagesCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold bg-teal-600 text-white rounded-full">{patient.unreadMessagesCount}</span>
            )}
            </Link>

            <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 text-sm px-3 py-2 text-gray-700 hover:bg-gray-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400"
            >
              <span>More Actions</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden>
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {moreOpen && (
              <div
                role="menu"
                aria-label="More patient actions"
                className="absolute right-0 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black/5 py-1 z-30"
              >
                {moreActions.map((action) => (
                  <Link
                    key={action.href}
                    role="menuitem"
                    href={action.href}
                    onClick={() => setMoreOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateTimeConsistent(iso?: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = months[d.getMonth()] || '';
    const day = d.getDate();
    const year = d.getFullYear();
    let hour = d.getHours();
    const minute = d.getMinutes();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${month} ${day}, ${year}, ${hour}:${pad(minute)} ${ampm}`;
  } catch (e) {
    return iso;
  }
}

