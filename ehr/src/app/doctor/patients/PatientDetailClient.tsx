"use client";

import React, { useEffect, useState } from 'react';
import { Button, Card } from '@/design-system';
import { useRouter } from 'next/navigation';
import type { CardiovascularVisit, CardiologyDashboard } from '@/cardiology/types/fhir-domain';
import { CardiovascularVisitState } from '@/cardiology/types/fhir-domain';

type Props = { initialVisit: CardiovascularVisit; initialDashboard: CardiologyDashboard };

function fmtDate(d?: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

function calcAge(d?: string) {
  if (!d) return '—';
  const dob = new Date(d);
  if (Number.isNaN(dob.getTime())) return '—';
  const diff = Date.now() - dob.getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return `${years} yrs`;
}

export default function PatientDetailClient({ initialVisit, initialDashboard }: Props) {
  const router = useRouter();
  const [visit, setVisit] = useState<CardiovascularVisit>(initialVisit as CardiovascularVisit);
  const [dashboard, setDashboard] = useState<CardiologyDashboard>(initialDashboard);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [vRes, dRes] = await Promise.all([
          fetch(`/api/cardiology/visits/${visit.id}`),
          fetch('/api/cardiology/dashboard'),
        ]);
        if (vRes.ok) {
          const json = await vRes.json();
          if (mounted) setVisit(json);
        }
        if (dRes.ok) {
          const json = await dRes.json();
          if (mounted) setDashboard(json);
        }
      } catch (_) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [visit.id]);

  const nameParts = (visit.patientName || '').split(' ');
  const firstName = nameParts.shift() || visit.patientName || '';
  const lastName = nameParts.join(' ') || '';

  const lastVisit = visit.visitHistory && visit.visitHistory.length ? visit.visitHistory[0] : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{visit.patientName}</h1>
          <p className="text-sm text-neutral-600">MRN: {visit.mrn} • DOB: {visit.patientDOB} • {calcAge(visit.patientDOB)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/doctor/patients')}>View Patients</Button>
          <Button variant="secondary" size="sm" onClick={() => router.push('/doctor')}>Back</Button>
        </div>
      </div>

      {/* Patient Summary */}
      <Card variant="outlined" className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{firstName} {lastName}</h2>
            <div className="text-sm text-neutral-600 mt-1">{visit.chiefComplaint || 'No chief complaint'}</div>
          </div>

          <div className="text-sm text-neutral-700 space-y-1">
            <div><strong>Patient ID:</strong> {visit.patientId || visit.mrn || '—'}</div>
            <div><strong>DOB:</strong> {visit.patientDOB || '—'}</div>
            <div><strong>Age:</strong> {calcAge(visit.patientDOB)}</div>
            <div><strong>Gender:</strong> {((visit as any).gender) || 'Unknown'}</div>
          </div>

          <div className="text-sm text-neutral-700 space-y-1">
            <div><strong>Contact:</strong> {visit.patientContact?.phone || '—'} {visit.patientContact?.email ? `• ${visit.patientContact.email}` : ''}</div>
            <div><strong>Emergency:</strong> {visit.emergencyContacts && visit.emergencyContacts.length ? `${visit.emergencyContacts[0].name} (${visit.emergencyContacts[0].relationship}) • ${visit.emergencyContacts[0].phone}` : '—'}</div>
            <div><strong>Primary Physician:</strong> {visit.assignedPhysicianName || 'Unassigned'}</div>
            <div><strong>Alert Status:</strong> {visit.currentAlertStatus || (visit.priority !== undefined ? String(visit.priority) : '—')}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          {/* Medical Overview */}
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Medical Overview</h3>
            <div className="mt-3 text-sm text-neutral-600 space-y-2">
              <div><strong>Current Condition:</strong> {visit.carePlan?.diagnosis || '—'}</div>
              <div><strong>Active Alerts:</strong> {visit.currentAlertStatus || (visit.priority === 0 ? 'URGENT' : 'None')}</div>
              <div><strong>Allergies:</strong> {visit.allergies && visit.allergies.length ? visit.allergies.map(a => `${a.substance} (${a.severity})`).join(', ') : 'None recorded'}</div>
              <div><strong>Chronic Illnesses:</strong> {visit.chronicConditions && visit.chronicConditions.length ? visit.chronicConditions.map(c => c.name).join(', ') : 'None recorded'}</div>
              <div><strong>Overall Health:</strong> {visit.overallHealth || 'No summary available'}</div>
            </div>
          </Card>

          {/* Last Visit */}
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Last Visit</h3>
            <div className="mt-2 text-sm text-neutral-600 space-y-2">
              <div><strong>Date / Time:</strong> {fmtDate(visit.stateEnteredAt || lastVisit?.visitDate)}</div>
              <div><strong>Attending:</strong> {visit.assignedPhysicianName || lastVisit?.provider || '—'}</div>
              <div><strong>Location:</strong> {visit.currentRoomId || '—'}</div>
              <div><strong>Reason:</strong> {visit.chiefComplaint || lastVisit?.reason || '—'}</div>
              <div><strong>Diagnosis:</strong> {visit.carePlan?.diagnosis || lastVisit?.diagnosis || '—'}</div>
              <div><strong>Treatments:</strong> {visit.proceduresOrdered && visit.proceduresOrdered.length ? visit.proceduresOrdered.map(p => p.procedureType).join(', ') : (lastVisit?.treatments?.join(', ') || '—')}</div>
              <div><strong>Medications:</strong> {visit.carePlan?.medications?.join(', ') || (visit.medicationsHistory && visit.medicationsHistory.length ? visit.medicationsHistory.map(m => m.name).join(', ') : '—')}</div>
              <div><strong>Follow-up:</strong> {fmtDate(visit.carePlan?.followUpAt)}</div>
              <div><strong>Physician Notes:</strong> {visit.notes || lastVisit?.notes || '—'}</div>
            </div>
          </Card>

          {/* Visit History */}
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Visit History</h3>
            <div className="mt-2 text-sm text-neutral-600 space-y-2">
              {visit.visitHistory && visit.visitHistory.length ? (
                <ul className="space-y-2">
                  {visit.visitHistory.map((h) => (
                    <li key={h.id} className="p-3 bg-neutral-50 rounded">
                      <div className="font-medium text-neutral-900">{fmtDate(h.visitDate)} — {h.reason}</div>
                      <div className="text-xs text-neutral-600">Provider: {h.provider} • Diagnosis: {h.diagnosis}</div>
                      <div className="mt-2 text-sm">{h.notes}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-neutral-500">No prior visits recorded.</div>
              )}
            </div>
          </Card>

          {/* Symptoms */}
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Symptoms</h3>
            <div className="mt-2 text-sm text-neutral-600">
              {visit.carePlan?.symptoms && visit.carePlan.symptoms.length ? (
                <ul className="list-disc pl-4 space-y-1">
                  {visit.carePlan.symptoms.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              ) : (
                <div className="text-sm text-neutral-500">No symptoms recorded.</div>
              )}
            </div>
          </Card>

          {/* Injuries */}
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Injuries</h3>
            <div className="mt-2 text-sm text-neutral-600">
              {visit.injuries && visit.injuries.length ? (
                <ul className="space-y-2">
                  {visit.injuries.map((inj) => (
                    <li key={inj.id} className="p-2 bg-neutral-50 rounded">
                      <div className="font-medium">{inj.type} — {inj.bodyArea}</div>
                      <div className="text-xs">Severity: {inj.severity} • Date: {fmtDate(inj.dateOfInjury)}</div>
                      <div className="mt-1 text-sm">Treatment: {inj.treatment} • Recovery: {inj.recoveryStatus}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-neutral-500">No injuries recorded.</div>
              )}
            </div>
          </Card>

          {/* Diseases / Conditions */}
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Diseases &amp; Medical Conditions</h3>
            <div className="mt-2 text-sm text-neutral-600">
              {visit.chronicConditions && visit.chronicConditions.length ? (
                <ul className="space-y-2">
                  {visit.chronicConditions.map((c) => (
                    <li key={c.id} className="p-2 bg-neutral-50 rounded">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs">Diagnosed: {fmtDate(c.diagnosisDate)} • Status: {c.status}</div>
                      <div className="mt-1 text-sm">{c.notes}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-neutral-500">No chronic conditions recorded.</div>
              )}
            </div>
          </Card>

        </div>

        <aside className="space-y-4">
          {/* Medications */}
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Medications</h3>
            <div className="mt-2 text-sm text-neutral-600">
              {visit.medicationsHistory && visit.medicationsHistory.length ? (
                <ul className="space-y-2">
                  {visit.medicationsHistory.map((m) => (
                    <li key={m.id} className="p-2 bg-neutral-50 rounded">
                      <div className="font-medium">{m.name} {m.dosage ? `• ${m.dosage}` : ''}</div>
                      <div className="text-xs">{m.frequency || '—'} • Prescribed: {m.prescribingPhysician || '—'}</div>
                      <div className="mt-1 text-sm">Purpose: {m.purpose || '—'} • Refill: {m.refillStatus || '—'}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-neutral-500">No medication history available.</div>
              )}
            </div>
          </Card>

          {/* Laboratory Results */}
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Laboratory Results</h3>
            <div className="mt-2 text-sm text-neutral-600 space-y-2">
              {visit.labResults && visit.labResults.length ? (
                visit.labResults.map((l) => (
                  <div key={l.id} className="p-2 bg-neutral-50 rounded">
                    <div className="font-medium">{l.testName} • {fmtDate(l.date)}</div>
                    <div className="text-xs text-neutral-600 mt-1">{l.summary} • {l.interpretation}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-neutral-500">No lab results available.</div>
              )}
            </div>
          </Card>

          {/* Vital Signs */}
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Vital Signs</h3>
            <div className="mt-2 text-sm text-neutral-600 space-y-2">
              {visit.vitalsHistory && visit.vitalsHistory.length ? (
                <ul className="space-y-2">
                  {visit.vitalsHistory.map((v, i) => (
                    <li key={i} className="p-2 bg-neutral-50 rounded">
                      <div className="text-sm font-medium">Recorded: {fmtDate(v.recordedAt)}</div>
                      <div className="text-xs">BP: {v.bpSystolic}/{v.bpDiastolic} mmHg • HR: {v.heartRateBpm} bpm • O2: {v.oxygenSaturationPercent}%</div>
                    </li>
                  ))}
                </ul>
              ) : visit.vitals ? (
                <div className="text-sm text-neutral-600">BP: {visit.vitals.bpSystolic}/{visit.vitals.bpDiastolic} • HR: {visit.vitals.heartRateBpm}</div>
              ) : (
                <div className="text-sm text-neutral-500">No vitals recorded.</div>
              )}
            </div>
          </Card>

          {/* Allergies */}
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Allergies</h3>
            <div className="mt-2 text-sm text-neutral-600">
              {visit.allergies && visit.allergies.length ? (
                <ul className="space-y-2">
                  {visit.allergies.map((a) => (
                    <li key={a.id} className="p-2 bg-neutral-50 rounded">
                      <div className="font-medium">{a.substance} • {a.severity}</div>
                      <div className="text-xs">Reaction: {a.reaction}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-neutral-500">No allergies recorded.</div>
              )}
            </div>
          </Card>

          {/* Immunizations */}
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Immunizations</h3>
            <div className="mt-2 text-sm text-neutral-600">
              {visit.immunizations && visit.immunizations.length ? (
                <ul className="space-y-2">
                  {visit.immunizations.map((im) => (
                    <li key={im.id} className="p-2 bg-neutral-50 rounded">
                      <div className="font-medium">{im.vaccine}</div>
                      <div className="text-xs">Date: {fmtDate(im.date)} • Provider: {im.provider}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-neutral-500">No immunizations recorded.</div>
              )}
            </div>
          </Card>

          {/* Medical Documents */}
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Medical Documents</h3>
            <div className="mt-2 text-sm text-neutral-600">
              {visit.medicalDocuments && visit.medicalDocuments.length ? (
                <ul className="space-y-2">
                  {visit.medicalDocuments.map((d) => (
                    <li key={d.id} className="p-2 bg-neutral-50 rounded flex justify-between items-center">
                      <div>
                        <div className="font-medium">{d.name}</div>
                        <div className="text-xs">{d.type} • Uploaded: {fmtDate(d.uploadedAt)}</div>
                      </div>
                      <div>
                        <Button variant="ghost" size="sm" onClick={() => window.open(d.url, '_blank')}>Open</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-neutral-500">No documents uploaded.</div>
              )}
            </div>
          </Card>

          {/* Care Plan */}
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Care Plan</h3>
            <div className="mt-2 text-sm text-neutral-600 space-y-2">
              <div><strong>Diagnosis:</strong> {visit.carePlan?.diagnosis || '—'}</div>
              <div><strong>Next Steps:</strong> {visit.carePlan?.nextSteps || '—'}</div>
              <div><strong>Recommended Procedure:</strong> {visit.carePlan?.recommendedProcedure || '—'}</div>
              <div><strong>Follow-up At:</strong> {fmtDate(visit.carePlan?.followUpAt)}</div>
            </div>
          </Card>

          {/* Emergency Contacts */}
          <Card variant="outlined" className="p-4">
            <h3 className="font-semibold text-neutral-900">Emergency Contacts</h3>
            <div className="mt-2 text-sm text-neutral-600 space-y-2">
              {visit.emergencyContacts && visit.emergencyContacts.length ? (
                visit.emergencyContacts.map((c) => (
                  <div key={c.id} className="p-2 bg-neutral-50 rounded">
                    <div className="font-medium">{c.name} • {c.relationship}</div>
                    <div className="text-xs">Phone: {c.phone} • Alt: {c.altPhone || '—'}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-neutral-500">No emergency contacts recorded.</div>
              )}
            </div>
          </Card>

        </aside>
      </div>
    </div>
  );
}
