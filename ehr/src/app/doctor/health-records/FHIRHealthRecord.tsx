"use client";
import React, { useState } from "react";
import { Card, Badge } from "@/design-system";
import { useRouter } from "next/navigation";

interface Props {
  encounter: any; patient: any; observations: any[]; medications: any[];
  allergies: any[]; conditions: any[]; diagnosticReports: any[]; documents: any[];
  visitId: string;
}

const TABS = ["Summary", "Vitals", "Medications", "Allergies", "Conditions", "Labs", "Notes"] as const;
type Tab = typeof TABS[number];

function getName(r: any): string {
  if (!r?.name) return "Unknown";
  const n = Array.isArray(r.name) ? r.name[0] : r.name;
  return [n?.prefix?.[0], n?.given?.[0], n?.family].filter(Boolean).join(" ");
}

function getLoincDisplay(obs: any): string {
  return obs?.code?.coding?.[0]?.display ?? obs?.code?.text ?? "Observation";
}
function getObsValue(obs: any): string {
  if (obs?.valueQuantity) return `${obs.valueQuantity.value} ${obs.valueQuantity.unit ?? ""}`.trim();
  if (obs?.valueString) return obs.valueString;
  if (obs?.valueCodeableConcept) return obs.valueCodeableConcept?.text ?? obs.valueCodeableConcept?.coding?.[0]?.display ?? "—";
  return "—";
}

export default function FHIRHealthRecord({ encounter, patient, observations, medications, allergies, conditions, diagnosticReports, documents, visitId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Summary");

  const patientName = getName(patient);
  const dob = patient?.birthDate ?? "—";
  const encounterStatus = encounter?.status ?? "—";
  const reasonDisplay = encounter?.reasonCode?.[0]?.coding?.[0]?.display ?? encounter?.reasonCode?.[0]?.text ?? "—";
  const periodStart = encounter?.period?.start ? new Date(encounter.period.start).toLocaleString() : "—";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{patientName}</h1>
          <p className="text-sm text-neutral-500">DOB: {dob} &bull; Encounter: <code className="font-mono text-xs">{visitId}</code></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push(`/doctor/encounters/${visitId}/soap`)}
            className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors">
            Add SOAP Note
          </button>
          <button onClick={() => router.back()} className="px-3 py-1.5 rounded-lg border border-neutral-200 text-sm hover:bg-neutral-50">Back</button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-sm">
        <span><span className="text-neutral-500">Status:</span> <Badge variant={encounterStatus === "in-progress" ? "info" : "neutral"}>{encounterStatus}</Badge></span>
        <span><span className="text-neutral-500">Started:</span> {periodStart}</span>
        <span><span className="text-neutral-500">Chief complaint:</span> {reasonDisplay}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "border-b-2 border-sky-600 text-sky-700" : "text-neutral-500 hover:text-neutral-700"}`}>
            {t}
            {t === "Vitals" && observations.length > 0 && <span className="ml-1.5 text-xs bg-sky-100 text-sky-700 rounded-full px-1.5">{observations.length}</span>}
            {t === "Medications" && medications.length > 0 && <span className="ml-1.5 text-xs bg-green-100 text-green-700 rounded-full px-1.5">{medications.length}</span>}
            {t === "Allergies" && allergies.length > 0 && <span className="ml-1.5 text-xs bg-red-100 text-red-700 rounded-full px-1.5">{allergies.length}</span>}
            {t === "Labs" && diagnosticReports.length > 0 && <span className="ml-1.5 text-xs bg-purple-100 text-purple-700 rounded-full px-1.5">{diagnosticReports.length}</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Summary" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="outlined" className="p-4 col-span-2">
            <h3 className="font-semibold text-neutral-900 mb-3">Clinical Summary</h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-neutral-500">Patient</dt><dd className="font-medium">{patientName}</dd>
              <dt className="text-neutral-500">DOB</dt><dd>{dob}</dd>
              <dt className="text-neutral-500">Status</dt><dd><Badge variant="info">{encounterStatus}</Badge></dd>
              <dt className="text-neutral-500">Chief Complaint</dt><dd>{reasonDisplay}</dd>
              <dt className="text-neutral-500">Started</dt><dd>{periodStart}</dd>
            </dl>
          </Card>
          <div className="space-y-3">
            <Card variant="outlined" className="p-4">
              <h4 className="font-medium text-neutral-700 mb-2">Active Problems ({conditions.length})</h4>
              {conditions.length === 0 ? <p className="text-sm text-neutral-400">None recorded</p> :
                <ul className="space-y-1">{conditions.slice(0, 5).map((c, i) => (
                  <li key={i} className="text-sm text-neutral-700">{c?.code?.coding?.[0]?.display ?? c?.code?.text ?? "Condition"}</li>
                ))}</ul>}
            </Card>
            <Card variant="outlined" className="p-4">
              <h4 className="font-medium text-neutral-700 mb-2">Allergies ({allergies.length})</h4>
              {allergies.length === 0 ? <p className="text-sm text-neutral-400">NKDA</p> :
                <ul className="space-y-1">{allergies.slice(0, 5).map((a, i) => (
                  <li key={i} className="text-sm text-red-700">⚠ {a?.code?.coding?.[0]?.display ?? a?.code?.text ?? "Allergen"}</li>
                ))}</ul>}
            </Card>
          </div>
        </div>
      )}

      {tab === "Vitals" && (
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold text-neutral-900 mb-3">Observations / Vitals</h3>
          {observations.length === 0 ? <p className="text-sm text-neutral-500">No observations recorded.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neutral-200">
                  {["Parameter", "Value", "Status", "Date"].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-neutral-600">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {observations.map((obs, i) => (
                    <tr key={i} className="hover:bg-neutral-50">
                      <td className="px-3 py-2 font-medium">{getLoincDisplay(obs)}</td>
                      <td className="px-3 py-2 font-mono">{getObsValue(obs)}</td>
                      <td className="px-3 py-2"><Badge variant={obs?.status === "final" ? "success" : "neutral"}>{obs?.status ?? "—"}</Badge></td>
                      <td className="px-3 py-2 text-neutral-500">{obs?.effectiveDateTime ? new Date(obs.effectiveDateTime).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "Medications" && (
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold text-neutral-900 mb-3">Active Medications</h3>
          {medications.length === 0 ? <p className="text-sm text-neutral-500">No active medications.</p> : (
            <div className="space-y-2">
              {medications.map((med, i) => {
                const name = med?.medicationCodeableConcept?.coding?.[0]?.display ?? med?.medicationCodeableConcept?.text ?? "Medication";
                const dose = med?.dosageInstruction?.[0]?.text ?? "See prescription";
                const status = med?.status ?? "—";
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">{name}</p>
                      <p className="text-sm text-neutral-500">{dose}</p>
                    </div>
                    <Badge variant={status === "active" ? "success" : "neutral"}>{status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === "Allergies" && (
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold text-neutral-900 mb-3">Allergy / Intolerance Record</h3>
          {allergies.length === 0 ? <div className="px-3 py-2 bg-green-50 rounded text-green-800 text-sm font-medium">No Known Drug Allergies (NKDA)</div> : (
            <div className="space-y-2">
              {allergies.map((a, i) => {
                const substance = a?.code?.coding?.[0]?.display ?? a?.code?.text ?? "Substance";
                const criticality = a?.criticality ?? "unknown";
                const reaction = a?.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display ?? a?.reaction?.[0]?.manifestation?.[0]?.text ?? "";
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                    <span className="text-red-500 font-bold">⚠</span>
                    <div className="flex-1">
                      <p className="font-medium text-red-900">{substance}</p>
                      {reaction && <p className="text-sm text-red-700">Reaction: {reaction}</p>}
                    </div>
                    <Badge variant={criticality === "high" ? "critical" : "warning"}>{criticality}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === "Conditions" && (
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold text-neutral-900 mb-3">Problem List</h3>
          {conditions.length === 0 ? <p className="text-sm text-neutral-500">No active conditions.</p> : (
            <div className="space-y-2">
              {conditions.map((c, i) => {
                const display = c?.code?.coding?.[0]?.display ?? c?.code?.text ?? "Condition";
                const code = c?.code?.coding?.[0]?.code ?? "";
                const sys = c?.code?.coding?.[0]?.system?.includes("icd-10") ? "ICD-10-CA" : "SNOMED";
                return (
                  <div key={i} className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                    <div><p className="font-medium">{display}</p><p className="text-xs text-neutral-500">{sys}: {code}</p></div>
                    <Badge variant="info">{c?.clinicalStatus?.coding?.[0]?.code ?? "active"}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === "Labs" && (
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold text-neutral-900 mb-3">Diagnostic Reports</h3>
          {diagnosticReports.length === 0 ? <p className="text-sm text-neutral-500">No diagnostic reports.</p> : (
            <div className="space-y-2">
              {diagnosticReports.map((dr, i) => {
                const title = dr?.code?.coding?.[0]?.display ?? dr?.code?.text ?? "Report";
                const status = dr?.status ?? "—";
                const issued = dr?.issued ? new Date(dr.issued).toLocaleDateString() : "—";
                return (
                  <div key={i} className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                    <div><p className="font-medium">{title}</p><p className="text-xs text-neutral-500">Issued: {issued}</p></div>
                    <Badge variant={status === "final" ? "success" : "neutral"}>{status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === "Notes" && (
        <Card variant="outlined" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-neutral-900">Clinical Notes</h3>
            <button onClick={() => router.push(`/doctor/encounters/${visitId}/soap`)}
              className="px-3 py-1.5 rounded bg-sky-600 text-white text-sm hover:bg-sky-700 transition-colors">
              + Add SOAP Note
            </button>
          </div>
          {documents.length === 0 ? <p className="text-sm text-neutral-500">No notes recorded. Click &ldquo;Add SOAP Note&rdquo; to create the first note.</p> : (
            <div className="space-y-3">
              {documents.map((doc, i) => {
                const title = doc?.type?.coding?.[0]?.display ?? doc?.type?.text ?? "Clinical Note";
                const author = doc?.author?.[0]?.display ?? "Unknown";
                const date = doc?.date ? new Date(doc.date).toLocaleString() : "—";
                const content = doc?.content?.[0]?.attachment?.data
                  ? Buffer.from(doc.content[0].attachment.data, "base64").toString("utf-8")
                  : doc?.content?.[0]?.attachment?.url ?? "";
                return (
                  <div key={i} className="p-4 rounded-lg bg-white border border-neutral-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-neutral-900">{title}</p>
                      <div className="text-xs text-neutral-500">{author} &bull; {date}</div>
                    </div>
                    <p className="text-sm text-neutral-700 whitespace-pre-wrap">{content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}