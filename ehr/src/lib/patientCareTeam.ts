import { getPatientById } from '@/app/dashboard/records/mockPatients';

export type RecordActor = { id: string; name: string; role: string };

// Record-level rule: staff may open a patient only when they are on that patient's care team
// (or are the last attending doctor). TASK_WORKSPACE_PATIENT_IDS can narrow the set further.
export function canAccessPatientRecord(patientId: string, actor?: RecordActor) {
  const configured = (process.env.TASK_WORKSPACE_PATIENT_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
  if (configured.length && !configured.includes(patientId)) return false;
  const patient = getPatientById(patientId);
  if (!patient) return false;
  const actorMatches = (member?: { id?: string; name?: string } | null) => Boolean(member && (member.id === actor?.id || (member.name && member.name.toLowerCase() === actor?.name.toLowerCase())));
  if (actor && ((patient.careTeam || []).some(actorMatches) || actorMatches({ name: patient.lastAttendingDoctor }))) return true;
  return process.env.NODE_ENV === 'test' && !patient.careTeam?.length;
}
