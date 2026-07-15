import { auth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { fhirSearch } from "@/lib/fhir-client";

async function getRecords(fhirId: string, agentId: string) {
  const [cond, meds, obs, allergy] = await Promise.allSettled([
    fhirSearch("Condition", { patient: fhirId }),
    fhirSearch("MedicationRequest", { patient: fhirId }),
    fhirSearch("Observation", { patient: fhirId, category: "vital-signs", _sort: "-date", _count: "20" }),
    fhirSearch("AllergyIntolerance", { patient: fhirId }),
  ]);
  await logAuditEvent({ agentId, entityType: "Patient", entityId: fhirId, action: "R", outcome: "success", description: "Patient viewed own health records" });
  return {
    conditions: cond.status === "fulfilled" ? (cond.value.entry ?? []) : [],
    medications: meds.status === "fulfilled" ? (meds.value.entry ?? []) : [],
    observations: obs.status === "fulfilled"  ? (obs.value.entry ?? [])  : [],
    allergies:    allergy.status === "fulfilled"  ? (allergy.value.entry ?? [])  : [],
  };
}

function Section({ title, children, empty }: { title: string; children: React.ReactNode; empty: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-neutral-100 font-semibold text-neutral-700">{title}</div>
      <div className="px-5 py-3 text-sm">{empty ? <p className="text-neutral-400">None recorded</p> : children}</div>
    </div>
  );
}

export default async function PatientRecordsPage() {
  const session = await auth().catch(() => null);
  const fhirId = (session?.user as any)?.fhirId ?? (session?.user as any)?.id ?? "";
  const data = fhirId ? await getRecords(fhirId, session!.user!.id!) : { conditions:[], medications:[], observations:[], allergies:[] };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-neutral-800">My Health Records</h1>
      <Section title={`Conditions (${data.conditions.length})`} empty={data.conditions.length===0}>
        <ul className="space-y-1">
          {data.conditions.map((c:any,i:number) => (
            <li key={i} className="text-neutral-700">{c.resource?.code?.text ?? c.resource?.code?.coding?.[0]?.display ?? "Unknown"}</li>
          ))}
        </ul>
      </Section>
      <Section title={`Medications (${data.medications.length})`} empty={data.medications.length===0}>
        <ul className="space-y-1">
          {data.medications.map((m:any,i:number) => {
            const med = m.resource;
            const name = med?.medicationCodeableConcept?.text ?? med?.medicationCodeableConcept?.coding?.[0]?.display ?? "Unknown";
            return <li key={i} className="text-neutral-700">{name} <span className="text-neutral-400">— {med?.status}</span></li>;
          })}
        </ul>
      </Section>
      <Section title={`Allergies (${data.allergies.length})`} empty={data.allergies.length===0}>
        {data.allergies.map((a:any,i:number) => (
          <div key={i} className="text-red-700 font-medium">{a.resource?.code?.text ?? a.resource?.code?.coding?.[0]?.display ?? "Unknown allergen"}</div>
        ))}
      </Section>
      <Section title={`Recent Vitals (${data.observations.length})`} empty={data.observations.length===0}>
        <div className="grid grid-cols-2 gap-2">
          {data.observations.slice(0,8).map((o:any,i:number) => {
            const obs = o.resource;
            const name = obs?.code?.text ?? obs?.code?.coding?.[0]?.display;
            const value = obs?.valueQuantity ? `${obs.valueQuantity.value} ${obs.valueQuantity.unit}` : "—";
            return (
              <div key={i} className="rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2">
                <p className="text-xs text-neutral-400">{name}</p>
                <p className="font-semibold text-neutral-800">{value}</p>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}