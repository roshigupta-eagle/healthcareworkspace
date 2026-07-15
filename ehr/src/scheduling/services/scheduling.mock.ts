import type {
  FHIRAppointment,
  FHIRSlot,
  BookingRequest,
  BookingResponse,
  AvailabilityFilter,
} from '@/scheduling/types/fhir-scheduling';

function delay(ms = 180) {
  return new Promise((r) => setTimeout(r, ms));
}

function genId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// Lightweight in-memory mock — replace with real FHIR store in production
const mockSlots: FHIRSlot[] = [];
const mockAppointments: FHIRAppointment[] = [];

// Create a small set of providers and locations for demo
const providers = [
  { id: 'practitioner-chen', name: 'Dr. Alice Chen' },
  { id: 'practitioner-lee', name: 'Dr. James Lee' },
];
const locations = [
  { id: 'location-1', name: 'Cardiology Clinic - Main' },
  { id: 'location-2', name: 'Outpatient Lab' },
];

// Seed slots dynamically (next 7 days, hours 9..16, 30m slots)
(function seedSlots() {
  const startDate = new Date();
  for (let d = 0; d < 7; d++) {
    for (const p of providers) {
      for (let hour = 9; hour < 17; hour++) {
        const base = new Date(startDate);
        base.setHours(hour, 0, 0, 0);
        base.setDate(base.getDate() + d);
        const slot: FHIRSlot = {
          id: genId('slot'),
          start: new Date(base).toISOString(),
          end: new Date(base.getTime() + 30 * 60 * 1000).toISOString(),
          status: 'free',
          practitionerId: p.id,
          locationId: locations[Math.abs(p.id.charCodeAt(0)) % locations.length].id,
          serviceType: 'cardiology-consult',
          specialty: 'cardiology',
          capacity: 1,
          allowOverbook: false,
        };
        mockSlots.push(slot);
      }
    }
  }
})();

// Seed a couple of booked appointments
(function seedAppointments() {
  if (mockSlots.length > 5) {
    const s1 = mockSlots[2];
    const ap1: FHIRAppointment = {
      id: genId('appt'),
      status: 'booked',
      start: s1.start,
      end: s1.end,
      participants: [
        { actorId: 'patient-001', display: 'John Smith', type: 'patient' },
        { actorId: s1.practitionerId, display: 'Dr. Alice Chen', type: 'practitioner' },
      ],
      appointmentType: 'Consultation',
      serviceType: 'cardiology-consult',
      description: 'Booked via mock system',
      created: new Date().toISOString(),
      slotIds: [s1.id],
    };
    mockAppointments.push(ap1);
    s1.status = 'busy';

    const s2 = mockSlots[10];
    const ap2: FHIRAppointment = {
      id: genId('appt'),
      status: 'booked',
      start: s2.start,
      end: s2.end,
      participants: [
        { actorId: 'patient-002', display: 'Mary Johnson', type: 'patient' },
        { actorId: s2.practitionerId, display: 'Dr. James Lee', type: 'practitioner' },
      ],
      appointmentType: 'Follow-up',
      serviceType: 'cardiology-consult',
      description: 'Follow-up appointment',
      created: new Date().toISOString(),
      slotIds: [s2.id],
    };
    mockAppointments.push(ap2);
    s2.status = 'busy';
  }
})();

export async function fetchSlots(): Promise<FHIRSlot[]> {
  await delay(150);
  return mockSlots;
}

export async function fetchAppointments(): Promise<FHIRAppointment[]> {
  await delay(150);
  return mockAppointments;
}

export async function findAvailableSlots(filter: AvailabilityFilter = {}): Promise<FHIRSlot[]> {
  await delay(120);
  return mockSlots.filter((s) => {
    if (s.status !== 'free') return false;
    if (filter.practitionerId && s.practitionerId !== filter.practitionerId) return false;
    if (filter.locationId && s.locationId !== filter.locationId) return false;
    if (filter.serviceType && s.serviceType !== filter.serviceType) return false;
    if (filter.from && new Date(s.end) < new Date(filter.from)) return false;
    if (filter.to && new Date(s.start) > new Date(filter.to)) return false;
    return true;
  });
}

export async function bookAppointment(req: BookingRequest): Promise<BookingResponse> {
  await delay(200);
  // If slotId given, try to book that slot
  if (req.slotId) {
    const slot = mockSlots.find((s) => s.id === req.slotId);
    if (!slot) return { success: false, message: 'Slot not found' };
    if (slot.status !== 'free' && !slot.allowOverbook) return { success: false, message: 'Slot not available' };

    const appt: FHIRAppointment = {
      id: genId('appt'),
      status: 'booked',
      start: slot.start,
      end: slot.end,
      participants: [
        { actorId: req.patient.id, display: req.patient.name, type: 'patient' },
        { actorId: slot.practitionerId, display: providers.find(p => p.id === slot.practitionerId)?.name || slot.practitionerId, type: 'practitioner' },
      ].concat(req.participants || []),
      appointmentType: req.appointmentType || 'Consultation',
      serviceType: req.serviceType || slot.serviceType,
      description: req.patient.name ? `Booked for ${req.patient.name}` : 'Booked slot',
      created: new Date().toISOString(),
      slotIds: [slot.id],
    };

    mockAppointments.push(appt);
    // mark slot busy
    slot.status = 'busy';

    return { success: true, appointment: appt };
  }

  // If no slotId, attempt to find a free slot matching start/end
  const candidate = mockSlots.find((s) => s.status === 'free' && s.start === req.start && s.end === req.end);
  if (candidate) {
    const res = await bookAppointment({ ...req, slotId: candidate.id });
    return res;
  }

  return { success: false, message: 'No matching slot available' };
}

export async function cancelAppointment(appointmentId: string): Promise<boolean> {
  await delay(120);
  const ap = mockAppointments.find((a) => a.id === appointmentId);
  if (!ap) return false;
  ap.status = 'cancelled';
  // free slots referenced by this appt
  if (ap.slotIds && ap.slotIds.length) {
    for (const sid of ap.slotIds) {
      const s = mockSlots.find((ss) => ss.id === sid);
      if (s) s.status = 'free';
    }
  }
  return true;
}

export async function rescheduleAppointment(appointmentId: string, newSlotId: string): Promise<BookingResponse> {
  await delay(200);
  const ap = mockAppointments.find((a) => a.id === appointmentId);
  if (!ap) return { success: false, message: 'Appointment not found' };

  const newSlot = mockSlots.find((s) => s.id === newSlotId);
  if (!newSlot) return { success: false, message: 'New slot not found' };
  if (newSlot.status !== 'free' && !newSlot.allowOverbook) return { success: false, message: 'New slot not available' };

  // free old slots
  if (ap.slotIds) {
    for (const sid of ap.slotIds) {
      const os = mockSlots.find((ss) => ss.id === sid);
      if (os) os.status = 'free';
    }
  }

  // assign new slot
  newSlot.status = 'busy';
  ap.slotIds = [newSlot.id];
  ap.start = newSlot.start;
  ap.end = newSlot.end;
  ap.status = 'booked';
  ap.updatedAt = new Date().toISOString();

  return { success: true, appointment: ap } as BookingResponse;
}

export { mockSlots, mockAppointments, providers, locations };
