import type { AppointmentStatus, FHIRAppointment, FHIRSlot, SlotStatus } from '@/scheduling/types/fhir-scheduling';

type JsonObject = Record<string, unknown>;
type FhirBundle = { resourceType?: string; type?: string; total?: number; entry?: Array<{ resource?: JsonObject }>; link?: Array<{ relation?: string; url?: string }> };

export type SchedulingPatient = { id: string; name: string; mrn?: string; birthDate?: string };
export type SchedulingProvider = { id: string; name: string; specialty?: string };
export type SchedulingLocation = { id: string; name: string };

export type SchedulingAppointment = FHIRAppointment & {
  patientId?: string;
  patientName: string;
  patientMrn?: string;
  providerId?: string;
  providerName: string;
  locationId?: string;
  locationName?: string;
  room?: string;
};

export type SchedulingSlot = FHIRSlot & { practitionerName: string; locationName?: string };

export type SchedulingSource = { state: 'ready' | 'partial' | 'unavailable'; source: string; error?: string };

export type SchedulingSnapshot = {
  generatedAt: string;
  timeZone: string;
  appointments: SchedulingAppointment[];
  slots: SchedulingSlot[];
  patients: SchedulingPatient[];
  providers: SchedulingProvider[];
  locations: SchedulingLocation[];
  sources: { appointments: SchedulingSource; slots: SchedulingSource; directory: SchedulingSource };
};

export type SchedulingDirectorySnapshot = {
  patients: SchedulingPatient[];
  source: SchedulingSource;
};

type SchedulingResourceType = 'Appointment' | 'Slot' | 'Patient' | 'Schedule';
type SchedulingResourceRead = { resource: JsonObject; etag?: string };

export function schedulingFhirBase() {
  return (process.env.FHIR_BASE_URL || process.env.NEXT_PUBLIC_FHIR_API_URL || 'http://localhost:8081/fhir').replace(/\/$/, '');
}

function fhirHeaders(contentType?: string) {
  const token = process.env.FHIR_INTERNAL_TOKEN || process.env.FHIR_SERVICE_TOKEN || process.env.CARDIOLOGY_SERVICE_TOKEN;
  return { accept: 'application/fhir+json, application/json', ...(contentType ? { 'content-type': contentType } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) };
}

export async function readSchedulingResourceWithMetadata(resourceType: SchedulingResourceType, id: string): Promise<SchedulingResourceRead | null> {
  const response = await fetch(`${schedulingFhirBase()}/R4/${resourceType}/${encodeURIComponent(id)}`, { headers: fhirHeaders(), cache: 'no-store' });
  if (!response.ok) return null;
  return { resource: await response.json() as JsonObject, etag: response.headers.get('etag') || undefined };
}

export async function readSchedulingResource(resourceType: SchedulingResourceType, id: string) {
  return (await readSchedulingResourceWithMetadata(resourceType, id))?.resource || null;
}

export async function writeSchedulingResource(resourceType: 'Appointment' | 'Slot', id: string, resource: JsonObject, etag?: string) {
  const response = await fetch(`${schedulingFhirBase()}/R4/${resourceType}/${encodeURIComponent(id)}`, { method: 'PUT', headers: { ...fhirHeaders('application/fhir+json'), ...(etag ? { 'if-match': etag } : {}) }, body: JSON.stringify(resource), cache: 'no-store' });
  if (!response.ok) throw new Error(`${resourceType} source rejected the update (HTTP ${response.status}).`);
  return response.json() as Promise<JsonObject>;
}

export async function createSchedulingResource(resourceType: 'Appointment', resource: JsonObject) {
  const response = await fetch(`${schedulingFhirBase()}/R4/${resourceType}`, { method: 'POST', headers: fhirHeaders('application/fhir+json'), body: JSON.stringify(resource), cache: 'no-store' });
  if (!response.ok) throw new Error(`${resourceType} source rejected the booking (HTTP ${response.status}).`);
  return response.json() as Promise<JsonObject>;
}

function object(value: unknown): JsonObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : undefined;
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function field(record: JsonObject, name: string) {
  return record[name];
}

function reference(value: unknown) {
  return text(object(value)?.reference);
}

function referenceId(value: string | undefined, resourceType: string) {
  if (!value) return undefined;
  const parts = value.split('/');
  const typeIndex = parts.lastIndexOf(resourceType);
  return typeIndex >= 0 ? parts[typeIndex + 1] : undefined;
}

function displayName(value: unknown) {
  const record = object(value);
  if (!record) return undefined;
  const explicit = text(record.text);
  if (explicit) return explicit;
  const given = array(record.given).map(text).filter((part): part is string => Boolean(part));
  const family = text(record.family);
  return [...given, family].filter(Boolean).join(' ') || undefined;
}

function resourceDisplay(resource: JsonObject, nameKey = 'name') {
  const direct = text(field(resource, nameKey));
  const name = direct || array(field(resource, nameKey)).map(displayName).find(Boolean);
  return name || text(field(resource, 'title')) || text(field(resource, 'display'));
}

function firstObject(value: unknown) {
  return Array.isArray(value) ? object(value[0]) : object(value);
}

function bundleEntries(value: unknown, resourceType: string) {
  const bundle = object(value) as FhirBundle | undefined;
  if (!bundle || bundle.resourceType !== 'Bundle' || bundle.type !== 'searchset' || !Array.isArray(bundle.entry)) throw new Error(`${resourceType} source did not return a FHIR searchset Bundle.`);
  return bundle.entry.map((entry) => object(entry.resource)).filter((resource): resource is JsonObject => Boolean(resource && resource.resourceType === resourceType));
}

async function fetchBundle(base: string, resourceType: string) {
  let nextUrl: string | undefined = `${base}/R4/${resourceType}?_count=200`;
  const entries: Array<{ resource?: JsonObject }> = [];
  let total: number | undefined;
  while (nextUrl) {
    const response = await fetch(nextUrl, { headers: fhirHeaders(), cache: 'no-store' });
    if (!response.ok) throw new Error(`${resourceType} source returned HTTP ${response.status}.`);
    const bundle = await response.json() as FhirBundle;
    if (bundle.resourceType !== 'Bundle' || bundle.type !== 'searchset' || !Array.isArray(bundle.entry)) throw new Error(`${resourceType} source did not return a FHIR searchset Bundle.`);
    entries.push(...bundle.entry);
    total = typeof bundle.total === 'number' ? bundle.total : total;
    const next = bundle.link?.find((link) => link.relation === 'next')?.url;
    nextUrl = next ? new URL(next, response.url || base).toString() : undefined;
  }
  return { resourceType: 'Bundle', type: 'searchset', total, entry: entries };
}

function appointmentStatus(value: unknown): AppointmentStatus {
  const candidate = text(value);
  const allowed: AppointmentStatus[] = ['proposed', 'pending', 'booked', 'arrived', 'checked-in', 'waitlist', 'fulfilled', 'cancelled', 'noshow', 'entered-in-error'];
  return candidate && allowed.includes(candidate as AppointmentStatus) ? candidate as AppointmentStatus : 'proposed';
}

function slotStatus(value: unknown): SlotStatus {
  const candidate = text(value);
  const allowed: SlotStatus[] = ['free', 'busy', 'busy-unavailable', 'busy-tentative', 'entered-in-error'];
  return candidate && allowed.includes(candidate as SlotStatus) ? candidate as SlotStatus : 'busy-unavailable';
}

function appointmentList(resources: JsonObject[], patients: Map<string, SchedulingPatient>, providers: Map<string, SchedulingProvider>, locations: Map<string, SchedulingLocation>) {
  return resources.flatMap((resource): SchedulingAppointment[] => {
    const id = text(resource.id);
    const start = text(resource.start);
    const end = text(resource.end);
    if (!id || !start || !end) return [];
    const participants = array(resource.participant).map(object).filter((participant): participant is JsonObject => Boolean(participant));
    const patientReference = participants.map((participant) => reference(object(participant.actor))).find((value) => value?.startsWith('Patient/'));
    const providerReference = participants.map((participant) => reference(object(participant.actor))).find((value) => value?.startsWith('Practitioner/'));
    const locationReference = participants.map((participant) => reference(object(participant.actor))).find((value) => value?.startsWith('Location/'));
    const patientId = referenceId(patientReference, 'Patient');
    const providerId = referenceId(providerReference, 'Practitioner');
    const locationId = referenceId(locationReference, 'Location');
    const patient = patientId ? patients.get(patientId) : undefined;
    const provider = providerId ? providers.get(providerId) : undefined;
    const location = locationId ? locations.get(locationId) : undefined;
    const appointmentType = displayName(firstObject(resource.appointmentType)) || text(firstObject(resource.appointmentType)?.text) || text(firstObject(resource.serviceType)?.text);
    return [{
      id,
      status: appointmentStatus(resource.status),
      start,
      end,
      participants: participants.map((participant) => ({ actorId: reference(object(participant.actor))?.split('/')[1], display: displayName(object(participant.actor)) || reference(object(participant.actor)), type: reference(object(participant.actor))?.startsWith('Patient/') ? 'patient' as const : reference(object(participant.actor))?.startsWith('Practitioner/') ? 'practitioner' as const : 'location' as const, status: text(participant.status) as 'accepted' | 'declined' | 'tentative' | 'needs-action' | undefined })),
      appointmentType,
      serviceType: text(firstObject(resource.serviceType)?.text),
      description: text(resource.description),
      comment: text(resource.comment),
      slotIds: array(resource.slot).map(reference).filter((value): value is string => Boolean(value)).map((value) => value.split('/').pop() || value),
      created: text(resource.created),
      patientId,
      patientName: patient?.name || 'Patient record unavailable',
      patientMrn: patient?.mrn,
      providerId,
      providerName: provider?.name || 'Provider record unavailable',
      locationId,
      locationName: location?.name,
      room: text(resource.room),
    }];
  });
}

function references(value: unknown) {
  return [reference(value), ...array(value).map(reference)].filter((item): item is string => Boolean(item));
}

function scheduleMaps(resources: JsonObject[]) {
  const schedules = new Map<string, { practitionerId?: string; locationId?: string }>();
  for (const resource of resources) {
    const id = text(resource.id);
    if (!id) continue;
    const actors = references(resource.actor);
    schedules.set(id, { practitionerId: actors.map((actor) => referenceId(actor, 'Practitioner')).find(Boolean), locationId: actors.map((actor) => referenceId(actor, 'Location')).find(Boolean) });
  }
  return schedules;
}

function slotList(resources: JsonObject[], providers: Map<string, SchedulingProvider>, locations: Map<string, SchedulingLocation>, schedules: Map<string, { practitionerId?: string; locationId?: string }>) {
  return resources.flatMap((resource): SchedulingSlot[] => {
    const id = text(resource.id);
    const start = text(resource.start);
    const end = text(resource.end);
    if (!id || !start || !end) return [];
    const scheduleReference = reference(resource.schedule);
    const scheduleId = referenceId(scheduleReference, 'Schedule');
    const schedule = scheduleId ? schedules.get(scheduleId) : undefined;
    const practitionerId = schedule?.practitionerId;
    const locationId = schedule?.locationId;
    return [{ id, scheduleId: scheduleReference, start, end, status: slotStatus(resource.status), practitionerId, locationId, serviceType: text(firstObject(resource.serviceType)?.text), specialty: text(firstObject(resource.specialty)?.text), capacity: typeof resource.capacity === 'number' ? resource.capacity : undefined, allowOverbook: resource.overbooked === true, practitionerName: practitionerId ? providers.get(practitionerId)?.name || 'Provider record unavailable' : 'Provider record unavailable', locationName: locationId ? locations.get(locationId)?.name : undefined }];
  });
}

function directoryMaps(patients: JsonObject[], practitioners: JsonObject[], locationResources: JsonObject[]) {
  const patientMap = new Map<string, SchedulingPatient>();
  for (const resource of patients) {
    const id = text(resource.id);
    if (!id) continue;
    const identifiers = array(resource.identifier).map(object).filter((identifier): identifier is JsonObject => Boolean(identifier));
    patientMap.set(id, { id, name: resourceDisplay(resource) || 'Patient name unavailable', mrn: identifiers.map((identifier) => text(identifier.value)).find(Boolean), birthDate: text(resource.birthDate) });
  }
  const providerMap = new Map<string, SchedulingProvider>();
  for (const resource of practitioners) {
    const id = text(resource.id);
    if (!id) continue;
    const qualification = firstObject(resource.qualification);
    const qualificationCode = firstObject(qualification?.code);
    const qualificationCoding = firstObject(qualificationCode?.coding);
    providerMap.set(id, { id, name: resourceDisplay(resource) || 'Provider name unavailable', specialty: text(qualificationCode?.text) || text(qualificationCoding?.display) });
  }
  const locationMap = new Map<string, SchedulingLocation>();
  for (const resource of locationResources) {
    const id = text(resource.id);
    if (!id) continue;
    const name = resourceDisplay(resource);
    if (name) locationMap.set(id, { id, name });
  }
  return { patientMap, providerMap, locationMap };
}

function source(state: SchedulingSource['state'], sourceName: string, error?: unknown): SchedulingSource {
  return { state, source: sourceName, ...(error ? { error: error instanceof Error ? error.message : 'Source unavailable.' } : {}) };
}

export async function getSchedulingSnapshot(query = ''): Promise<SchedulingSnapshot> {
  const base = schedulingFhirBase();
  const results = await Promise.allSettled([
    fetchBundle(base, 'Appointment'),
    fetchBundle(base, 'Slot'),
    fetchBundle(base, 'Patient'),
    fetchBundle(base, 'Practitioner'),
    fetchBundle(base, 'Location'),
    fetchBundle(base, 'Schedule'),
  ]);
  const [appointmentResult, slotResult, patientResult, practitionerResult, locationResult, scheduleResult] = results;
  const directoryReady = patientResult.status === 'fulfilled' && practitionerResult.status === 'fulfilled' && locationResult.status === 'fulfilled';
  const directory = directoryMaps(patientResult.status === 'fulfilled' ? bundleEntries(patientResult.value, 'Patient') : [], practitionerResult.status === 'fulfilled' ? bundleEntries(practitionerResult.value, 'Practitioner') : [], locationResult.status === 'fulfilled' ? bundleEntries(locationResult.value, 'Location') : []);
  const appointments = appointmentResult.status === 'fulfilled' ? appointmentList(bundleEntries(appointmentResult.value, 'Appointment'), directory.patientMap, directory.providerMap, directory.locationMap) : [];
  const schedules = scheduleResult.status === 'fulfilled' ? scheduleMaps(bundleEntries(scheduleResult.value, 'Schedule')) : new Map<string, { practitionerId?: string; locationId?: string }>();
  const slots = slotResult.status === 'fulfilled' ? slotList(bundleEntries(slotResult.value, 'Slot'), directory.providerMap, directory.locationMap, schedules) : [];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredAppointments = normalizedQuery ? appointments.filter((appointment) => [appointment.patientName, appointment.patientMrn, appointment.providerName, appointment.appointmentType, appointment.serviceType, appointment.description].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery)) : appointments;
  const providers = [...new Map([...directory.providerMap.values()].map((provider) => [provider.name, provider])).values()];
  const locations = [...new Map([...directory.locationMap.values()].map((location) => [location.name, location])).values()];
  return { generatedAt: new Date().toISOString(), timeZone: process.env.DOCTOR_VIEW_TIME_ZONE || 'America/Toronto', appointments: filteredAppointments, slots, patients: [...directory.patientMap.values()], providers, locations, sources: { appointments: appointmentResult.status === 'fulfilled' ? source('ready', 'FHIR R4 Appointment') : source('unavailable', 'FHIR R4 Appointment', appointmentResult.reason), slots: slotResult.status === 'fulfilled' ? source('ready', 'FHIR R4 Slot') : source('unavailable', 'FHIR R4 Slot', slotResult.reason), directory: directoryReady ? source('ready', 'FHIR R4 scheduling directory') : source('partial', 'FHIR R4 scheduling directory', 'Patient, provider, or location directory is incomplete.') } };
}

export async function getSchedulingPatientDirectory(): Promise<SchedulingDirectorySnapshot> {
  try {
    const bundle = await fetchBundle(schedulingFhirBase(), 'Patient');
    const patients = [...directoryMaps(bundleEntries(bundle, 'Patient'), [], []).patientMap.values()];
    return { patients, source: source('ready', 'FHIR R4 Patient directory') };
  } catch (error) {
    return { patients: [], source: source('unavailable', 'FHIR R4 Patient directory', error) };
  }
}
