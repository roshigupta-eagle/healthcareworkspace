"use client";
/**
 * EPIC-CLIN-02: Canadian Triage and Acuity Scale (CTAS) Wizard
 * Implements 5-level acuity scoring per CAEP/CTAS guidelines.
 */
import React, { useState } from "react";

export type CTASLevel = 1 | 2 | 3 | 4 | 5;

interface CTASResult {
  level: CTASLevel;
  label: string;
  color: string;
  maxWaitMinutes: number;
  rationale: string[];
}

const CTAS_META: Record<CTASLevel, { label: string; color: string; bg: string; maxWait: number }> = {
  1: { label: "Resuscitation",         color: "text-red-900",    bg: "bg-red-600",    maxWait: 0   },
  2: { label: "Emergent",              color: "text-orange-900", bg: "bg-orange-500", maxWait: 15  },
  3: { label: "Urgent",                color: "text-yellow-900", bg: "bg-yellow-400", maxWait: 30  },
  4: { label: "Less Urgent (Semi)",    color: "text-green-900",  bg: "bg-green-400",  maxWait: 60  },
  5: { label: "Non-Urgent",            color: "text-blue-900",   bg: "bg-blue-300",   maxWait: 120 },
};

const PRESENTING_COMPLAINTS = [
  { id: "cardiac_arrest",  label: "Cardiac arrest / pulseless", weight: 1 },
  { id: "chest_pain",      label: "Chest pain / possible ACS",  weight: 2 },
  { id: "resp_distress",   label: "Severe respiratory distress", weight: 2 },
  { id: "stroke",          label: "Stroke / facial droop / weakness", weight: 2 },
  { id: "trauma_major",    label: "Major trauma",                weight: 2 },
  { id: "altered_loc",     label: "Altered level of consciousness", weight: 2 },
  { id: "abdo_pain",       label: "Abdominal pain",              weight: 3 },
  { id: "dyspnea_mild",    label: "Mild shortness of breath",    weight: 3 },
  { id: "fever_adult",     label: "Fever >38.5°C",               weight: 3 },
  { id: "headache",        label: "Headache (severe / sudden)",  weight: 3 },
  { id: "laceration",      label: "Laceration / minor wound",    weight: 4 },
  { id: "uti",             label: "UTI symptoms",                weight: 4 },
  { id: "back_pain",       label: "Chronic back pain",           weight: 5 },
  { id: "prescription",    label: "Prescription refill only",    weight: 5 },
  { id: "other",           label: "Other / non-specific",        weight: 4 },
];

interface Props {
  onComplete: (result: CTASResult) => void;
}

function calcCTAS(
  complaintWeight: number,
  gcs: number,
  rr: number,
  spo2: number,
  hr: number,
  sbp: number,
  temp: number
): CTASResult {
  const rationale: string[] = [];
  let level: CTASLevel = complaintWeight as CTASLevel;

  // GCS modifiers
  if (gcs < 9) { level = 1; rationale.push(`GCS ${gcs} — severe (resuscitation)`); }
  else if (gcs < 13) { level = Math.min(level, 2) as CTASLevel; rationale.push(`GCS ${gcs} — moderate`); }

  // SpO2 modifiers
  if (spo2 > 0 && spo2 < 85) { level = 1; rationale.push(`SpO2 ${spo2}% — critical hypoxia`); }
  else if (spo2 > 0 && spo2 < 92) { level = Math.min(level, 2) as CTASLevel; rationale.push(`SpO2 ${spo2}% — severe hypoxia`); }
  else if (spo2 > 0 && spo2 < 95) { level = Math.min(level, 3) as CTASLevel; rationale.push(`SpO2 ${spo2}% — mild hypoxia`); }

  // RR modifiers
  if (rr > 0 && (rr < 8 || rr > 30)) { level = 1; rationale.push(`RR ${rr} bpm — critical`); }
  else if (rr > 0 && (rr < 10 || rr > 24)) { level = Math.min(level, 2) as CTASLevel; rationale.push(`RR ${rr} bpm — abnormal`); }

  // HR modifiers
  if (hr > 0 && (hr < 40 || hr > 140)) { level = Math.min(level, 2) as CTASLevel; rationale.push(`HR ${hr} bpm — extreme tachycardia/bradycardia`); }

  // SBP modifiers
  if (sbp > 0 && sbp < 70) { level = 1; rationale.push(`SBP ${sbp} mmHg — shock`); }
  else if (sbp > 0 && sbp < 90) { level = Math.min(level, 2) as CTASLevel; rationale.push(`SBP ${sbp} mmHg — hypotension`); }
  else if (sbp > 0 && sbp > 220) { level = Math.min(level, 2) as CTASLevel; rationale.push(`SBP ${sbp} mmHg — severe hypertension`); }

  // Temp modifiers
  if (temp > 0 && (temp < 32 || temp > 40)) { level = Math.min(level, 2) as CTASLevel; rationale.push(`Temp ${temp}°C — extreme`); }
  else if (temp > 0 && temp > 38.5) { level = Math.min(level, 3) as CTASLevel; rationale.push(`Temp ${temp}°C — fever`); }

  if (rationale.length === 0) rationale.push("Based on presenting complaint");

  const meta = CTAS_META[level];
  return { level, label: meta.label, color: meta.color, maxWaitMinutes: meta.maxWait, rationale };
}

export default function CTASWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [complaint, setComplaint] = useState("");
  const [gcs, setGcs] = useState(15);
  const [rr, setRr] = useState(0);
  const [spo2, setSpo2] = useState(0);
  const [hr, setHr] = useState(0);
  const [sbp, setSbp] = useState(0);
  const [temp, setTemp] = useState(0);
  const [result, setResult] = useState<CTASResult | null>(null);

  function calculate() {
    const c = PRESENTING_COMPLAINTS.find((p) => p.id === complaint);
    const weight = c?.weight ?? 4;
    const r = calcCTAS(weight, gcs, rr, spo2, hr, sbp, temp);
    setResult(r);
    setStep(2);
  }

  if (step === 0) return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-neutral-900">Step 1: Presenting Complaint</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PRESENTING_COMPLAINTS.map((c) => (
          <button key={c.id} onClick={() => { setComplaint(c.id); setStep(1); }}
            className={`text-left p-3 rounded-lg border transition-colors ${complaint === c.id ? "border-sky-500 bg-sky-50" : "border-neutral-200 hover:border-sky-300 hover:bg-sky-50"}`}>
            <span className="text-sm font-medium text-neutral-800">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  if (step === 1) return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-neutral-900">Step 2: Vital Signs</h3>
      <p className="text-sm text-neutral-500">Leave at 0 if not yet measured — CTAS will be calculated from complaint alone.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "Glasgow Coma Scale (GCS)", min: 3, max: 15, val: gcs, set: setGcs, unit: "/15" },
          { label: "SpO2 (%)", min: 0, max: 100, val: spo2, set: setSpo2, unit: "%" },
          { label: "Respiratory Rate (bpm)", min: 0, max: 60, val: rr, set: setRr, unit: "/min" },
          { label: "Heart Rate (bpm)", min: 0, max: 300, val: hr, set: setHr, unit: "bpm" },
          { label: "Systolic BP (mmHg)", min: 0, max: 300, val: sbp, set: setSbp, unit: "mmHg" },
          { label: "Temperature (°C)", min: 0, max: 45, val: temp, set: setTemp, unit: "°C" },
        ].map(({ label, min, max, val, set, unit }) => (
          <div key={label} className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700">{label}</label>
            <div className="flex items-center gap-2">
              <input type="number" min={min} max={max} step={0.1} value={val === 0 && label.includes("GCS") ? 15 : val}
                onChange={(e) => set(parseFloat(e.target.value) || 0)}
                className="w-24 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <span className="text-sm text-neutral-500">{unit}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={() => setStep(0)} className="px-4 py-2 border border-neutral-200 rounded-lg text-sm hover:bg-neutral-50">Back</button>
        <button onClick={calculate} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700">
          Calculate CTAS Level
        </button>
      </div>
    </div>
  );

  if (step === 2 && result) {
    const meta = CTAS_META[result.level];
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900">CTAS Assessment Result</h3>
        <div className={`${meta.bg} rounded-xl p-6 text-white`}>
          <div className="flex items-center gap-4">
            <div className="text-6xl font-black">{result.level}</div>
            <div>
              <div className="text-2xl font-bold">{result.label}</div>
              <div className="text-sm opacity-90">
                {result.maxWaitMinutes === 0 ? "Immediate resuscitation required" : `Maximum wait: ${result.maxWaitMinutes} minutes`}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <h4 className="font-medium text-neutral-700 mb-2">Clinical Rationale</h4>
          <ul className="space-y-1">{result.rationale.map((r, i) => (
            <li key={i} className="text-sm text-neutral-600 flex items-start gap-2"><span className="text-sky-500">→</span> {r}</li>
          ))}</ul>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setStep(0); setResult(null); }}
            className="px-4 py-2 border border-neutral-200 rounded-lg text-sm hover:bg-neutral-50">Reassess</button>
          <button onClick={() => onComplete(result)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            Confirm & Save CTAS {result.level}
          </button>
        </div>
      </div>
    );
  }

  return null;
}