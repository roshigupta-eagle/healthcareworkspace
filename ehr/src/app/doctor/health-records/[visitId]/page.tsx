import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import {
  getEncounterDetail,
  getObservationsByEncounter,
  getMedicationRequestsByPatient,
  getAllergyIntolerancesByPatient,
  getConditionsByPatient,
  getDiagnosticReportsByPatient,
  getDocumentReferencesByEncounter,
  getPatientByFhirId,
} from "@/lib/fhir-client";
import { fetchVisitDetail } from "@/cardiology/services/api.mock";
import HealthRecordDetailClient from "@/app/doctor/health-records/HealthRecordDetailClient";
import FHIRHealthRecord from "@/app/doctor/health-records/FHIRHealthRecord";

export default async function HealthRecordDetailPage({ params }: { params: { visitId: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "DOCTOR" && role !== "ADMIN" && role !== "NURSE") redirect("/unauthorized");

  const { visitId } = params;

  await logAuditEvent({
    agentId: session.user.id!,
    entityType: "Encounter",
    entityId: visitId,
    action: "R",
    outcome: "success",
    description: "Doctor viewed health record detail",
  });

  try {
    const [encounter, observations, documents] = await Promise.all([
      getEncounterDetail(visitId),
      getObservationsByEncounter(visitId),
      getDocumentReferencesByEncounter(visitId),
    ]);
    const patientRef = (encounter as any).subject?.reference ?? "";
    const patientId = patientRef.replace("Patient/", "");
    const [patient, medications, allergies, conditions, reports] = await Promise.all([
      patientId ? getPatientByFhirId(patientId) : Promise.resolve(null),
      patientId ? getMedicationRequestsByPatient(patientId) : Promise.resolve([]),
      patientId ? getAllergyIntolerancesByPatient(patientId) : Promise.resolve([]),
      patientId ? getConditionsByPatient(patientId) : Promise.resolve([]),
      patientId ? getDiagnosticReportsByPatient(patientId) : Promise.resolve([]),
    ]);
    return (
      <div className="max-w-6xl mx-auto p-6">
        <FHIRHealthRecord encounter={encounter as any} patient={patient as any}
          observations={observations as any[]} medications={medications as any[]}
          allergies={allergies as any[]} conditions={conditions as any[]}
          diagnosticReports={reports as any[]} documents={documents as any[]} visitId={visitId} />
      </div>
    );
  } catch (fhirError) {
    console.warn("[health-records] FHIR unreachable, falling back to mock:", fhirError);
    const visit = await fetchVisitDetail(visitId);
    if (!visit) return <div className="p-6 text-neutral-600">Visit not found: {visitId}</div>;
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Showing local data — FHIR server currently unreachable.
        </div>
        <HealthRecordDetailClient initialVisit={visit} />
      </div>
    );
  }
}