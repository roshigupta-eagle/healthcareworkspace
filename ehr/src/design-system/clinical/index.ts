/**
 * Layer 4 — Clinical Patterns: Barrel Export
 */

export { PatientBanner }  from './PatientBanner';
export type { PatientBannerProps, IsolationPrecaution } from './PatientBanner';

export { VitalSignCard }  from './VitalSignCard';
export type { VitalSignCardProps, VitalStatus, VitalTrend } from './VitalSignCard';

export { MedicationRow }  from './MedicationRow';
export type { MedicationRowProps, MedicationStatus } from './MedicationRow';

export { LabResultRow }   from './LabResultRow';
export type { LabResultRowProps, LabFlag, LabStatus } from './LabResultRow';

export { ClinicalAlert }  from './ClinicalAlert';
export type { ClinicalAlertProps, ClinicalAlertType, ClinicalAlertSeverity } from './ClinicalAlert';
