import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { Patient } from '@/app/dashboard/records/mockPatients';
import { getMockPatients } from '@/app/dashboard/records/mockPatients';
import { resolveDataPath } from '@/lib/dataPath';
import type { SchedulingAppointment, SchedulingLocation, SchedulingPatient, SchedulingProvider, SchedulingSlot, SchedulingSnapshot } from '@/lib/schedulingData';

type JsonObject = Record<string, unknown>;
type PreviewState = { appointments: JsonObject[] };

const PREVIEW_FILE = resolveDataPath('scheduling_preview.json');
const TIME_ZONE = 'America/Toronto';
const providers: SchedulingProvider[] = [
  { id: 'preview-provider-aris', name: 'Dr. Aris Thorne', specialty: 'Cardiology' },
  { id: 'preview-provider-chen', name: 'Dr. Chen', specialty: 'Internal Medicine' },
];
const locations: SchedulingLocation[] = [
  { id: 'preview-location-clinic', name: 'Toronto Cardiology Clinic' },
  { id: 'preview-location-telehealth', name: 'Virtual Care' },
];

let writeQueue = Promise.resolve();

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function localPatients(): SchedulingPatient[] {
  return getMockPatients().map((patient) => ({ id: patient.id, name: patient.name, mrn: patient.mrn, birthDate: patient.dob, status: patient.status === 'Active' ? 'Active' : patient.status === 'Inactive' ? 'Inactive' : 'Unknown' }));
}

async function readState(): Promise<PreviewState> {
  try {
    const parsed = JSON.parse(await fs.readFile(PREVIEW_FILE, 'utf8')) as Partial<PreviewState>;
    return { appointments: Array.isArray(parsed.appointments) ? parsed.appointments.filter((item): item is JsonObject => Boolean(item && typeof item === 'object' && !Array.isArray(item))) : [] };
  } catch {
    return { appointments: [] };
  }
}

async function writeState(state: PreviewState) {
  await fs.mkdir(path.dirname(PREVIEW_FILE), { recursive: true });
  await fs.writeFile(PREVIEW_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function withWriteLock<T>(operation: () => Promise<T>) {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function previewSlots(appointments: JsonObject[]): SchedulingSlot[] {
  const activeStatuses = new Set(['proposed', 'pending', 'booked', 'arrived', 'checked-in', 'waitlist']);
  const bookedSlots = new Set(appointments.filter((appointment) => activeStatuses.has(text(appointment.status) || '')).flatMap((appointment) => Array.isArray(appointment.slot) ? appointment.slot.map((slot) => text((slot as JsonObject).reference)?.split('/').pop()).filter((id): id is string => Boolean(id)) : []));
  const slots: SchedulingSlot[] = [];
  const now = Date.now();
  for (let dayOffset = 0; dayOffset < 21; dayOffset += 1) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + dayOffset);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    for (let providerIndex = 0; providerIndex < providers.length; providerIndex += 1) {
      const provider = providers[providerIndex];
      for (let slotIndex = 0; slotIndex < 12; slotIndex += 1) {
        const start = new Date(day);
        start.setHours(8 + Math.floor(slotIndex / 2), slotIndex % 2 === 0 ? 0 : 30, 0, 0);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        if (start.getTime() <= now) continue;
        const id = `preview-slot-${dateKey(start)}-${provider.id}-${slotIndex}`;
        slots.push({ id, scheduleId: `preview-schedule-${provider.id}`, start: start.toISOString(), end: end.toISOString(), status: bookedSlots.has(id) ? 'busy' : 'free', practitionerId: provider.id, locationId: providerIndex === 0 ? locations[0].id : locations[1].id, serviceType: providerIndex === 0 ? 'Cardiology follow-up' : 'Internal medicine consultation', specialty: provider.specialty, capacity: 1, allowOverbook: false });
      }
    }
  }
  return slots;
}

function patientFor(id: string | undefined) {
  return getMockPatients().find((patient) => patient.id === id);
}

function providerFor(id: string | undefined) {
  return providers.find((provider) => provider.id === id);
}

function locationFor(id: string | undefined) {
  return locations.find((location) => location.id === id);
}

function appointmentFromResource(resource: JsonObject, patients: SchedulingPatient[]): SchedulingAppointment | null {
  const id = text(resource.id);
  const start = text(resource.start);
  const end = text(resource.end);
  const patientId = Array.isArray(resource.participant) ? resource.participant.map((participant) => {
    const actor = (participant as JsonObject).actor;
    return text((actor as JsonObject | undefined)?.reference);
  }).map((reference) => reference?.startsWith('Patient/') ? reference.slice('Patient/'.length) : undefined).find(Boolean) : undefined;
  const providerId = Array.isArray(resource.participant) ? resource.participant.map((participant) => text(((participant as JsonObject).actor as JsonObject | undefined)?.reference)).map((reference) => reference?.startsWith('Practitioner/') ? reference.slice('Practitioner/'.length) : undefined).find(Boolean) : undefined;
  const locationId = Array.isArray(resource.participant) ? resource.participant.map((participant) => text(((participant as JsonObject).actor as JsonObject | undefined)?.reference)).map((reference) => reference?.startsWith('Location/') ? reference.slice('Location/'.length) : undefined).find(Boolean) : undefined;
  if (!id || !start || !end) return null;
  const patient = patients.find((item) => item.id === patientId);
  const appointmentType = text((resource.appointmentType as JsonObject | undefined)?.text);
  const slotIds = Array.isArray(resource.slot) ? resource.slot.map((slot) => text((slot as JsonObject).reference)?.split('/').pop()).filter((slotId): slotId is string => Boolean(slotId)) : [];
  return { id, status: (text(resource.status) || 'proposed') as SchedulingAppointment['status'], start, end, appointmentType, description: text(resource.description), comment: text(resource.comment), slotIds, created: text(resource.created), patientId, patientName: patient?.name || 'Patient record unavailable', patientMrn: patient?.mrn, providerId, providerName: providerFor(providerId)?.name || 'Provider record unavailable', locationId, locationName: locationFor(locationId)?.name };
}

function staticAppointments() {
  return getMockPatients().flatMap((patient: Patient) => (patient.upcoming || []).map((appointment) => {
    const start = new Date(appointment.date.replace(' ', 'T'));
    const end = appointment.end ? new Date(appointment.end.replace(' ', 'T')) : new Date(start.getTime() + 30 * 60 * 1000);
    const provider = appointment.doctor === 'Dr. Chen' ? providers[1] : providers[0];
    const location = appointment.modality === 'Video Visit' ? locations[1] : locations[0];
    return { resourceType: 'Appointment', id: appointment.id, status: appointment.status?.toLowerCase() === 'completed' ? 'fulfilled' : appointment.status?.toLowerCase() === 'cancelled' ? 'cancelled' : 'booked', start: start.toISOString(), end: end.toISOString(), appointmentType: { text: appointment.type }, description: appointment.prep, participant: [{ actor: { reference: `Patient/${patient.id}` } }, { actor: { reference: `Practitioner/${provider.id}` } }, { actor: { reference: `Location/${location.id}` } }] } satisfies JsonObject;
  }));
}

export async function getPreviewSchedulingSnapshot(query = ''): Promise<SchedulingSnapshot> {
  const state = await readState();
  const patients = localPatients();
  const resources = [...staticAppointments(), ...state.appointments];
  const normalizedQuery = query.trim().toLowerCase();
  const appointments = resources.map((resource) => appointmentFromResource(resource, patients)).filter((appointment): appointment is SchedulingAppointment => Boolean(appointment)).filter((appointment) => !normalizedQuery || [appointment.patientName, appointment.patientMrn, appointment.providerName, appointment.appointmentType, appointment.serviceType, appointment.description].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery));
  return { generatedAt: new Date().toISOString(), timeZone: TIME_ZONE, appointments, slots: previewSlots(state.appointments), patients, providers, locations, sources: { appointments: { state: 'ready', source: 'Roshi preview scheduling adapter' }, slots: { state: 'ready', source: 'Roshi preview scheduling adapter' }, directory: { state: 'ready', source: 'Roshi Health Records patient directory' } } };
}

export async function createPreviewAppointment(input: { slotId: string; patientId: string; patientName?: string; appointmentType?: string; description?: string; comment?: string; providerId?: string; locationId?: string; actorId?: string; idempotencyKey?: string }) {
  return withWriteLock(async () => {
    const state = await readState();
    if (input.idempotencyKey) {
      const existing = state.appointments.find((appointment) => ((appointment.meta as JsonObject | undefined)?.idempotencyKey === input.idempotencyKey));
      if (existing) return existing;
    }
    const snapshot = await getPreviewSchedulingSnapshot();
    const slot = snapshot.slots.find((item) => item.id === input.slotId);
    if (!slot || slot.status !== 'free') throw new Error('Selected slot is no longer available.');
    const patient = patientFor(input.patientId);
    if (!patient) throw new Error('Patient record not found.');
    if (input.providerId && input.providerId !== slot.practitionerId) throw new Error('Provider availability changed. Refresh availability and choose another time.');
    if (input.locationId && input.locationId !== slot.locationId) throw new Error('Location availability changed. Refresh availability and choose another time.');
    const appointment: JsonObject = { resourceType: 'Appointment', id: `preview-appt-${randomUUID()}`, status: 'booked', start: slot.start, end: slot.end, appointmentType: { text: input.appointmentType || slot.serviceType || 'Consultation' }, ...(input.description ? { description: input.description } : {}), ...(input.comment ? { comment: input.comment } : {}), participant: [{ actor: { reference: `Patient/${patient.id}`, display: input.patientName || patient.name }, status: 'accepted' }, ...(slot.practitionerId ? [{ actor: { reference: `Practitioner/${slot.practitionerId}` }, status: 'accepted' }] : []), ...(slot.locationId ? [{ actor: { reference: `Location/${slot.locationId}` }, status: 'accepted' }] : [])], slot: [{ reference: `Slot/${slot.id}` }], created: new Date().toISOString(), meta: { source: 'roshi-preview-scheduling', actorId: input.actorId, idempotencyKey: input.idempotencyKey } };
    state.appointments.push(appointment);
    await writeState(state);
    return appointment;
  });
}

async function updatePreviewAppointment(appointmentId: string, updater: (appointment: JsonObject) => JsonObject) {
  return withWriteLock(async () => {
    const state = await readState();
    const index = state.appointments.findIndex((appointment) => appointment.id === appointmentId);
    if (index < 0) return null;
    state.appointments[index] = updater(state.appointments[index]);
    await writeState(state);
    return state.appointments[index];
  });
}

export async function cancelPreviewAppointment(appointmentId: string) {
  return updatePreviewAppointment(appointmentId, (appointment) => ({ ...appointment, status: 'cancelled', meta: { ...(appointment.meta as JsonObject || {}), lastAction: 'cancelled' } }));
}

export async function arrivePreviewAppointment(appointmentId: string) {
  return updatePreviewAppointment(appointmentId, (appointment) => ({ ...appointment, status: 'arrived', meta: { ...(appointment.meta as JsonObject || {}), lastAction: 'arrived' } }));
}

export async function reschedulePreviewAppointment(appointmentId: string, newSlotId: string) {
  return withWriteLock(async () => {
    const state = await readState();
    const index = state.appointments.findIndex((appointment) => appointment.id === appointmentId);
    if (index < 0) return null;
    const appointment = state.appointments[index];
    const snapshot = await getPreviewSchedulingSnapshot();
    const slot = snapshot.slots.find((item) => item.id === newSlotId);
    if (!slot || slot.status !== 'free') throw new Error('Selected slot is no longer available.');
    const providerReference = Array.isArray(appointment.participant) ? appointment.participant.map((participant) => text(((participant as JsonObject).actor as JsonObject | undefined)?.reference)).find((reference) => reference?.startsWith('Practitioner/')) : undefined;
    if (providerReference && providerReference !== `Practitioner/${slot.practitionerId}`) throw new Error('The replacement slot uses a different provider.');
    state.appointments[index] = { ...appointment, start: slot.start, end: slot.end, slot: [{ reference: `Slot/${slot.id}` }], meta: { ...(appointment.meta as JsonObject || {}), lastAction: 'rescheduled' } };
    await writeState(state);
    return state.appointments[index];
  });
}

export function previewSchedulingDataPath() { return PREVIEW_FILE; }