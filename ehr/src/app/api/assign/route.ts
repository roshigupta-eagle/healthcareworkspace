import { NextResponse } from 'next/server';
import { mockVisits, mockQueueItems } from '@/cardiology/services/api.mock';
import { QueueName, QueueItemStatus, CardiovascularVisitState } from '@/cardiology/types/fhir-domain';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      doctorId,
      doctorName,
      patientId,
      patientName,
      assignedBy,
      symptoms,
      diagnosis,
      nextSteps,
      recommendedProcedure,
    } = body;

    let visit = mockVisits.find((v) => v.patientId === patientId || v.patientName === patientName);
    if (!visit) {
      // Create a lightweight visit record for ad-hoc assignments (dev-only)
      visit = {
        id: `visit-${Date.now()}`,
        tenantId: 'default',
        patientId: patientId || `patient-${Date.now()}`,
        patientName: patientName || 'Unknown',
        patientDOB: '',
        mrn: `mrn-${Date.now()}`,
        chiefComplaint: diagnosis || 'Assigned by admin',
        currentState: CardiovascularVisitState.PHYSICIAN_PENDING,
        priority: 50,
        currentRoomId: undefined,
        arrivedAt: new Date().toISOString(),
        stateEnteredAt: new Date().toISOString(),
        isNewPatient: true,
      } as any;
      mockVisits.unshift(visit as any);
    }

    if (!visit) {
      return NextResponse.json({ error: 'Failed to create or find visit' }, { status: 500 });
    }

    visit.assignedPhysicianId = doctorId;
    visit.assignedPhysicianName = doctorName;
    visit.previousState = visit.currentState;
    visit.currentState = CardiovascularVisitState.PHYSICIAN_PENDING;

    visit.carePlan = visit.carePlan || {};
    if (symptoms) visit.carePlan.symptoms = Array.isArray(symptoms) ? symptoms : [String(symptoms)];
    if (diagnosis) visit.carePlan.diagnosis = diagnosis;
    if (nextSteps) visit.carePlan.nextSteps = nextSteps;
    if (recommendedProcedure) visit.carePlan.recommendedProcedure = recommendedProcedure;

    const queueItem = {
      id: `queue-item-${Date.now()}`,
      queueName: QueueName.PHYSICIAN_CONSULT,
      visitId: visit.id,
      patientName: visit.patientName,
      priority: visit.priority,
      status: QueueItemStatus.PENDING,
      createdAt: new Date().toISOString(),
      estimatedDurationMinutes: 15,
      assignedTo: doctorId,
    };

    // Add to queue so doctors polling the dashboard will see it
    mockQueueItems.unshift(queueItem as any);

    return NextResponse.json({ ok: true, visit, queueItem });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('assign error', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
