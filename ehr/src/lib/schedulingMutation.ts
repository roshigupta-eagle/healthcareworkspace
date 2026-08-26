import { createHash, randomUUID } from 'crypto';
import { createSchedulingResource, readSchedulingResource, readSchedulingResourceWithMetadata, writeSchedulingResource } from '@/lib/schedulingData';

type JsonObject = Record<string, unknown>;

const activeAppointmentStatuses = new Set(['proposed', 'pending', 'booked', 'arrived', 'checked-in', 'waitlist']);
let writeQueue = Promise.resolve();

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function reference(value: unknown) {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : undefined;
  return text(record?.reference);
}

function referenceId(value: string | undefined, resourceType: string) {
  if (!value) return undefined;
  const parts = value.split('/');
  const typeIndex = parts.lastIndexOf(resourceType);
  return typeIndex >= 0 ? parts[typeIndex + 1] : undefined;
}

function resources(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is JsonObject => Boolean(item && typeof item === 'object' && !Array.isArray(item))) : [];
}

function references(value: unknown) {
  return [reference(value), ...resources(value).map(reference)].filter((item): item is string => Boolean(item));
}

function actorId(referencesToCheck: string[], resourceType: string) {
  return referencesToCheck.map((value) => referenceId(value, resourceType)).find(Boolean);
}

function resourceName(resource: JsonObject) {
  const names = resources(resource.name);
  const name = names[0];
  if (!name) return undefined;
  const given = resources(name.given).map((part) => text(part)).filter((part): part is string => Boolean(part));
  return [...given, text(name.family)].filter((part): part is string => Boolean(part)).join(' ') || text(name.text);
}

function lock<T>(operation: () => Promise<T>) {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

function appointmentSlotIds(appointment: JsonObject) {
  return resources(appointment.slot).map((slot) => reference(slot) || text(slot.id)).filter((value): value is string => Boolean(value)).map((value) => value.split('/').pop() || value);
}

async function setSlotStatus(slotId: string, status: 'free' | 'busy') {
  const result = await readSchedulingResourceWithMetadata('Slot', slotId);
  if (!result) throw new Error('Selected slot is no longer available.');
  const currentStatus = text(result.resource.status);
  if (status === 'busy' && currentStatus !== 'free' && result.resource.overbooked !== true) throw new Error('Selected slot is no longer available.');
  try {
    return await writeSchedulingResource('Slot', slotId, { ...result.resource, status }, result.etag);
  } catch (error) {
    if (error instanceof Error && error.message.includes('HTTP 412')) throw new Error('Selected slot is no longer available.');
    throw error;
  }
}

export async function bookFhirAppointment(input: { slotId: string; patientId: string; patientName?: string; appointmentType?: string; description?: string; comment?: string; expectedProviderId?: string; expectedLocationId?: string; expectedStart?: string; expectedEnd?: string; actorId?: string; idempotencyKey?: string }) {
  return lock(async () => {
    const id = input.idempotencyKey ? `roshi-${createHash('sha256').update(`${input.actorId || ''}:${input.idempotencyKey}`).digest('hex').slice(0, 24)}` : randomUUID();
    if (input.idempotencyKey) {
      const existing = await readSchedulingResource('Appointment', id);
      if (existing) {
        const existingPatient = resources(existing.participant).map((participant) => reference(object(participant.actor))).map((value) => referenceId(value, 'Patient')).find(Boolean);
        const existingSlot = appointmentSlotIds(existing)[0];
        const existingType = text(object(existing.appointmentType)?.text) || text(object(existing.serviceType)?.text);
        if (existingPatient !== input.patientId || existingSlot !== input.slotId || (input.appointmentType && existingType?.toLowerCase() !== input.appointmentType.toLowerCase())) throw new Error('This idempotency key was already used for a different booking.');
        return existing;
      }
    }
    const slot = await readSchedulingResource('Slot', input.slotId);
    if (!slot || (text(slot.status) !== 'free' && slot.overbooked !== true)) throw new Error('Selected slot is no longer available.');
    const patient = await readSchedulingResource('Patient', input.patientId);
    if (!patient) throw new Error('Patient record not found.');
    const slotStart = text(slot.start);
    const slotEnd = text(slot.end);
    if (!slotStart || !slotEnd) throw new Error('Selected slot has no valid time.');
    if (input.expectedStart && input.expectedStart !== slotStart || input.expectedEnd && input.expectedEnd !== slotEnd) throw new Error('Selected time has changed. Refresh availability and choose another time.');
    const scheduleReference = reference(slot.schedule);
    const schedule = scheduleReference ? await readSchedulingResource('Schedule', scheduleReference.split('/').pop() || scheduleReference) : null;
    const actorReferences = references(schedule?.actor);
    const practitionerId = actorId(actorReferences, 'Practitioner');
    const locationId = actorId(actorReferences, 'Location');
    if (!practitionerId) throw new Error('Selected slot has no assigned provider. Refresh availability and choose another time.');
    if (input.expectedProviderId && input.expectedProviderId !== practitionerId) throw new Error('Provider availability changed. Refresh availability and choose another time.');
    if (input.expectedLocationId && input.expectedLocationId !== locationId) throw new Error('Location availability changed. Refresh availability and choose another time.');
    const appointment: JsonObject = {
      resourceType: 'Appointment',
      id,
      status: 'booked',
      start: slotStart,
      end: slotEnd,
      appointmentType: { text: input.appointmentType || 'Consultation' },
      ...(input.description ? { description: input.description } : {}),
      ...(input.comment ? { comment: input.comment } : {}),
      participant: [
        { actor: { reference: `Patient/${input.patientId}`, display: input.patientName || resourceName(patient) }, status: 'accepted' },
        ...(practitionerId ? [{ actor: { reference: `Practitioner/${practitionerId}` }, status: 'accepted' }] : []),
        ...(locationId ? [{ actor: { reference: `Location/${locationId}` }, status: 'accepted' }] : []),
      ],
      slot: [{ reference: `Slot/${input.slotId}` }],
      meta: { tag: [{ system: 'https://roshi.health/scheduling', code: 'created-by', display: input.actorId || 'clinical-workspace' }], ...(input.idempotencyKey ? { extension: [{ url: 'https://roshi.health/scheduling/idempotency-key', valueString: input.idempotencyKey }] } : {}) },
    };
    await setSlotStatus(input.slotId, 'busy');
    try { return await createSchedulingResource('Appointment', appointment); } catch (error) { await setSlotStatus(input.slotId, 'free').catch(() => undefined); throw error; }
  });
}

export async function cancelFhirAppointment(appointmentId: string) {
  return lock(async () => {
    const result = await readSchedulingResourceWithMetadata('Appointment', appointmentId);
    if (!result) return null;
    if (text(result.resource.status) === 'cancelled') return result.resource;
    if (!activeAppointmentStatuses.has(text(result.resource.status) || '')) throw new Error('This appointment cannot be cancelled from its current state.');
    const updated = await writeSchedulingResource('Appointment', appointmentId, { ...result.resource, status: 'cancelled', meta: { ...(result.resource.meta as JsonObject || {}), lastAction: 'cancelled' } }, result.etag);
    for (const slotId of appointmentSlotIds(result.resource)) {
      const slot = await readSchedulingResource('Slot', slotId);
      if (slot?.overbooked !== true) await setSlotStatus(slotId, 'free').catch(() => undefined);
    }
    return updated;
  });
}

export async function markFhirAppointmentArrived(appointmentId: string) {
  const result = await readSchedulingResourceWithMetadata('Appointment', appointmentId);
  if (!result) return null;
  if (!['booked', 'pending', 'proposed'].includes(text(result.resource.status) || '')) throw new Error('This appointment is not eligible for check-in.');
  return writeSchedulingResource('Appointment', appointmentId, { ...result.resource, status: 'arrived', meta: { ...(result.resource.meta as JsonObject || {}), lastAction: 'arrived' } }, result.etag);
}

export async function rescheduleFhirAppointment(appointmentId: string, newSlotId: string) {
  return lock(async () => {
    const appointmentResult = await readSchedulingResourceWithMetadata('Appointment', appointmentId);
    const newSlotResult = await readSchedulingResourceWithMetadata('Slot', newSlotId);
    const appointment = appointmentResult?.resource;
    const newSlot = newSlotResult?.resource;
    if (!appointment || !newSlot || !appointmentResult || !newSlotResult) throw new Error('Appointment or selected slot was not found.');
    if (!activeAppointmentStatuses.has(text(appointment.status) || '')) throw new Error('This appointment cannot be rescheduled from its current state.');
    if (text(newSlot.status) !== 'free' && newSlot.overbooked !== true) throw new Error('Selected slot is no longer available.');
    const start = text(newSlot.start);
    const end = text(newSlot.end);
    if (!start || !end) throw new Error('Selected slot has no valid time.');
    const oldSlotIds = appointmentSlotIds(appointment);
    const scheduleReference = reference(newSlot.schedule);
    const schedule = scheduleReference ? await readSchedulingResource('Schedule', scheduleReference.split('/').pop() || scheduleReference) : null;
    const newActors = references(schedule?.actor);
    const oldActors = resources(appointment.participant).map((participant) => reference(object(participant.actor))).filter((item): item is string => Boolean(item));
    const oldProvider = oldActors.find((actor) => actor.startsWith('Practitioner/'));
    const newProvider = newActors.find((actor) => actor.startsWith('Practitioner/'));
    const oldLocation = oldActors.find((actor) => actor.startsWith('Location/'));
    const newLocation = newActors.find((actor) => actor.startsWith('Location/'));
    if (oldProvider && newProvider && oldProvider !== newProvider) throw new Error('The replacement slot uses a different provider.');
    if (oldLocation && newLocation && oldLocation !== newLocation) throw new Error('The replacement slot uses a different location.');
    await setSlotStatus(newSlotId, 'busy');
    try {
      const updated = await writeSchedulingResource('Appointment', appointmentId, { ...appointment, start, end, slot: [{ reference: `Slot/${newSlotId}` }], meta: { ...(appointment.meta as JsonObject || {}), lastAction: 'rescheduled' } }, appointmentResult.etag);
      for (const oldSlotId of oldSlotIds.filter((slotId) => slotId !== newSlotId)) await setSlotStatus(oldSlotId, 'free').catch(() => undefined);
      return updated;
    } catch (error) { await setSlotStatus(newSlotId, 'free').catch(() => undefined); throw error; }
  });
}
