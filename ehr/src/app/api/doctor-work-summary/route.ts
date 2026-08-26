import { NextResponse } from 'next/server';
import { getDoctorWorkSnapshot } from '@/lib/doctorWorkStore';
import { resolveDoctorWorkspaceActor } from '@/lib/doctorWorkspaceAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await resolveDoctorWorkspaceActor(request);
  if (access.response) return access.response;
  const actor = access.actor!;
  const snapshot = await getDoctorWorkSnapshot(actor.id, actor.name, actor.role);
  return NextResponse.json({ actor: snapshot.actor, generatedAt: snapshot.generatedAt, counts: snapshot.counts, messages: snapshot.messages.counts, documents: snapshot.documents.counts }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
