import { auth } from "@/lib/auth";
import { fhirSearch } from "@/lib/fhir-client";
import { logAuditEvent } from "@/lib/audit";
import Link from "next/link";

async function getPatientData(patientFhirId: string, agentId: string) {
  const [conditions, meds, appts] = await Promise.allSettled([
    fhirSearch("Condition", { patient: patientFhirId, "clinical-status": "active" }),
    fhirSearch("MedicationRequest", { patient: patientFhirId, status: "active" }),
    fhirSearch("Appointment", { patient: patientFhirId, status: "booked" }),
  ]);
  await logAuditEvent({ agentId, entityType: "Patient", entityId: patientFhirId, action: "R", outcome: "success", description: "Patient viewed own dashboard" });
  return {
    conditions: conditions.status === "fulfilled" ? conditions.value.entry ?? [] : [],
    medications: meds.status === "fulfilled" ? meds.value.entry ?? [] : [],
    appointments: appts.status === "fulfilled" ? appts.value.entry ?? [] : [],
  };
}

export default async function PatientDashboard() {
  const session = await auth().catch(() => null);
  const patientFhirId = // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (session?.user as any)?.fhirId ?? (session?.user as any)?.id ?? "";
  const data = patientFhirId ? await getPatientData(patientFhirId, session!.user!.id!) : { conditions:[], medications:[], appointments:[] };

  const cards = [
    { title: "Active Conditions", count: data.conditions.length, href: "/patient/records", color: "border-blue-400", icon: "🩺" },
    { title: "Current Medications", count: data.medications.length, href: "/patient/records", color: "border-purple-400", icon: "💊" },
    { title: "Upcoming Appointments", count: data.appointments.length, href: "/scheduling", color: "border-green-400", icon: "📅" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">Welcome back, {session?.user?.name?.split(" ")[0] ?? "Patient"}</h1>
        <p className="text-neutral-500 text-sm mt-1">Your health summary as of {new Date().toLocaleDateString("en-CA")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(c => (
          <Link key={c.title} href={c.href}
            className={`bg-white rounded-xl border-l-4 ${c.color} shadow-sm p-5 hover:shadow-md transition-shadow`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{c.icon}</span>
              <div>
                <p className="text-2xl font-bold text-neutral-800">{c.count}</p>
                <p className="text-xs text-neutral-500">{c.title}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h2 className="font-semibold text-neutral-700 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/scheduling" className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700">Book Appointment</Link>
          <Link href="/patient/records" className="px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 text-sm hover:bg-neutral-50">View Health Records</Link>
        </div>
      </div>
    </div>
  );
}