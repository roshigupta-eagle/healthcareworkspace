"use client";
import { useState } from "react";
import CTASWizard, { CTASLevel } from "@/components/ctas/CTASWizard";
import { Card } from "@/design-system";
import { useRouter } from "next/navigation";

interface CTASResult {
  level: CTASLevel; label: string; color: string; maxWaitMinutes: number; rationale: string[];
}

export default function TriagePage() {
  const router = useRouter();
  const [saved, setSaved] = useState<CTASResult | null>(null);
  const [patientName, setPatientName] = useState("");

  async function handleComplete(result: CTASResult) {
    setSaved(result);
    try {
      await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientName, ctasLevel: result.level, rationale: result.rationale }),
      });
    } catch { /* best-effort */ }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">CTAS Triage</h1>
          <p className="text-sm text-neutral-500">Canadian Triage and Acuity Scale — 5-level classification</p>
        </div>
        <button onClick={() => router.back()} className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm hover:bg-neutral-50">Back</button>
      </div>
      <Card variant="outlined" className="p-5">
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-700 mb-1">Patient Name</label>
          <input value={patientName} onChange={e => setPatientName(e.target.value)}
            placeholder="Enter patient name or MRN..."
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        {!saved ? (
          <CTASWizard onComplete={handleComplete} />
        ) : (
          <div className="text-center space-y-3 py-4">
            <div className="text-4xl">✓</div>
            <p className="font-semibold text-neutral-900">CTAS {saved.level} — {saved.label}</p>
            <p className="text-sm text-neutral-500">
              {saved.maxWaitMinutes === 0 ? "Immediate care required" : `Patient should be seen within ${saved.maxWaitMinutes} minutes`}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => setSaved(null)} className="px-4 py-2 border border-neutral-200 rounded-lg text-sm hover:bg-neutral-50">Triage Next Patient</button>
              <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700">Back to Dashboard</button>
            </div>
          </div>
        )}
      </Card>
      <Card variant="outlined" className="p-4">
        <h3 className="font-semibold text-neutral-800 mb-3">CTAS Reference</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {([1,2,3,4,5] as CTASLevel[]).map(l => {
            const meta: Record<CTASLevel, {label:string;bg:string;wait:string}> = {
              1: {label:"Resuscitation",  bg:"bg-red-600",    wait:"Immediate"},
              2: {label:"Emergent",       bg:"bg-orange-500", wait:"≤15 min"},
              3: {label:"Urgent",         bg:"bg-yellow-400", wait:"≤30 min"},
              4: {label:"Less Urgent",    bg:"bg-green-400",  wait:"≤60 min"},
              5: {label:"Non-Urgent",     bg:"bg-blue-300",   wait:"≤120 min"},
            };
            const m = meta[l];
            return (
              <div key={l} className={`${m.bg} text-white rounded-lg p-3 text-center`}>
                <div className="text-2xl font-black">{l}</div>
                <div className="text-xs font-semibold">{m.label}</div>
                <div className="text-xs opacity-80 mt-0.5">{m.wait}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}