import type {
  DoctorViewActionBucket,
  DoctorViewActionCategory,
  DoctorViewActionItem,
  DoctorViewAlert,
  DoctorViewPatient,
  DoctorViewQueueItem,
  DoctorViewScheduleItem,
  DoctorViewSnapshot,
  DoctorViewSourceHealth,
  DoctorViewVisit,
} from '@/lib/doctorView';

export type {
  DoctorViewActionBucket,
  DoctorViewActionCategory,
  DoctorViewActionItem,
  DoctorViewAlert,
  DoctorViewPatient,
  DoctorViewQueueItem,
  DoctorViewScheduleItem,
  DoctorViewSnapshot,
  DoctorViewSourceHealth,
  DoctorViewVisit,
};

export type DoctorViewDrawerState =
  | { kind: 'patient'; patient: DoctorViewPatient; visit?: DoctorViewVisit }
  | { kind: 'alert'; alert: DoctorViewAlert }
  | { kind: 'work'; item: DoctorViewQueueItem }
  | { kind: 'action'; bucket: DoctorViewActionBucket }
  | null;
