import type { DoctorNoteSection, DoctorNoteType } from '@/types/doctorNote';

export interface DoctorNoteTemplate {
  id: string;
  label: string;
  type: DoctorNoteType;
  sections: DoctorNoteSection[];
}

/** Organization-provided starter templates. Personal favorites/recents are tracked client-side. */
export const DOCTOR_NOTE_TEMPLATES: DoctorNoteTemplate[] = [
  {
    id: 'tpl-diabetes-followup',
    label: 'Diabetes Follow-Up',
    type: 'follow-up',
    sections: [
      { heading: 'History', body: '' },
      { heading: 'Assessment', body: '' },
      { heading: 'Plan', body: '' },
      { heading: 'Follow-Up', body: '' },
    ],
  },
  {
    id: 'tpl-thyroid-followup',
    label: 'Thyroid Follow-Up',
    type: 'follow-up',
    sections: [
      { heading: 'History', body: '' },
      { heading: 'Assessment', body: '' },
      { heading: 'Plan', body: '' },
      { heading: 'Follow-Up', body: '' },
    ],
  },
  {
    id: 'tpl-weight-management',
    label: 'Weight Management Follow-Up',
    type: 'follow-up',
    sections: [
      { heading: 'History', body: '' },
      { heading: 'Assessment', body: '' },
      { heading: 'Plan', body: '' },
      { heading: 'Follow-Up', body: '' },
    ],
  },
  {
    id: 'tpl-medication-review',
    label: 'Medication Review',
    type: 'general',
    sections: [
      { heading: 'Medications Reviewed', body: '' },
      { heading: 'Assessment', body: '' },
      { heading: 'Plan', body: '' },
    ],
  },
  {
    id: 'tpl-endo-followup',
    label: 'General Endocrinology Follow-Up',
    type: 'follow-up',
    sections: [
      { heading: 'History', body: '' },
      { heading: 'Assessment', body: '' },
      { heading: 'Plan', body: '' },
      { heading: 'Follow-Up', body: '' },
    ],
  },
  {
    id: 'tpl-telephone-followup',
    label: 'Telephone Follow-Up',
    type: 'phone',
    sections: [
      { heading: 'Reason for Call', body: '' },
      { heading: 'Discussion', body: '' },
      { heading: 'Plan', body: '' },
    ],
  },
];

/** Smart / dot phrases: typed token expands to approved text when followed by a space. */
export const SMART_PHRASES: Record<string, string> = {
  '.dmfollowup': 'Reviewed home glucose logs and medication adherence. Continue current regimen; recheck HbA1c at next visit.',
  '.thyroidfollowup': 'Patient reports no new symptoms of hyper/hypothyroidism. Continue current dose; recheck TSH in 6-8 weeks.',
  '.weightplan': 'Discussed nutrition, activity goals, and weigh-in cadence. Continue current plan and reassess at next visit.',
};

export function getTemplateById(id: string | null | undefined): DoctorNoteTemplate | null {
  if (!id) return null;
  return DOCTOR_NOTE_TEMPLATES.find((t) => t.id === id) || null;
}
