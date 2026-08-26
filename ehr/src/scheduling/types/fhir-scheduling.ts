/**
 * FHIR-aligned scheduling types (Appointment & Slot)
 * Lightweight, pragmatic subset used by the scheduling UI and mock services.
 */

export type AppointmentStatus =
  | 'proposed'
  | 'pending'
  | 'booked'
  | 'arrived'
  | 'fulfilled'
  | 'cancelled'
  | 'noshow'
  | 'checked-in'
  | 'waitlist'
  | 'entered-in-error';

export type SlotStatus = 'free' | 'busy' | 'busy-unavailable' | 'busy-tentative' | 'entered-in-error';

export interface Participant {
  id?: string;
  actorId?: string; // e.g. practitioner-123 or patient-456
  display?: string; // human readable (Patient name, Practitioner name)
  type?: 'patient' | 'practitioner' | 'location' | 'device' | 'related-person';
  required?: 'required' | 'optional' | 'information-only';
  status?: 'accepted' | 'declined' | 'tentative' | 'needs-action' | 'accepted';
  role?: string; // free-text role / specialization
}

export interface FHIRAppointment {
  id: string;
  status: AppointmentStatus;
  serviceCategory?: string;
  serviceType?: string;
  specialty?: string;
  appointmentType?: string;
  priority?: number; // 0..100 (higher number = higher priority)
  description?: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  participants: Participant[];
  created?: string;
  comment?: string;
  slotIds?: string[]; // references to Slot.id
  meta?: Record<string, any>;
  audit?: {
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
  };
}

export interface FHIRSlot {
  id: string;
  scheduleId?: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  status: SlotStatus;
  practitionerId?: string; // practitioner responsible for slot
  locationId?: string;
  serviceType?: string;
  specialty?: string;
  capacity?: number;
  allowOverbook?: boolean;
  meta?: Record<string, any>;
}

export interface Schedule {
  id: string;
  practitionerId: string;
  locationId?: string;
  serviceTypes?: string[];
  slots?: FHIRSlot[];
}

export interface BookingRequest {
  slotId?: string;
  start?: string; // optional if slotId not provided
  end?: string; // optional if slotId not provided
  patient: {
    id?: string;
    name?: string;
    contact?: string;
    dob?: string;
  };
  appointmentType?: string;
  serviceType?: string;
  participants?: Participant[];
  createdBy?: string;
}

export interface BookingResponse {
  appointment?: FHIRAppointment;
  success: boolean;
  message?: string;
}

export interface AvailabilityFilter {
  practitionerId?: string;
  locationId?: string;
  serviceType?: string;
  from?: string;
  to?: string;
  durationMinutes?: number;
  includeTentative?: boolean;
}

export interface AppointmentSearchFilter {
  query?: string; // patient name, MRN, provider, etc.
  from?: string;
  to?: string;
  status?: AppointmentStatus[];
  practitionerId?: string;
  locationId?: string;
  serviceType?: string;
}

export type TimeRange = { start: string; end: string };

