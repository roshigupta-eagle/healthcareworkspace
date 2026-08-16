"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import BackToPatientButton from '@/components/BackToPatientButton';

function Badge({ children, className = '' }: any) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>;
}

export default function AppointmentDetailClient({ appointment, patient }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const apptDate = new Date(appointment.date);
  const month = apptDate.toLocaleString(undefined, { month: 'short' }).toUpperCase();
  const day = apptDate.getDate();
  const year = apptDate.getFullYear();
  const timeLabel = apptDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const startAi = () => {
    setAiLoading(true);
    setAiSummary(null);
    setTimeout(() => {
      setAiSummary('This follow-up appointment appears routine. Review BP, medication adherence, recent lipid panel (LDL 2.6 mmol/L). Prepare to discuss dizziness and check home BP log. Intake forms incomplete.');
      setAiLoading(false);
    }, 900);
  };

  const readiness = 82;

  if (loading) {
    return (
      <div aria-live="polite">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-20 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="h-40 bg-gray-200 rounded" />
              <div className="h-48 bg-gray-200 rounded" />
            </div>
            <div className="lg:col-span-5 space-y-4">
              <div className="h-40 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Top header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <BackToPatientButton patientId={patient.id} />
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#121A2D]">Appointment Detail</h1>
        </div>

        <div className="flex items-center gap-4">
          <Badge className="bg-green-50 text-[#078B5D]">Scheduled</Badge>
          <div className="text-sm text-gray-500">Updated just now</div>
        </div>
      </div>

      {/* Patient banner */}
      <div className="mb-6">
        <PatientProfileHeader patient={patient} />
      </div>

      {/* Hero card */}
      <div className="mb-6 bg-white rounded-xl border border-[#DDE7F0] shadow-sm p-6 flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg bg-gradient-to-b from-[#F3F8FF] to-[#F2FFFB] flex flex-col items-center justify-center text-center">
            <div className="text-xs font-semibold text-[#6046B6]">{month}</div>
            <div className="text-2xl font-extrabold text-[#121A2D]">{day}</div>
            <div className="text-xs text-gray-500">{year}</div>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-bold text-[#121A2D]">{appointment.type} Appointment</div>
              <div className="mt-1 text-sm text-gray-600">{timeLabel} — {appointment.duration || '30 min'}</div>
              <div className="mt-2 text-sm text-gray-700">{appointment.doctor} • {appointment.location || 'Main Clinic — Room 203'}</div>
            </div>

            <div className="flex items-center gap-3">
              <button className="px-3 py-1 rounded-md border border-[#DDE7F0] text-sm text-[#1E63C6] hover:bg-blue-50">Reschedule</button>
              <button className="px-3 py-1 rounded-md border border-red-200 text-sm text-red-600 hover:bg-red-50">Cancel Appointment</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          {/* Appointment Details card */}
          <div className="bg-white rounded-xl border border-[#DDE7F0] shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#121A2D]">Appointment Details</h2>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <div className="text-xs text-gray-500">Reason for visit</div>
                <div className="font-semibold">{appointment.type}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Visit type</div>
                <div className="font-semibold">Office Visit</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Provider</div>
                <div className="font-semibold">{appointment.doctor}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Date</div>
                <div className="font-semibold">{apptDate.toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Time</div>
                <div className="font-semibold">{timeLabel}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Duration</div>
                <div className="font-semibold">{appointment.duration || '30 minutes'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Location</div>
                <div className="font-semibold">{appointment.location || 'Main Clinic — Room 203'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Status</div>
                <div className="font-semibold"><span className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-sm">{appointment.status}</span></div>
              </div>
            </div>
          </div>

          {/* Preparation Instructions */}
          <div className="bg-white rounded-xl border border-[#DDE7F0] shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#121A2D]">Preparation Instructions</h3>
              <div className="text-sm text-gray-500">Patient-facing</div>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <div className="mt-1">🪪</div>
                <div>
                  <div className="font-medium">Bring valid ID or health card</div>
                  <div className="text-xs text-gray-500">Arrive 10 minutes early</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1">💊</div>
                <div>
                  <div className="font-medium">Bring a list of current medications</div>
                  <div className="text-xs text-gray-500">Include doses and frequencies</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1">🩺</div>
                <div>
                  <div className="font-medium">Bring home blood pressure readings if available</div>
                </div>
              </li>
            </ul>

            <div className="mt-4 flex items-center gap-3">
              <button className="px-3 py-2 rounded-md bg-white border border-[#DDE7F0] text-sm">Copy Instructions</button>
              <button className="px-3 py-2 rounded-md bg-white border border-[#DDE7F0] text-sm text-teal-600">Send to Patient</button>
              <button className="px-3 py-2 rounded-md bg-white border border-[#DDE7F0] text-sm">Print</button>
            </div>
          </div>

          {/* Visit Agenda */}
          <div className="bg-white rounded-xl border border-[#DDE7F0] shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#121A2D]">Visit Agenda</h3>
              <button className="text-sm text-teal-600">Add agenda item</button>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              <li className="flex items-center justify-between">
                <div>Review blood pressure trend</div>
                <div className="text-xs text-green-600">Ready</div>
              </li>
              <li className="flex items-center justify-between">
                <div>Review current medications</div>
                <div className="text-xs text-amber-700">Needs review</div>
              </li>
              <li className="flex items-center justify-between">
                <div>Discuss dizziness symptoms</div>
                <div className="text-xs text-sky-700">Discuss</div>
              </li>
            </ul>
          </div>

          {/* Related Clinical Context */}
          <div className="bg-white rounded-xl border border-[#DDE7F0] shadow-sm p-6">
            <h3 className="text-lg font-semibold text-[#121A2D]">Related Clinical Context</h3>
            <div className="mt-4 text-sm text-gray-700 space-y-3">
              <div>
                <div className="text-xs text-gray-500">Current concerns</div>
                <div className="mt-1">{(patient.currentConcerns || []).join(', ') || 'None'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Key conditions</div>
                <div className="mt-1">{(patient.conditions || []).join(', ') || 'None'}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Current medications</div>
                <div className="mt-2 space-y-2">
                  {(patient.medications || []).map((m: any) => (
                    <div key={m.name} className="flex items-center justify-between text-sm">
                      <div>{m.name}</div>
                      <div className="text-xs text-gray-600">{m.dose}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 space-y-4">
          {/* Before You Arrive checklist */}
          <div className="bg-white rounded-xl border border-[#DDE7F0] shadow-sm p-6">
            <h3 className="text-lg font-semibold text-[#121A2D]">Before You Arrive</h3>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">!</div>
                  <div>
                    <div className="font-medium">Complete intake forms</div>
                    <div className="text-xs text-gray-500">Not started</div>
                  </div>
                </div>
                <button className="text-sm text-teal-600">Start Forms</button>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">●</div>
                  <div>
                    <div className="font-medium">Update medications</div>
                    <div className="text-xs text-gray-500">2 meds need review</div>
                  </div>
                </div>
                <button className="text-sm text-teal-600">Review</button>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center text-green-700">✓</div>
                  <div>
                    <div className="font-medium">Confirm insurance</div>
                    <div className="text-xs text-gray-500">Verified</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">—</div>
              </li>
            </ul>
          </div>

          {/* Appointment Readiness */}
          <div className="bg-white rounded-xl border border-[#DDE7F0] shadow-sm p-6">
            <h3 className="text-lg font-semibold text-[#121A2D]">Appointment Readiness</h3>
            <div className="mt-4">
              <div className="text-sm text-gray-500">Readiness: <span className="font-semibold text-[#121A2D]">{readiness}%</span></div>
              <div className="w-full h-3 bg-gray-100 rounded mt-2">
                <div className="h-3 rounded bg-gradient-to-r from-teal-400 to-teal-600" style={{ width: `${readiness}%` }} />
              </div>
            </div>
          </div>

          {/* Related Information */}
          <div className="bg-white rounded-xl border border-[#DDE7F0] shadow-sm p-6">
            <h3 className="text-lg font-semibold text-[#121A2D]">Related Information</h3>
            <div className="mt-4 text-sm text-gray-700 space-y-2">
              <div className="flex justify-between"><div className="text-xs text-gray-500">Last visit</div><div>May 15, 2026</div></div>
              <div className="flex justify-between"><div className="text-xs text-gray-500">Last labs</div><div>Jun 01, 2026</div></div>
              <div className="flex justify-between"><div className="text-xs text-gray-500">Upcoming tests</div><div>{(patient.tests || []).length}</div></div>
              <div className="flex justify-between"><div className="text-xs text-gray-500">Care gaps</div><div>0</div></div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-[#DDE7F0] shadow-sm p-6">
            <h3 className="text-lg font-semibold text-[#121A2D]">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="px-3 py-2 rounded-md bg-teal-600 text-white text-sm">Message Clinic</button>
              <button className="px-3 py-2 rounded-md border border-[#DDE7F0] text-sm">View Clinic Info</button>
              <button className="px-3 py-2 rounded-md border border-[#DDE7F0] text-sm">Add to Calendar</button>
              <button className="px-3 py-2 rounded-md border border-red-200 text-sm text-red-600">Cancel Appointment</button>
            </div>
          </div>

          {/* AI Appointment Assistant */}
          <div className="bg-gradient-to-b from-[#F3F8FF] to-white rounded-xl border border-[#DDE7F0] shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#121A2D]">AI Appointment Assistant</h3>
              <div className="text-xs text-gray-500">Clinical review required</div>
            </div>

            <div className="mt-4 text-sm text-gray-700">
              {aiLoading ? (
                <div className="animate-pulse h-12 bg-white rounded" />
              ) : aiSummary ? (
                <div>
                  <div className="text-sm text-gray-800 mb-2">{aiSummary}</div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">AI summary not generated yet.</div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button onClick={startAi} className="px-3 py-2 rounded-md bg-white border border-[#DDE7F0] text-sm">Generate Visit Prep Summary</button>
              <button className="px-3 py-2 rounded-md bg-white border border-[#DDE7F0] text-sm">Add Agenda Item</button>
              <button className="px-3 py-2 rounded-md bg-teal-600 text-white text-sm">Message Patient</button>
            </div>

            <div className="mt-3 text-xs text-gray-500">AI is support only and does not replace clinician judgment.</div>
          </div>
        </div>
      </div>

      {/* Bottom sticky action bar */}
      <div className="mt-8 h-24" />
      <div className="fixed left-0 right-0 bottom-0 flex items-center justify-between px-6 py-3 bg-white border-t border-gray-100 shadow-sm">
        <div className="text-sm text-gray-500">Last updated just now — Appointment detail</div>
          <div className="flex items-center gap-3">
            <BackToPatientButton patientId={patient.id} className="px-3 py-2 text-sm" />
            <button className="px-3 py-2 rounded-md bg-white border border-[#DDE7F0] text-sm">Add to Calendar</button>
            <button className="px-3 py-2 rounded-md bg-teal-600 text-white text-sm">Message Clinic</button>
            <button className="px-3 py-2 rounded-md border border-[#DDE7F0] text-sm">Reschedule</button>
          </div>
      </div>
    </div>
  );
}
