import { NextResponse } from 'next/server';
import { getSchedulingSnapshot } from '@/lib/schedulingData';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export async function GET(req: Request) {
  const access = await resolveDoctorWorkspaceActor(req);
  if (access.response) return access.response;
  try {
    const url = new URL(req.url);
    const q = url.searchParams;
    const snapshot = await getSchedulingSnapshot();
    const practitionerId = q.get('practitionerId');
    const locationId = q.get('locationId');
    const serviceType = q.get('serviceType');
    const from = q.get('from');
    const to = q.get('to');
    const slots = snapshot.slots.filter((slot) => slot.status === 'free' && (!practitionerId || slot.practitionerId === practitionerId) && (!locationId || slot.locationId === locationId) && (!serviceType || slot.serviceType === serviceType) && (!from || new Date(slot.end) >= new Date(from)) && (!to || new Date(slot.start) <= new Date(to)));
    return NextResponse.json(slots);
  } catch {
    return NextResponse.json({ error: 'failed to find slots' }, { status: 500 });
  }
}
