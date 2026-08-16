import type { NoteType } from "./types";

export interface NoteTemplate {
  id: string;
  type: NoteType;
  label: string;
  body: string;
}

/** Starter templates staff can insert when composing a new note. */
export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "tpl-soap",
    type: "soap",
    label: "SOAP",
    body: "Subjective:\n\nObjective:\n\nAssessment:\n\nPlan:\n",
  },
  {
    id: "tpl-progress",
    type: "progress",
    label: "Progress Note",
    body: "Interval history:\n\nExam findings:\n\nAssessment / plan:\n",
  },
  {
    id: "tpl-nursing",
    type: "nursing",
    label: "Nursing Shift Note",
    body: "Shift: \nVitals reviewed: \nPatient status: \nInterventions: \nHandoff notes: \n",
  },
  {
    id: "tpl-medication-review",
    type: "medication-review",
    label: "Medication Review",
    body: "Medications reviewed: \nInteractions checked: \nRecommendations: \n",
  },
  {
    id: "tpl-lab-annotation",
    type: "lab-annotation",
    label: "Lab Annotation",
    body: "Result reviewed: \nCritical value called: \nComments: \n",
  },
  {
    id: "tpl-administrative",
    type: "administrative",
    label: "Administrative Note",
    body: "Reason for contact: \nAction taken: \nFollow-up required: \n",
  },
  {
    id: "tpl-consult",
    type: "consult",
    label: "Consult Note",
    body: "Reason for consult: \nFindings: \nRecommendations: \n",
  },
];

export function templatesForType(type: NoteType): NoteTemplate[] {
  return NOTE_TEMPLATES.filter((t) => t.type === type);
}
